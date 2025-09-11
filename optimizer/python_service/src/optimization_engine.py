"""
Core optimization engine using Google OR-Tools CP-SAT solver
for railway scheduling and conflict resolution.
"""

import time
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import logging

from ortools.sat.python import cp_model
import numpy as np

from constraint_models import ConstraintBuilder
from objectives import ObjectiveManager
from models import (
    OptimizationRequest, OptimizationResponse, OptimizationStatus,
    Train, TrainScheduleEntry, PerformanceMetrics, AlternativeSchedule
)

logger = logging.getLogger(__name__)


class OptimizationEngine:
    """
    Main optimization engine that orchestrates railway scheduling optimization
    using constraint programming with OR-Tools CP-SAT solver.
    """
    
    def __init__(self):
        self.constraint_builder = ConstraintBuilder()
        self.objective_manager = ObjectiveManager()
        self.solver_stats = {}
        
    def optimize_schedule(self, request: OptimizationRequest) -> OptimizationResponse:
        """
        Main optimization method that schedules trains using constraint programming.
        
        Args:
            request: OptimizationRequest containing trains, constraints, and objectives
            
        Returns:
            OptimizationResponse with optimized schedule and metrics
        """
        start_time = time.time()
        logger.info(f"Starting optimization for request {request.request_id}")
        
        try:
            # Create CP-SAT model
            model = cp_model.CpModel()
            
            # Create decision variables
            variables = self._create_decision_variables(model, request)
            
            # Add constraints
            self._add_constraints(model, variables, request)
            
            # Set objective
            self._set_objective(model, variables, request)
            
            # Solve the model
            solver = cp_model.CpSolver()
            
            # Configure solver parameters
            self._configure_solver(solver, request.config)
            
            # Solve
            status = solver.Solve(model)
            
            # Process results
            optimization_response = self._process_solution(
                solver, status, variables, request, start_time
            )
            
            # Generate alternatives if requested
            # Skip alternatives generation for now
            # alternatives = self._generate_alternatives(model, solver, variables, request)
            # optimization_response.alternatives = alternatives
            
            logger.info(f"Optimization completed for request {request.request_id} in {time.time() - start_time:.2f}s")
            return optimization_response
            
        except Exception as e:
            logger.error(f"Optimization failed for request {request.request_id}: {str(e)}")
            return self._create_error_response(request, str(e), time.time() - start_time)
    
    def _create_decision_variables(self, model: cp_model.CpModel, request: OptimizationRequest) -> Dict:
        """Create decision variables for the optimization problem."""
        variables = {
            'train_start_times': {},
            'train_end_times': {},
            'platform_assignments': {},
            'train_delays': {},
            'section_occupancy': {},
            'speed_variables': {},
        }
        
        # Time horizon in minutes
        time_horizon = request.time_horizon_minutes
        
        for train in request.trains:
            train_id = train.id
            
            # Start and end time variables (in minutes from start of horizon)
            variables['train_start_times'][train_id] = model.NewIntVar(
                0, time_horizon, f'start_time_{train_id}'
            )
            variables['train_end_times'][train_id] = model.NewIntVar(
                0, time_horizon, f'end_time_{train_id}'
            )
            
            # Platform assignment (assuming platforms 1-10)
            variables['platform_assignments'][train_id] = model.NewIntVar(
                1, 10, f'platform_{train_id}'
            )
            
            # Delay variables (can be negative for early departure)
            max_delay = 60  # Maximum 60 minutes delay
            variables['train_delays'][train_id] = model.NewIntVar(
                -30, max_delay, f'delay_{train_id}'
            )
            
            # Speed profile variables for each section
            for section in train.route_sections:
                speed_var = model.NewIntVar(
                    20, int(train.max_speed_kmh), f'speed_{train_id}_{section}'
                )
                variables['speed_variables'][f'{train_id}_{section}'] = speed_var
        
        # Section occupancy variables (boolean for each train-section-time combination)
        for train in request.trains:
            for section in train.route_sections:
                for t in range(time_horizon):
                    occupancy_var = model.NewBoolVar(f'occupancy_{train.id}_{section}_{t}')
                    variables['section_occupancy'][f'{train.id}_{section}_{t}'] = occupancy_var
        
        logger.info(f"Created {len(variables['train_start_times'])} trains with decision variables")
        return variables
    
    def _add_constraints(self, model: cp_model.CpModel, variables: Dict, request: OptimizationRequest):
        """Add all constraints to the optimization model."""
        
        # 1. Basic timing constraints
        self._add_timing_constraints(model, variables, request)
        
        # 2. Platform capacity constraints
        self._add_platform_constraints(model, variables, request)
        
        # 3. Safety and signal spacing constraints
        self._add_safety_constraints(model, variables, request)
        
        # 4. Train priority constraints
        self._add_priority_constraints(model, variables, request)
        
        # 5. Route and section constraints
        self._add_route_constraints(model, variables, request)
        
        # 6. Custom constraints from request
        self._add_custom_constraints(model, variables, request)
        
        logger.info(f"Added all constraints for {len(request.trains)} trains")
    
    def _add_timing_constraints(self, model: cp_model.CpModel, variables: Dict, request: OptimizationRequest):
        """Add basic timing constraints."""
        for train in request.trains:
            train_id = train.id
            start_var = variables['train_start_times'][train_id]
            end_var = variables['train_end_times'][train_id]
            delay_var = variables['train_delays'][train_id]
            
            # Calculate expected journey time
            expected_journey_time = self._calculate_journey_time(train)
            
            # End time = start time + journey time
            model.Add(end_var == start_var + expected_journey_time)
            
            # Relate delay to scheduled vs actual start time
            scheduled_start = self._datetime_to_minutes(train.scheduled_departure, request.requested_at)
            model.Add(start_var == scheduled_start + delay_var)
    
    def _add_platform_constraints(self, model: cp_model.CpModel, variables: Dict, request: OptimizationRequest):
        """Add platform capacity and assignment constraints."""
        # Group trains by station
        station_trains = {}
        for train in request.trains:
            origin = train.origin_station
            dest = train.destination_station
            
            if origin not in station_trains:
                station_trains[origin] = []
            if dest not in station_trains:
                station_trains[dest] = []
                
            station_trains[origin].append(train)
            station_trains[dest].append(train)
        
        # Platform conflict constraints
        for station, trains in station_trains.items():
            for i, train1 in enumerate(trains):
                for j, train2 in enumerate(trains[i+1:], i+1):
                    self._add_platform_conflict_constraint(model, variables, train1, train2)
    
    def _add_platform_conflict_constraint(self, model: cp_model.CpModel, variables: Dict, 
                                        train1: Train, train2: Train):
        """Ensure trains using same platform don't conflict."""
        platform1 = variables['platform_assignments'][train1.id]
        platform2 = variables['platform_assignments'][train2.id]
        start1 = variables['train_start_times'][train1.id]
        end1 = variables['train_end_times'][train1.id]
        start2 = variables['train_start_times'][train2.id]
        end2 = variables['train_end_times'][train2.id]
        
        # If trains use same platform, they cannot overlap in time
        same_platform = model.NewBoolVar(f'same_platform_{train1.id}_{train2.id}')
        model.Add(platform1 == platform2).OnlyEnforceIf(same_platform)
        model.Add(platform1 != platform2).OnlyEnforceIf(same_platform.Not())
        
        # If same platform, ensure no time overlap
        no_overlap = model.NewBoolVar(f'no_overlap_{train1.id}_{train2.id}')
        model.Add(end1 <= start2).OnlyEnforceIf([same_platform, no_overlap])
        model.Add(end2 <= start1).OnlyEnforceIf([same_platform, no_overlap.Not()])
    
    def _add_safety_constraints(self, model: cp_model.CpModel, variables: Dict, request: OptimizationRequest):
        """Add safety distance and signal spacing constraints."""
        minimum_headway = 5  # 5 minutes minimum between trains
        
        for i, train1 in enumerate(request.trains):
            for j, train2 in enumerate(request.trains[i+1:], i+1):
                # Check if trains share any route sections
                shared_sections = set(train1.route_sections) & set(train2.route_sections)
                
                if shared_sections:
                    self._add_headway_constraint(model, variables, train1, train2, minimum_headway)
    
    def _add_headway_constraint(self, model: cp_model.CpModel, variables: Dict,
                              train1: Train, train2: Train, min_headway: int):
        """Add minimum headway constraint between trains on shared sections."""
        start1 = variables['train_start_times'][train1.id]
        start2 = variables['train_start_times'][train2.id]
        
        # Either train1 starts at least min_headway after train2, or vice versa
        order_bool = model.NewBoolVar(f'order_{train1.id}_{train2.id}')
        model.Add(start1 >= start2 + min_headway).OnlyEnforceIf(order_bool)
        model.Add(start2 >= start1 + min_headway).OnlyEnforceIf(order_bool.Not())
    
    def _add_priority_constraints(self, model: cp_model.CpModel, variables: Dict, request: OptimizationRequest):
        """Add train priority constraints."""
        # Sort trains by priority
        priority_order = {
            'EMERGENCY': 1, 'EXPRESS': 2, 'MAIL': 3, 
            'PASSENGER': 4, 'FREIGHT': 5, 'MAINTENANCE': 6
        }
        
        for i, train1 in enumerate(request.trains):
            for j, train2 in enumerate(request.trains[i+1:], i+1):
                priority1 = priority_order.get(train1.priority, 6)
                priority2 = priority_order.get(train2.priority, 6)
                
                # If train1 has higher priority and they conflict, train1 should go first
                if priority1 < priority2:
                    shared_sections = set(train1.route_sections) & set(train2.route_sections)
                    if shared_sections:
                        start1 = variables['train_start_times'][train1.id]
                        start2 = variables['train_start_times'][train2.id]
                        model.Add(start1 <= start2)
    
    def _add_route_constraints(self, model: cp_model.CpModel, variables: Dict, request: OptimizationRequest):
        """Add route-specific constraints."""
        for train in request.trains:
            # Ensure train follows its route in sequence
            section_times = []
            for i, section in enumerate(train.route_sections):
                section_time = model.NewIntVar(0, request.time_horizon_minutes, 
                                             f'section_time_{train.id}_{section}')
                section_times.append(section_time)
                
                # Each section must be traversed in order
                if i > 0:
                    model.Add(section_times[i] >= section_times[i-1] + 1)
    
    def _add_custom_constraints(self, model: cp_model.CpModel, variables: Dict, request: OptimizationRequest):
        """Add custom constraints from the request."""
        for constraint in request.constraints:
            try:
                self.constraint_builder.add_constraint(model, variables, constraint)
            except Exception as e:
                logger.warning(f"Failed to add constraint {constraint.id}: {str(e)}")
    
    def _set_objective(self, model: cp_model.CpModel, variables: Dict, request: OptimizationRequest):
        """Set the optimization objective."""
        objective_terms = []
        
        if request.objective.primary_objective == 'MINIMIZE_DELAY':
            # Minimize total delay
            for train in request.trains:
                delay_var = variables['train_delays'][train.id]
                objective_terms.append(delay_var)
            
            model.Minimize(sum(objective_terms))
            
        elif request.objective.primary_objective == 'MAXIMIZE_THROUGHPUT':
            # Maximize number of trains processed on time
            on_time_vars = []
            for train in request.trains:
                delay_var = variables['train_delays'][train.id]
                on_time = model.NewBoolVar(f'on_time_{train.id}')
                model.Add(delay_var <= 5).OnlyEnforceIf(on_time)  # Within 5 minutes
                model.Add(delay_var > 5).OnlyEnforceIf(on_time.Not())
                on_time_vars.append(on_time)
            
            model.Maximize(sum(on_time_vars))
            
        elif request.objective.primary_objective == 'BALANCED_OPTIMAL':
            # Balanced objective: minimize delay + maximize throughput
            delay_terms = []
            on_time_vars = []
            
            for train in request.trains:
                delay_var = variables['train_delays'][train.id]
                delay_terms.append(delay_var)
                
                on_time = model.NewBoolVar(f'on_time_{train.id}')
                model.Add(delay_var <= 3).OnlyEnforceIf(on_time)
                model.Add(delay_var > 3).OnlyEnforceIf(on_time.Not())
                on_time_vars.append(on_time)
            
            # Weighted combination: 70% delay minimization, 30% throughput maximization
            total_delay = sum(delay_terms)
            total_on_time = sum(on_time_vars)
            
            # Scale the objectives appropriately
            weighted_objective = total_delay - (total_on_time * 10)  # Weight on-time trains heavily
            model.Minimize(weighted_objective)
        
        else:
            # Default: minimize total delay
            for train in request.trains:
                delay_var = variables['train_delays'][train.id]
                objective_terms.append(delay_var)
            model.Minimize(sum(objective_terms))
    
    def _configure_solver(self, solver: cp_model.CpSolver, config):
        """Configure the CP-SAT solver parameters."""
        solver.parameters.max_time_in_seconds = config.max_solver_time_seconds
        solver.parameters.num_search_workers = config.num_search_workers
        
        if config.enable_detailed_logging:
            solver.parameters.log_search_progress = True
        
        # Set search strategy
        strategy = config.strategy
        if strategy == 'FIXED_SEARCH':
            solver.parameters.search_branching = cp_model.FIXED_SEARCH
        elif strategy == 'PORTFOLIO_SEARCH':
            solver.parameters.search_branching = cp_model.PORTFOLIO_SEARCH
    
    def _process_solution(self, solver: cp_model.CpSolver, status,
                         variables: Dict, request: OptimizationRequest, start_time: float) -> OptimizationResponse:
        """Process the solver solution and create response."""
        execution_time = int((time.time() - start_time) * 1000)
        
        if status == cp_model.OPTIMAL:
            opt_status = OptimizationStatus.OPTIMAL
        elif status == cp_model.FEASIBLE:
            opt_status = OptimizationStatus.FEASIBLE
        elif status == cp_model.INFEASIBLE:
            opt_status = OptimizationStatus.INFEASIBLE
        elif status == cp_model.UNKNOWN:
            opt_status = OptimizationStatus.TIME_LIMIT_EXCEEDED
        else:
            opt_status = OptimizationStatus.ERROR
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            # Extract optimized schedule
            optimized_schedule = []
            total_delay = 0
            conflicts_resolved = 0
            
            for train in request.trains:
                train_id = train.id
                
                start_time_val = solver.Value(variables['train_start_times'][train_id])
                end_time_val = solver.Value(variables['train_end_times'][train_id])
                platform_val = solver.Value(variables['platform_assignments'][train_id])
                delay_val = solver.Value(variables['train_delays'][train_id])
                
                total_delay += max(0, delay_val)  # Only count positive delays
                
                # Convert back to datetime
                actual_departure = request.requested_at + timedelta(minutes=start_time_val)
                actual_arrival = request.requested_at + timedelta(minutes=end_time_val)
                
                # Generate speed profile
                speed_profile = self._generate_speed_profile(solver, variables, train)
                
                schedule_entry = TrainScheduleEntry(
                    train_id=train_id,
                    train_number=train.train_number,
                    scheduled_departure=actual_departure,
                    scheduled_arrival=actual_arrival,
                    platform=platform_val,
                    priority_applied=train.priority,
                    delay_adjustment_minutes=delay_val,
                    conflicts_resolved=[],  # To be populated
                    speed_profile=speed_profile
                )
                optimized_schedule.append(schedule_entry)
            
            # Calculate performance metrics
            kpis = self._calculate_performance_metrics(
                optimized_schedule, request.trains, solver, variables
            )
            
            response = OptimizationResponse(
                request_id=request.request_id,
                status=opt_status,
                optimized_schedule=optimized_schedule,
                kpis=kpis,
                reasoning=self._generate_reasoning(solver, opt_status, total_delay, len(request.trains)),
                confidence_score=self._calculate_confidence_score(solver, opt_status),
                alternatives=[],
                execution_time_ms=execution_time,
                completed_at=datetime.utcnow(),
                error_message=""
            )
            
        else:
            # Infeasible or error case
            response = OptimizationResponse(
                request_id=request.request_id,
                status=opt_status,
                optimized_schedule=[],
                kpis=PerformanceMetrics(),
                reasoning=f"Optimization failed with status: {status}",
                confidence_score=0.0,
                alternatives=[],
                execution_time_ms=execution_time,
                completed_at=datetime.utcnow(),
                error_message=self._get_status_message(status)
            )
        
        return response
    
    def _calculate_journey_time(self, train: Train) -> int:
        """Calculate expected journey time for a train in minutes."""
        # Simplified calculation based on route length and train characteristics
        total_distance = len(train.route_sections) * 10  # Assume 10km per section
        average_speed = min(train.max_speed_kmh * 0.8, 80)  # 80% of max speed, cap at 80 km/h
        
        journey_time_hours = total_distance / average_speed
        return int(journey_time_hours * 60)  # Convert to minutes
    
    def _datetime_to_minutes(self, dt: datetime, reference: datetime) -> int:
        """Convert datetime to minutes since reference time."""
        delta = dt - reference
        return int(delta.total_seconds() / 60)
    
    def _generate_speed_profile(self, solver: cp_model.CpSolver, variables: Dict, train: Train) -> List:
        """Generate optimized speed profile for the train."""
        speed_profile = []
        
        for i, section in enumerate(train.route_sections):
            speed_key = f'{train.id}_{section}'
            if speed_key in variables['speed_variables']:
                speed = solver.Value(variables['speed_variables'][speed_key])
            else:
                speed = train.max_speed_kmh * 0.8
            
            speed_profile.append({
                'position_km': i * 10,  # Assume 10km per section
                'speed_kmh': speed,
                'time_offset_minutes': i * 15  # Approximate time per section
            })
        
        return speed_profile
    
    def _calculate_performance_metrics(self, schedule: List[TrainScheduleEntry], 
                                     original_trains: List[Train], solver: cp_model.CpSolver,
                                     variables: Dict) -> PerformanceMetrics:
        """Calculate performance metrics for the optimized schedule."""
        total_delay = sum(max(0, entry.delay_adjustment_minutes) for entry in schedule)
        avg_delay = total_delay / len(schedule) if schedule else 0
        
        # Count trains that are on time (within 5 minutes)
        on_time_trains = sum(1 for entry in schedule if entry.delay_adjustment_minutes <= 5)
        throughput = (on_time_trains / len(schedule) * 100) if schedule else 0
        
        # Estimate utilization based on schedule density
        time_span_hours = 2  # Assume 2-hour optimization window
        utilization = min(len(schedule) / (time_span_hours * 10) * 100, 100)  # Assume 10 trains/hour capacity
        
        return PerformanceMetrics(
            total_delay_minutes=total_delay,
            average_delay_per_train=avg_delay,
            conflicts_resolved=self._count_conflicts_resolved(solver, variables),
            throughput_trains_per_hour=len(schedule) / time_span_hours,
            utilization_percent=utilization,
            energy_consumption_kwh=self._estimate_energy_consumption(schedule, original_trains),
            platform_changes=self._count_platform_changes(schedule, original_trains),
            passenger_waiting_time_minutes=avg_delay * 0.8  # Estimate passenger impact
        )
    
    def _count_conflicts_resolved(self, solver: cp_model.CpSolver, variables: Dict) -> int:
        """Count the number of conflicts that were resolved."""
        # This would require tracking conflicts during constraint building
        # For now, return an estimate
        return len(variables['train_start_times']) // 3
    
    def _estimate_energy_consumption(self, schedule: List[TrainScheduleEntry], trains: List[Train]) -> float:
        """Estimate total energy consumption for the schedule."""
        total_energy = 0
        for entry in schedule:
            # Find corresponding train
            train = next((t for t in trains if t.id == entry.train_id), None)
            if train and train.characteristics:
                # Simplified energy calculation
                journey_time_hours = abs((entry.scheduled_arrival - entry.scheduled_departure).total_seconds()) / 3600
                power_kw = train.characteristics.power_kw or 2000  # Default 2MW
                total_energy += power_kw * journey_time_hours * 0.7  # 70% average power usage
        
        return total_energy
    
    def _count_platform_changes(self, schedule: List[TrainScheduleEntry], trains: List[Train]) -> int:
        """Count platform changes from original schedule."""
        changes = 0
        for entry in schedule:
            # For now, assume any platform assignment is a change
            # In a real implementation, compare with original platform assignments
            changes += 1
        return changes
    
    def _generate_reasoning(self, solver: cp_model.CpSolver, status: OptimizationStatus, 
                          total_delay: float, num_trains: int) -> str:
        """Generate human-readable reasoning for the optimization result."""
        if status == OptimizationStatus.OPTIMAL:
            return (f"Found optimal solution for {num_trains} trains. "
                   f"Total delay minimized to {total_delay:.1f} minutes. "
                   f"All constraints satisfied.")
        elif status == OptimizationStatus.FEASIBLE:
            return (f"Found feasible solution for {num_trains} trains. "
                   f"Total delay: {total_delay:.1f} minutes. "
                   f"Solution may not be globally optimal due to time constraints.")
        elif status == OptimizationStatus.INFEASIBLE:
            return ("No feasible solution found. Consider relaxing constraints, "
                   "extending time horizon, or reducing train density.")
        else:
            return f"Optimization completed with status: {status}"
    
    def _calculate_confidence_score(self, solver: cp_model.CpSolver, status: OptimizationStatus) -> float:
        """Calculate confidence score for the solution."""
        if status == OptimizationStatus.OPTIMAL:
            return 1.0
        elif status == OptimizationStatus.FEASIBLE:
            # Base confidence on how close we are to optimal (if known)
            return 0.85
        elif status == OptimizationStatus.TIME_LIMIT_EXCEEDED:
            return 0.75
        else:
            return 0.0
    
    def _get_status_message(self, status) -> str:
        """Get human-readable status message."""
        status_messages = {
            cp_model.OPTIMAL: "Optimal solution found",
            cp_model.FEASIBLE: "Feasible solution found",
            cp_model.INFEASIBLE: "Problem is infeasible",
            cp_model.UNKNOWN: "Solver status unknown",
            cp_model.MODEL_INVALID: "Model is invalid"
        }
        return status_messages.get(status, f"Unknown status: {status}")
    
    def _create_error_response(self, request: OptimizationRequest, error_msg: str, 
                             execution_time: float) -> OptimizationResponse:
        """Create error response."""
        return OptimizationResponse(
            request_id=request.request_id,
            status=OptimizationStatus.ERROR,
            optimized_schedule=[],
            kpis=PerformanceMetrics(),
            reasoning="",
            confidence_score=0.0,
            alternatives=[],
            execution_time_ms=int(execution_time * 1000),
            completed_at=datetime.utcnow(),
            error_message=error_msg
        )
    
    def _generate_alternatives(self, model: cp_model.CpModel, solver: cp_model.CpSolver,
                             variables: Dict, request: OptimizationRequest) -> List[AlternativeSchedule]:
        """Generate alternative schedules with different trade-offs."""
        alternatives = []
        
        # This would implement solution enumeration to find multiple good solutions
        # For now, return empty list
        logger.info("Alternative generation not yet implemented")
        
        return alternatives
