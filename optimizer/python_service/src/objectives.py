"""
Optimization objectives for railway scheduling optimization.
Implements various optimization goals using OR-Tools CP-SAT solver.
"""

import logging
from typing import List, Dict, Tuple
from ortools.sat.python import cp_model

logger = logging.getLogger(__name__)


class ObjectiveManager:
    """
    Manager class for handling different optimization objectives
    in railway scheduling problems.
    """
    
    def __init__(self):
        self.objective_builders = {
            'MINIMIZE_DELAY': self.build_minimize_delay_objective,
            'MAXIMIZE_THROUGHPUT': self.build_maximize_throughput_objective,
            'MINIMIZE_ENERGY_CONSUMPTION': self.build_minimize_energy_objective,
            'MAXIMIZE_UTILIZATION': self.build_maximize_utilization_objective,
            'MINIMIZE_CONFLICTS': self.build_minimize_conflicts_objective,
            'BALANCED_OPTIMAL': self.build_balanced_objective,
        }
    
    def build_objective(self, model: cp_model.CpModel, variables: Dict, 
                       objective_config: Dict, request) -> None:
        """
        Build the optimization objective based on configuration.
        
        Args:
            model: CP-SAT model
            variables: Decision variables dictionary
            objective_config: Objective configuration
            request: Optimization request
        """
        primary_objective = objective_config.get('primary_objective', 'MINIMIZE_DELAY')
        secondary_objectives = objective_config.get('secondary_objectives', [])
        
        if primary_objective in self.objective_builders:
            objective_builder = self.objective_builders[primary_objective]
            objective_terms = objective_builder(model, variables, request)
            
            # Add secondary objectives with weights
            for secondary in secondary_objectives:
                obj_type = secondary.get('objective')
                weight = secondary.get('weight', 0.1)
                
                if obj_type in self.objective_builders:
                    secondary_builder = self.objective_builders[obj_type]
                    secondary_terms = secondary_builder(model, variables, request)
                    
                    # Weight and add to primary objective
                    weighted_terms = [term * int(weight * 100) for term in secondary_terms]
                    objective_terms.extend(weighted_terms)
            
            # Set the final objective
            if objective_config.get('minimize', True):
                model.Minimize(sum(objective_terms))
            else:
                model.Maximize(sum(objective_terms))
                
        else:
            logger.warning(f"Unknown objective type: {primary_objective}")
            # Default to minimize delay
            self.build_minimize_delay_objective(model, variables, request)
    
    def build_minimize_delay_objective(self, model: cp_model.CpModel, variables: Dict, 
                                     request) -> List:
        """
        Build minimize delay objective.
        
        Returns:
            List of objective terms
        """
        delay_terms = []
        
        for train in request.trains:
            train_id = train.id
            delay_var = variables['train_delays'][train_id]
            
            # Penalize positive delays more heavily
            positive_delay = model.NewIntVar(0, 60, f'positive_delay_{train_id}')
            model.AddMaxEquality(positive_delay, [delay_var, 0])
            
            # Weight delays by train priority
            priority_weight = self._get_priority_weight(train.priority)
            weighted_delay = positive_delay * priority_weight
            
            delay_terms.append(weighted_delay)
        
        logger.info(f"Built minimize delay objective with {len(delay_terms)} terms")
        return delay_terms
    
    def build_maximize_throughput_objective(self, model: cp_model.CpModel, variables: Dict,
                                          request) -> List:
        """
        Build maximize throughput objective.
        
        Returns:
            List of objective terms (to be maximized)
        """
        throughput_terms = []
        
        for train in request.trains:
            train_id = train.id
            delay_var = variables['train_delays'][train_id]
            
            # Binary variable: train is "on time" (delay <= 5 minutes)
            on_time = model.NewBoolVar(f'on_time_{train_id}')
            model.Add(delay_var <= 5).OnlyEnforceIf(on_time)
            model.Add(delay_var > 5).OnlyEnforceIf(on_time.Not())
            
            # Weight by train importance
            priority_weight = self._get_priority_weight(train.priority)
            weighted_on_time = on_time * priority_weight
            
            throughput_terms.append(weighted_on_time)
        
        logger.info(f"Built maximize throughput objective with {len(throughput_terms)} terms")
        return throughput_terms
    
    def build_minimize_energy_objective(self, model: cp_model.CpModel, variables: Dict,
                                      request) -> List:
        """
        Build minimize energy consumption objective.
        
        Returns:
            List of objective terms
        """
        energy_terms = []
        
        for train in request.trains:
            train_id = train.id
            
            # Energy consumption based on speed and delays
            total_energy = model.NewIntVar(0, 10000, f'total_energy_{train_id}')
            energy_components = []
            
            # Speed-based energy consumption
            for section in train.route_sections:
                speed_key = f'{train_id}_{section}'
                if speed_key in variables['speed_variables']:
                    speed_var = variables['speed_variables'][speed_key]
                    
                    # Energy roughly proportional to speed squared
                    speed_energy = model.NewIntVar(0, 1000, f'speed_energy_{speed_key}')
                    model.AddMultiplicationEquality(speed_energy, [speed_var, speed_var // 10])
                    energy_components.append(speed_energy)
            
            # Delay-based energy penalty (idling, stop-start cycles)
            delay_var = variables['train_delays'][train_id]
            delay_energy = model.NewIntVar(0, 500, f'delay_energy_{train_id}')
            model.Add(delay_energy == delay_var * 5)  # 5 kWh per minute of delay
            energy_components.append(delay_energy)
            
            if energy_components:
                model.Add(total_energy == sum(energy_components))
                energy_terms.append(total_energy)
        
        logger.info(f"Built minimize energy objective with {len(energy_terms)} terms")
        return energy_terms
    
    def build_maximize_utilization_objective(self, model: cp_model.CpModel, variables: Dict,
                                           request) -> List:
        """
        Build maximize track utilization objective.
        
        Returns:
            List of objective terms (to be maximized)
        """
        utilization_terms = []
        time_horizon = request.time_horizon_minutes
        
        # Track occupancy variables
        track_usage_vars = []
        
        for section_key in variables.get('section_occupancy', {}):
            if 'section_occupancy' in section_key:
                occupancy_var = variables['section_occupancy'][section_key]
                track_usage_vars.append(occupancy_var)
        
        # Maximize total track usage (but not beyond capacity)
        if track_usage_vars:
            total_usage = model.NewIntVar(0, len(track_usage_vars), 'total_track_usage')
            model.Add(total_usage == sum(track_usage_vars))
            utilization_terms.append(total_usage)
        
        logger.info(f"Built maximize utilization objective with {len(utilization_terms)} terms")
        return utilization_terms
    
    def build_minimize_conflicts_objective(self, model: cp_model.CpModel, variables: Dict,
                                         request) -> List:
        """
        Build minimize conflicts objective.
        
        Returns:
            List of objective terms
        """
        conflict_terms = []
        
        # Create conflict variables for each pair of trains
        trains = list(variables['train_start_times'].keys())
        
        for i, train1 in enumerate(trains):
            for train2 in trains[i+1:]:
                # Conflict occurs if trains have overlapping schedules
                conflict_var = model.NewBoolVar(f'conflict_{train1}_{train2}')
                
                start1 = variables['train_start_times'][train1]
                end1 = variables['train_end_times'][train1]
                start2 = variables['train_start_times'][train2]
                end2 = variables['train_end_times'][train2]
                
                # Trains conflict if their schedules overlap
                no_overlap = model.NewBoolVar(f'no_overlap_{train1}_{train2}')
                model.Add(end1 <= start2).OnlyEnforceIf(no_overlap)
                model.Add(end2 <= start1).OnlyEnforceIf(no_overlap.Not())
                
                # Conflict is the negation of no_overlap
                model.Add(conflict_var == no_overlap.Not())
                conflict_terms.append(conflict_var)
        
        logger.info(f"Built minimize conflicts objective with {len(conflict_terms)} terms")
        return conflict_terms
    
    def build_balanced_objective(self, model: cp_model.CpModel, variables: Dict,
                               request) -> List:
        """
        Build balanced multi-objective optimization.
        
        Returns:
            List of objective terms
        """
        balanced_terms = []
        
        # Get individual objective terms
        delay_terms = self.build_minimize_delay_objective(model, variables, request)
        throughput_terms = self.build_maximize_throughput_objective(model, variables, request)
        energy_terms = self.build_minimize_energy_objective(model, variables, request)
        
        # Weight the objectives
        delay_weight = 50      # Heavily weight delay minimization
        throughput_weight = 30 # Moderately weight throughput
        energy_weight = 20     # Lower weight for energy
        
        # Add weighted delay terms (minimize)
        for term in delay_terms:
            balanced_terms.append(term * delay_weight)
        
        # Add weighted throughput terms (maximize, so subtract)
        for term in throughput_terms:
            balanced_terms.append(term * (-throughput_weight))
        
        # Add weighted energy terms (minimize)
        for term in energy_terms:
            balanced_terms.append(term * energy_weight // 100)  # Scale down energy impact
        
        logger.info(f"Built balanced objective with {len(balanced_terms)} weighted terms")
        return balanced_terms
    
    def _get_priority_weight(self, priority: str) -> int:
        """
        Get priority weight for objective calculations.
        
        Args:
            priority: Train priority level
            
        Returns:
            int: Weight multiplier
        """
        priority_weights = {
            'EMERGENCY': 10,
            'EXPRESS': 8,
            'MAIL': 6,
            'PASSENGER': 4,
            'FREIGHT': 2,
            'MAINTENANCE': 1
        }
        return priority_weights.get(priority, 3)


class AdvancedObjectives:
    """
    Advanced optimization objectives for complex railway scenarios.
    """
    
    @staticmethod
    def build_passenger_satisfaction_objective(model: cp_model.CpModel, variables: Dict,
                                             passenger_weights: Dict[str, float]) -> List:
        """
        Build objective to maximize passenger satisfaction.
        
        Args:
            model: CP-SAT model
            variables: Decision variables
            passenger_weights: Weight for each train based on passenger load
            
        Returns:
            List of objective terms
        """
        satisfaction_terms = []
        
        for train_id, weight in passenger_weights.items():
            if train_id in variables['train_delays']:
                delay_var = variables['train_delays'][train_id]
                
                # Passenger satisfaction decreases with delay
                satisfaction_penalty = model.NewIntVar(0, 1000, f'satisfaction_penalty_{train_id}')
                
                # Non-linear penalty for delays (delays hurt more for passenger trains)
                model.Add(satisfaction_penalty == delay_var * delay_var // 5)
                
                weighted_penalty = satisfaction_penalty * int(weight * 100)
                satisfaction_terms.append(weighted_penalty)
        
        return satisfaction_terms
    
    @staticmethod
    def build_network_resilience_objective(model: cp_model.CpModel, variables: Dict,
                                         resilience_config: Dict) -> List:
        """
        Build objective to maximize network resilience.
        
        Args:
            model: CP-SAT model
            variables: Decision variables
            resilience_config: Configuration for resilience metrics
            
        Returns:
            List of objective terms
        """
        resilience_terms = []
        
        # Promote schedule diversity (avoid single points of failure)
        diversity_bonus = resilience_config.get('diversity_weight', 0.1)
        
        # Penalize tight schedules that are vulnerable to cascading delays
        buffer_targets = resilience_config.get('buffer_targets', {})
        
        trains = list(variables['train_start_times'].keys())
        
        for i, train1 in enumerate(trains):
            for train2 in trains[i+1:]:
                start1 = variables['train_start_times'][train1]
                start2 = variables['train_start_times'][train2]
                
                # Buffer between consecutive trains
                time_buffer = model.NewIntVar(0, 60, f'buffer_{train1}_{train2}')
                
                # Buffer is absolute difference in start times
                abs_diff = model.NewIntVar(0, 120, f'abs_diff_{train1}_{train2}')
                model.AddAbsEquality(abs_diff, start1 - start2)
                model.Add(time_buffer == abs_diff)
                
                # Reward adequate buffers
                adequate_buffer = model.NewBoolVar(f'adequate_buffer_{train1}_{train2}')
                model.Add(time_buffer >= 10).OnlyEnforceIf(adequate_buffer)  # 10-minute buffer
                model.Add(time_buffer < 10).OnlyEnforceIf(adequate_buffer.Not())
                
                # Add to resilience terms (maximize buffers)
                resilience_terms.append(adequate_buffer * int(diversity_bonus * 100))
        
        return resilience_terms
    
    @staticmethod
    def build_cost_optimization_objective(model: cp_model.CpModel, variables: Dict,
                                        cost_config: Dict) -> List:
        """
        Build cost optimization objective.
        
        Args:
            model: CP-SAT model
            variables: Decision variables
            cost_config: Cost configuration with cost per delay, energy, etc.
            
        Returns:
            List of objective terms
        """
        cost_terms = []
        
        delay_cost_per_minute = int(cost_config.get('delay_cost_per_minute', 100))  # ₹100 per minute
        energy_cost_per_kwh = int(cost_config.get('energy_cost_per_kwh', 5))        # ₹5 per kWh
        platform_change_cost = int(cost_config.get('platform_change_cost', 500))   # ₹500 per change
        
        trains = list(variables['train_start_times'].keys())
        
        for train_id in trains:
            # Delay costs
            if train_id in variables['train_delays']:
                delay_var = variables['train_delays'][train_id]
                positive_delay = model.NewIntVar(0, 60, f'positive_delay_{train_id}')
                model.AddMaxEquality(positive_delay, [delay_var, 0])
                
                delay_cost = positive_delay * delay_cost_per_minute
                cost_terms.append(delay_cost)
            
            # Energy costs (simplified)
            if f'{train_id}_total_energy' in variables:
                energy_var = variables[f'{train_id}_total_energy']
                energy_cost = energy_var * energy_cost_per_kwh // 100  # Scale down
                cost_terms.append(energy_cost)
        
        return cost_terms


class MultiObjectiveOptimizer:
    """
    Multi-objective optimization using weighted sum and Pareto optimization techniques.
    """
    
    def __init__(self):
        self.objective_manager = ObjectiveManager()
    
    def optimize_pareto_front(self, model: cp_model.CpModel, variables: Dict,
                            objectives: List[Dict], request) -> List[Dict]:
        """
        Generate Pareto optimal solutions for multi-objective optimization.
        
        Args:
            model: CP-SAT model
            variables: Decision variables
            objectives: List of objective configurations
            request: Optimization request
            
        Returns:
            List of Pareto optimal solutions
        """
        pareto_solutions = []
        
        # Generate multiple solutions with different objective weights
        weight_combinations = [
            [1.0, 0.0, 0.0],  # Pure delay minimization
            [0.0, 1.0, 0.0],  # Pure throughput maximization
            [0.0, 0.0, 1.0],  # Pure energy minimization
            [0.6, 0.3, 0.1],  # Balanced: delay-focused
            [0.3, 0.6, 0.1],  # Balanced: throughput-focused
            [0.4, 0.4, 0.2],  # Equal delay/throughput, some energy
        ]
        
        for i, weights in enumerate(weight_combinations):
            try:
                # Create a copy of the model for this iteration
                # Note: In practice, you'd solve the model with different objectives
                solution = self._solve_with_weights(model, variables, objectives, weights, request)
                if solution:
                    solution['weight_combination'] = weights
                    solution['solution_id'] = i
                    pareto_solutions.append(solution)
                    
            except Exception as e:
                logger.warning(f"Failed to solve with weight combination {weights}: {str(e)}")
        
        return pareto_solutions
    
    def _solve_with_weights(self, model: cp_model.CpModel, variables: Dict,
                          objectives: List[Dict], weights: List[float], request) -> Dict:
        """
        Solve optimization problem with specific objective weights.
        
        Returns:
            Solution dictionary or None if failed
        """
        # This would implement solving with specific weights
        # For now, return a placeholder
        logger.info(f"Solving with weights: {weights}")
        
        return {
            'objective_values': [100.0 * w for w in weights],
            'execution_time_ms': 1000,
            'status': 'FEASIBLE'
        }


class DynamicObjectiveAdaptation:
    """
    Adaptive objective function that adjusts based on real-time conditions.
    """
    
    def __init__(self):
        self.adaptation_rules = {
            'peak_hours': self._adapt_for_peak_hours,
            'weather_disruption': self._adapt_for_weather,
            'maintenance_mode': self._adapt_for_maintenance,
            'emergency_mode': self._adapt_for_emergency,
        }
    
    def adapt_objective(self, base_objective: Dict, context: Dict) -> Dict:
        """
        Adapt objective function based on current context.
        
        Args:
            base_objective: Base objective configuration
            context: Current operational context
            
        Returns:
            Adapted objective configuration
        """
        adapted_objective = base_objective.copy()
        
        # Apply adaptation rules based on context
        for condition, adapter in self.adaptation_rules.items():
            if context.get(condition, False):
                adapted_objective = adapter(adapted_objective, context)
        
        return adapted_objective
    
    def _adapt_for_peak_hours(self, objective: Dict, context: Dict) -> Dict:
        """Adapt objective for peak hours - prioritize throughput."""
        objective['primary_objective'] = 'MAXIMIZE_THROUGHPUT'
        objective['secondary_objectives'] = [
            {'objective': 'MINIMIZE_DELAY', 'weight': 0.3},
            {'objective': 'MAXIMIZE_UTILIZATION', 'weight': 0.2}
        ]
        return objective
    
    def _adapt_for_weather(self, objective: Dict, context: Dict) -> Dict:
        """Adapt objective for weather disruptions - prioritize safety and resilience."""
        objective['primary_objective'] = 'MINIMIZE_CONFLICTS'
        objective['secondary_objectives'] = [
            {'objective': 'MINIMIZE_DELAY', 'weight': 0.4},
            {'objective': 'MAXIMIZE_THROUGHPUT', 'weight': 0.2}
        ]
        return objective
    
    def _adapt_for_maintenance(self, objective: Dict, context: Dict) -> Dict:
        """Adapt objective for maintenance windows - prioritize schedule stability."""
        objective['primary_objective'] = 'MINIMIZE_DELAY'
        objective['secondary_objectives'] = [
            {'objective': 'MINIMIZE_CONFLICTS', 'weight': 0.3},
            {'objective': 'MAXIMIZE_UTILIZATION', 'weight': 0.1}
        ]
        return objective
    
    def _adapt_for_emergency(self, objective: Dict, context: Dict) -> Dict:
        """Adapt objective for emergency situations - prioritize critical trains."""
        objective['primary_objective'] = 'MINIMIZE_DELAY'
        objective['secondary_objectives'] = [
            {'objective': 'MINIMIZE_CONFLICTS', 'weight': 0.5}
        ]
        # Increase priority weights for emergency trains
        objective['emergency_mode'] = True
        return objective
