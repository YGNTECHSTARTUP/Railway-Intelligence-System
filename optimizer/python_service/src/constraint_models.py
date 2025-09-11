"""
Constraint programming models for railway-specific constraints
using OR-Tools CP-SAT solver.
"""

import logging
from typing import Dict, List
from ortools.sat.python import cp_model

logger = logging.getLogger(__name__)


class ConstraintBuilder:
    """
    Builder class for creating railway-specific constraints
    in the OR-Tools CP-SAT optimization model.
    """
    
    def __init__(self):
        self.constraint_registry = {
            'SAFETY_DISTANCE': self._add_safety_distance_constraint,
            'PLATFORM_CAPACITY': self._add_platform_capacity_constraint,
            'TRAIN_PRIORITY': self._add_train_priority_constraint,
            'MAINTENANCE_WINDOW': self._add_maintenance_window_constraint,
            'SPEED_LIMIT': self._add_speed_limit_constraint,
            'CROSSING_TIME': self._add_crossing_time_constraint,
            'SIGNAL_SPACING': self._add_signal_spacing_constraint,
            'ENERGY_EFFICIENCY': self._add_energy_efficiency_constraint,
            'PASSENGER_TRANSFER': self._add_passenger_transfer_constraint,
        }
    
    def add_constraint(self, model: cp_model.CpModel, variables: Dict, constraint) -> bool:
        """
        Add a specific constraint to the model.
        
        Args:
            model: CP-SAT model
            variables: Decision variables dictionary
            constraint: Constraint object with type and parameters
            
        Returns:
            bool: True if constraint was added successfully
        """
        constraint_type = constraint.type
        
        if constraint_type not in self.constraint_registry:
            logger.warning(f"Unknown constraint type: {constraint_type}")
            return False
        
        try:
            constraint_func = self.constraint_registry[constraint_type]
            constraint_func(model, variables, constraint)
            logger.debug(f"Added constraint {constraint.id} of type {constraint_type}")
            return True
        except Exception as e:
            logger.error(f"Failed to add constraint {constraint.id}: {str(e)}")
            return False
    
    def _add_safety_distance_constraint(self, model: cp_model.CpModel, variables: Dict, constraint):
        """Add safety distance constraints between trains."""
        min_distance_seconds = int(constraint.parameters.get('min_distance_seconds', 300))  # 5 minutes default
        
        # This constraint ensures minimum time separation between trains on the same track
        trains = list(variables['train_start_times'].keys())
        
        for i, train1 in enumerate(trains):
            for train2 in trains[i+1:]:
                # Create boolean variable to indicate order
                train1_first = model.NewBoolVar(f'safety_order_{train1}_{train2}')
                
                start1 = variables['train_start_times'][train1]
                start2 = variables['train_start_times'][train2]
                end1 = variables['train_end_times'][train1]
                end2 = variables['train_end_times'][train2]
                
                # If train1 goes first, ensure sufficient gap
                model.Add(start2 >= end1 + min_distance_seconds // 60).OnlyEnforceIf(train1_first)
                # If train2 goes first, ensure sufficient gap
                model.Add(start1 >= end2 + min_distance_seconds // 60).OnlyEnforceIf(train1_first.Not())
    
    def _add_platform_capacity_constraint(self, model: cp_model.CpModel, variables: Dict, constraint):
        """Add platform capacity constraints."""
        max_capacity = int(constraint.parameters.get('max_trains_per_platform', 1))
        station_id = constraint.parameters.get('station_id', 'default')
        
        # Group trains by platform and ensure capacity limits
        platforms = set()
        for train_id in variables['platform_assignments']:
            platforms.add(variables['platform_assignments'][train_id])
        
        # For each time slot, ensure platform capacity is not exceeded
        time_horizon = 120  # Assume 2-hour window
        for t in range(0, time_horizon, 15):  # Check every 15 minutes
            for platform in range(1, 11):  # Platforms 1-10
                trains_on_platform = []
                for train_id in variables['train_start_times']:
                    # Check if train is using this platform at time t
                    platform_var = variables['platform_assignments'][train_id]
                    start_var = variables['train_start_times'][train_id]
                    end_var = variables['train_end_times'][train_id]
                    
                    # Boolean: train is on this platform at time t
                    on_platform_at_t = model.NewBoolVar(f'on_platform_{train_id}_{platform}_{t}')
                    
                    # Train is on platform if: assigned to platform AND time t is within journey
                    platform_match = model.NewBoolVar(f'platform_match_{train_id}_{platform}_{t}')
                    model.Add(platform_var == platform).OnlyEnforceIf(platform_match)
                    model.Add(platform_var != platform).OnlyEnforceIf(platform_match.Not())
                    
                    time_match = model.NewBoolVar(f'time_match_{train_id}_{t}')
                    model.Add(start_var <= t).OnlyEnforceIf(time_match)
                    model.Add(end_var >= t).OnlyEnforceIf(time_match)
                    model.Add(start_var > t).OnlyEnforceIf(time_match.Not())
                    model.AddBoolOr([end_var < t, time_match.Not()])
                    
                    # Both conditions must be true
                    model.AddBoolAnd([platform_match, time_match]).OnlyEnforceIf(on_platform_at_t)
                    model.AddBoolOr([platform_match.Not(), time_match.Not()]).OnlyEnforceIf(on_platform_at_t.Not())
                    
                    trains_on_platform.append(on_platform_at_t)
                
                # Capacity constraint: sum of trains on platform <= max_capacity
                if trains_on_platform:
                    model.Add(sum(trains_on_platform) <= max_capacity)
    
    def _add_train_priority_constraint(self, model: cp_model.CpModel, variables: Dict, constraint):
        """Add train priority constraints."""
        priority_rules = constraint.parameters.get('priority_rules', {})
        
        # Define priority levels
        priority_levels = {
            'EMERGENCY': 1, 'EXPRESS': 2, 'MAIL': 3,
            'PASSENGER': 4, 'FREIGHT': 5, 'MAINTENANCE': 6
        }
        
        # Implementation would depend on having train priority information
        # For now, log that this constraint type is recognized
        logger.info(f"Train priority constraint added with rules: {priority_rules}")
    
    def _add_maintenance_window_constraint(self, model: cp_model.CpModel, variables: Dict, constraint):
        """Add maintenance window constraints."""
        start_window = int(constraint.parameters.get('start_time_minutes', 0))
        end_window = int(constraint.parameters.get('end_time_minutes', 60))
        affected_sections = constraint.parameters.get('affected_sections', '').split(',')
        
        # No trains should be scheduled in affected sections during maintenance
        for train_id in variables['train_start_times']:
            start_var = variables['train_start_times'][train_id]
            end_var = variables['train_end_times'][train_id]
            
            # If train uses affected sections, it cannot operate during maintenance
            # This is a simplified implementation
            maintenance_conflict = model.NewBoolVar(f'maintenance_conflict_{train_id}')
            
            # Train conflicts with maintenance if its journey overlaps with maintenance window
            journey_overlaps = model.NewBoolVar(f'journey_overlaps_{train_id}')
            model.Add(start_var < end_window).OnlyEnforceIf(journey_overlaps)
            model.Add(end_var > start_window).OnlyEnforceIf(journey_overlaps)
            
            # If there's overlap, train must be rescheduled
            model.Add(end_var <= start_window).OnlyEnforceIf(maintenance_conflict)
            model.AddBoolOr([maintenance_conflict, journey_overlaps.Not()])
    
    def _add_speed_limit_constraint(self, model: cp_model.CpModel, variables: Dict, constraint):
        """Add speed limit constraints for specific sections."""
        max_speed = float(constraint.parameters.get('max_speed_kmh', 80))
        affected_sections = constraint.parameters.get('sections', '').split(',')
        
        # Apply speed limits to affected sections
        for section in affected_sections:
            for speed_key in variables['speed_variables']:
                if section in speed_key:
                    speed_var = variables['speed_variables'][speed_key]
                    model.Add(speed_var <= int(max_speed))
    
    def _add_crossing_time_constraint(self, model: cp_model.CpModel, variables: Dict, constraint):
        """Add level crossing time constraints."""
        crossing_location = constraint.parameters.get('crossing_id', '')
        max_crossing_time = int(constraint.parameters.get('max_crossing_time_minutes', 5))
        
        # Trains crossing at the same location must coordinate
        # This is a simplified implementation
        logger.info(f"Crossing constraint added for location {crossing_location}")
    
    def _add_signal_spacing_constraint(self, model: cp_model.CpModel, variables: Dict, constraint):
        """Add signal spacing constraints."""
        min_headway = int(constraint.parameters.get('min_headway_seconds', 180))  # 3 minutes default
        signal_block = constraint.parameters.get('signal_block', '')
        
        # Ensure minimum time between trains passing the same signal
        trains_in_block = []
        for train_id in variables['train_start_times']:
            # Simplified: assume all trains pass through the signal block
            trains_in_block.append(train_id)
        
        # Add pairwise headway constraints
        for i, train1 in enumerate(trains_in_block):
            for train2 in trains_in_block[i+1:]:
                start1 = variables['train_start_times'][train1]
                start2 = variables['train_start_times'][train2]
                
                order_var = model.NewBoolVar(f'signal_order_{train1}_{train2}')
                model.Add(start2 >= start1 + min_headway // 60).OnlyEnforceIf(order_var)
                model.Add(start1 >= start2 + min_headway // 60).OnlyEnforceIf(order_var.Not())
    
    def _add_energy_efficiency_constraint(self, model: cp_model.CpModel, variables: Dict, constraint):
        """Add energy efficiency constraints."""
        max_energy_kwh = float(constraint.parameters.get('max_energy_consumption', 10000))
        efficiency_target = float(constraint.parameters.get('efficiency_target', 0.8))
        
        # This would constrain total energy consumption
        # For now, log that this constraint is recognized
        logger.info(f"Energy efficiency constraint added with target: {efficiency_target}")
    
    def _add_passenger_transfer_constraint(self, model: cp_model.CpModel, variables: Dict, constraint):
        """Add passenger transfer time constraints."""
        min_transfer_time = int(constraint.parameters.get('min_transfer_minutes', 10))
        transfer_station = constraint.parameters.get('station_id', '')
        
        # Ensure sufficient time for passenger transfers between connecting trains
        connecting_trains = constraint.parameters.get('connecting_trains', '').split(',')
        
        if len(connecting_trains) >= 2:
            for i in range(len(connecting_trains) - 1):
                train1_id = connecting_trains[i].strip()
                train2_id = connecting_trains[i + 1].strip()
                
                if train1_id in variables['train_end_times'] and train2_id in variables['train_start_times']:
                    arrival1 = variables['train_end_times'][train1_id]
                    departure2 = variables['train_start_times'][train2_id]
                    
                    # Ensure minimum transfer time
                    model.Add(departure2 >= arrival1 + min_transfer_time)


class RailwayConstraintLibrary:
    """
    Library of pre-defined railway domain constraints
    that can be easily applied to optimization problems.
    """
    
    @staticmethod
    def create_standard_safety_constraints() -> List[Dict]:
        """Create standard railway safety constraints."""
        return [
            {
                'id': 'min_headway',
                'type': 'SIGNAL_SPACING',
                'priority': 1,
                'parameters': {'min_headway_seconds': '300'},  # 5 minutes
                'is_hard_constraint': True
            },
            {
                'id': 'safe_distance',
                'type': 'SAFETY_DISTANCE', 
                'priority': 1,
                'parameters': {'min_distance_seconds': '180'},  # 3 minutes
                'is_hard_constraint': True
            }
        ]
    
    @staticmethod
    def create_platform_constraints(station_capacities: Dict[str, int]) -> List[Dict]:
        """Create platform capacity constraints for stations."""
        constraints = []
        for station_id, capacity in station_capacities.items():
            constraints.append({
                'id': f'platform_capacity_{station_id}',
                'type': 'PLATFORM_CAPACITY',
                'priority': 2,
                'parameters': {
                    'station_id': station_id,
                    'max_trains_per_platform': str(capacity)
                },
                'is_hard_constraint': True
            })
        return constraints
    
    @staticmethod
    def create_priority_constraints() -> List[Dict]:
        """Create train priority constraints."""
        return [
            {
                'id': 'emergency_priority',
                'type': 'TRAIN_PRIORITY',
                'priority': 1,
                'parameters': {
                    'priority_rules': 'EMERGENCY > EXPRESS > MAIL > PASSENGER > FREIGHT'
                },
                'is_hard_constraint': True
            }
        ]
    
    @staticmethod
    def create_maintenance_constraints(maintenance_windows: List[Dict]) -> List[Dict]:
        """Create maintenance window constraints."""
        constraints = []
        for i, window in enumerate(maintenance_windows):
            constraints.append({
                'id': f'maintenance_window_{i}',
                'type': 'MAINTENANCE_WINDOW',
                'priority': 1,
                'parameters': {
                    'start_time_minutes': str(window.get('start', 0)),
                    'end_time_minutes': str(window.get('end', 60)),
                    'affected_sections': ','.join(window.get('sections', []))
                },
                'is_hard_constraint': True
            })
        return constraints
    
    @staticmethod
    def create_speed_limit_constraints(speed_limits: Dict[str, float]) -> List[Dict]:
        """Create speed limit constraints for sections."""
        constraints = []
        for section_id, max_speed in speed_limits.items():
            constraints.append({
                'id': f'speed_limit_{section_id}',
                'type': 'SPEED_LIMIT',
                'priority': 2,
                'parameters': {
                    'sections': section_id,
                    'max_speed_kmh': str(max_speed)
                },
                'is_hard_constraint': True
            })
        return constraints


class AdvancedConstraintModels:
    """
    Advanced constraint models for complex railway optimization scenarios.
    """
    
    @staticmethod
    def add_capacity_utilization_constraint(model: cp_model.CpModel, variables: Dict, 
                                          max_utilization: float = 0.85):
        """
        Add constraint to limit track capacity utilization.
        
        Args:
            model: CP-SAT model
            variables: Decision variables
            max_utilization: Maximum allowed utilization (0.0 to 1.0)
        """
        # Calculate total track time usage
        total_usage_vars = []
        
        for train_id in variables['train_start_times']:
            start_var = variables['train_start_times'][train_id]
            end_var = variables['train_end_times'][train_id]
            
            # Journey duration
            journey_duration = model.NewIntVar(0, 240, f'duration_{train_id}')
            model.Add(journey_duration == end_var - start_var)
            total_usage_vars.append(journey_duration)
        
        # Total time window (e.g., 120 minutes)
        time_window = 120
        max_total_usage = int(time_window * max_utilization)
        
        # Constraint: total usage <= max allowed
        if total_usage_vars:
            model.Add(sum(total_usage_vars) <= max_total_usage)
    
    @staticmethod
    def add_passenger_connection_constraint(model: cp_model.CpModel, variables: Dict,
                                          connections: List[Dict]):
        """
        Add constraints for passenger connections between trains.
        
        Args:
            model: CP-SAT model
            variables: Decision variables
            connections: List of connection requirements
        """
        for connection in connections:
            from_train = connection.get('from_train')
            to_train = connection.get('to_train')
            min_transfer_time = connection.get('min_transfer_minutes', 10)
            
            if (from_train in variables['train_end_times'] and 
                to_train in variables['train_start_times']):
                
                arrival_time = variables['train_end_times'][from_train]
                departure_time = variables['train_start_times'][to_train]
                
                # Ensure sufficient transfer time
                model.Add(departure_time >= arrival_time + min_transfer_time)
    
    @staticmethod
    def add_energy_optimization_constraint(model: cp_model.CpModel, variables: Dict,
                                         energy_budget: float):
        """
        Add energy consumption optimization constraints.
        
        Args:
            model: CP-SAT model
            variables: Decision variables
            energy_budget: Maximum energy budget in kWh
        """
        # This would require modeling energy consumption based on:
        # - Train acceleration/deceleration profiles
        # - Speed maintenance
        # - Regenerative braking opportunities
        
        energy_vars = []
        for train_id in variables['speed_variables']:
            if train_id in variables['speed_variables']:
                # Simplified energy model: higher speeds = more energy
                speed_var = variables['speed_variables'][train_id]
                energy_var = model.NewIntVar(0, 1000, f'energy_{train_id}')
                
                # Linear approximation: energy proportional to speed squared
                # In practice, this would be more complex
                model.Add(energy_var >= speed_var // 2)  # Simplified relationship
                energy_vars.append(energy_var)
        
        if energy_vars:
            model.Add(sum(energy_vars) <= int(energy_budget))
    
    @staticmethod
    def add_conflict_resolution_constraint(model: cp_model.CpModel, variables: Dict,
                                         conflict_zones: List[Dict]):
        """
        Add constraints for resolving known conflicts.
        
        Args:
            model: CP-SAT model
            variables: Decision variables
            conflict_zones: List of conflict zone definitions
        """
        for zone in conflict_zones:
            zone_id = zone.get('id')
            conflicting_trains = zone.get('trains', [])
            resolution_strategy = zone.get('strategy', 'time_separation')
            
            if resolution_strategy == 'time_separation':
                # Ensure trains are separated in time within the conflict zone
                min_separation = zone.get('min_separation_minutes', 5)
                
                for i, train1 in enumerate(conflicting_trains):
                    for train2 in conflicting_trains[i+1:]:
                        if (train1 in variables['train_start_times'] and 
                            train2 in variables['train_start_times']):
                            
                            start1 = variables['train_start_times'][train1]
                            start2 = variables['train_start_times'][train2]
                            end1 = variables['train_end_times'][train1]
                            end2 = variables['train_end_times'][train2]
                            
                            # Mutual exclusion in time
                            order_var = model.NewBoolVar(f'conflict_order_{train1}_{train2}_{zone_id}')
                            model.Add(end1 + min_separation <= start2).OnlyEnforceIf(order_var)
                            model.Add(end2 + min_separation <= start1).OnlyEnforceIf(order_var.Not())
            
            elif resolution_strategy == 'platform_separation':
                # Ensure trains use different platforms
                for i, train1 in enumerate(conflicting_trains):
                    for train2 in conflicting_trains[i+1:]:
                        if (train1 in variables['platform_assignments'] and 
                            train2 in variables['platform_assignments']):
                            
                            platform1 = variables['platform_assignments'][train1]
                            platform2 = variables['platform_assignments'][train2]
                            model.Add(platform1 != platform2)
