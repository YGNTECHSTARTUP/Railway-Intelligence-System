"""
Unit tests for the Python optimization engine using OR-Tools.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.optimization_engine import OptimizationEngine
from src.models import (
    OptimizationRequest, Train, TrainType, TrainPriority, TrainCharacteristics,
    OptimizationObjective, ObjectiveType, OptimizationConfig, Constraint, ConstraintType
)


class TestOptimizationEngine:
    """Test cases for the optimization engine."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.engine = OptimizationEngine()
        self.sample_trains = self._create_sample_trains()
        self.sample_constraints = self._create_sample_constraints()
    
    def _create_sample_trains(self):
        """Create sample trains for testing."""
        base_time = datetime.utcnow()
        
        return [
            Train(
                id="T001",
                train_number=12001,
                train_type=TrainType.EXPRESS,
                priority=TrainPriority.EXPRESS,
                capacity_passengers=500,
                length_meters=200.0,
                max_speed_kmh=120.0,
                scheduled_departure=base_time,
                scheduled_arrival=base_time + timedelta(hours=2),
                origin_station="StationA",
                destination_station="StationB",
                route_sections=["S1", "S2", "S3"],
                characteristics=TrainCharacteristics(
                    acceleration_ms2=1.2,
                    deceleration_ms2=1.5,
                    power_kw=3000.0,
                    weight_tons=300.0,
                    passenger_load_percent=80,
                    is_electric=True
                )
            ),
            Train(
                id="T002",
                train_number=12002,
                train_type=TrainType.PASSENGER,
                priority=TrainPriority.PASSENGER,
                capacity_passengers=800,
                length_meters=160.0,
                max_speed_kmh=100.0,
                scheduled_departure=base_time + timedelta(minutes=15),
                scheduled_arrival=base_time + timedelta(hours=2, minutes=30),
                origin_station="StationA",
                destination_station="StationC",
                route_sections=["S1", "S4", "S5"],
                characteristics=TrainCharacteristics(
                    acceleration_ms2=0.8,
                    deceleration_ms2=1.0,
                    power_kw=2500.0,
                    weight_tons=400.0,
                    passenger_load_percent=60,
                    is_electric=True
                )
            ),
            Train(
                id="T003",
                train_number=12003,
                train_type=TrainType.FREIGHT,
                priority=TrainPriority.FREIGHT,
                capacity_passengers=0,
                length_meters=600.0,
                max_speed_kmh=80.0,
                scheduled_departure=base_time + timedelta(minutes=30),
                scheduled_arrival=base_time + timedelta(hours=4),
                origin_station="StationD",
                destination_station="StationB",
                route_sections=["S6", "S2", "S3"],
                characteristics=TrainCharacteristics(
                    acceleration_ms2=0.5,
                    deceleration_ms2=0.8,
                    power_kw=4000.0,
                    weight_tons=1200.0,
                    passenger_load_percent=0,
                    is_electric=False
                )
            )
        ]
    
    def _create_sample_constraints(self):
        """Create sample constraints for testing."""
        return [
            Constraint(
                id="safety_1",
                type=ConstraintType.SAFETY_DISTANCE,
                priority=1,
                parameters={"min_distance_seconds": "300"},
                is_hard_constraint=True
            ),
            Constraint(
                id="platform_1",
                type=ConstraintType.PLATFORM_CAPACITY,
                priority=2,
                parameters={"station_id": "StationA", "max_trains_per_platform": "1"},
                is_hard_constraint=True
            ),
            Constraint(
                id="priority_1",
                type=ConstraintType.TRAIN_PRIORITY,
                priority=1,
                parameters={"priority_rules": "EXPRESS > PASSENGER > FREIGHT"},
                is_hard_constraint=True
            )
        ]
    
    def test_engine_initialization(self):
        """Test that the optimization engine initializes correctly."""
        assert self.engine is not None
        assert hasattr(self.engine, 'constraint_builder')
        assert hasattr(self.engine, 'objective_manager')
    
    def test_calculate_journey_time(self):
        """Test journey time calculation."""
        train = self.sample_trains[0]  # Express train
        journey_time = self.engine._calculate_journey_time(train)
        
        # Should be reasonable journey time (15-60 minutes for 3 sections)
        assert 15 <= journey_time <= 60
        assert isinstance(journey_time, int)
    
    def test_datetime_to_minutes_conversion(self):
        """Test datetime to minutes conversion."""
        reference = datetime.utcnow()
        test_time = reference + timedelta(minutes=30)
        
        minutes = self.engine._datetime_to_minutes(test_time, reference)
        assert minutes == 30
    
    def test_optimization_with_minimize_delay_objective(self):
        """Test optimization with minimize delay objective."""
        objective = OptimizationObjective(
            primary_objective=ObjectiveType.MINIMIZE_DELAY,
            time_limit_seconds=10.0
        )
        
        config = OptimizationConfig(
            max_solver_time_seconds=10,
            enable_detailed_logging=False,
            num_search_workers=2
        )
        
        request = OptimizationRequest(
            request_id="TEST_REQ_001",
            section_id="TEST_SECTION",
            time_horizon_minutes=120,
            trains=self.sample_trains[:2],  # Use first 2 trains
            constraints=self.sample_constraints[:1],  # Use safety constraint
            objective=objective,
            disruptions=[],
            requested_at=datetime.utcnow(),
            config=config
        )
        
        response = self.engine.optimize_schedule(request)
        
        # Verify response structure
        assert response.request_id == "TEST_REQ_001"
        assert response.status is not None
        assert response.execution_time_ms > 0
        assert len(response.optimized_schedule) == 2  # Should have 2 trains
    
    def test_optimization_with_maximize_throughput_objective(self):
        """Test optimization with maximize throughput objective."""
        objective = OptimizationObjective(
            primary_objective=ObjectiveType.MAXIMIZE_THROUGHPUT,
            time_limit_seconds=10.0
        )
        
        config = OptimizationConfig(max_solver_time_seconds=10)
        
        request = OptimizationRequest(
            request_id="TEST_REQ_002",
            section_id="TEST_SECTION",
            time_horizon_minutes=120,
            trains=self.sample_trains,
            constraints=self.sample_constraints,
            objective=objective,
            disruptions=[],
            requested_at=datetime.utcnow(),
            config=config
        )
        
        response = self.engine.optimize_schedule(request)
        
        # Verify response
        assert response.request_id == "TEST_REQ_002"
        assert len(response.optimized_schedule) == 3  # Should have 3 trains
        
        # Check that performance metrics are calculated
        assert response.kpis.total_delay_minutes >= 0
        assert response.kpis.throughput_trains_per_hour > 0
    
    def test_optimization_with_conflicting_trains(self):
        """Test optimization with trains that have scheduling conflicts."""
        # Create trains with overlapping schedules on same route
        base_time = datetime.utcnow()
        
        conflicting_trains = [
            Train(
                id="T_CONFLICT_1",
                train_number=11001,
                train_type=TrainType.EXPRESS,
                priority=TrainPriority.EXPRESS,
                capacity_passengers=500,
                length_meters=200.0,
                max_speed_kmh=120.0,
                scheduled_departure=base_time,
                scheduled_arrival=base_time + timedelta(hours=1),
                origin_station="StationA",
                destination_station="StationB",
                route_sections=["S1", "S2"]
            ),
            Train(
                id="T_CONFLICT_2",
                train_number=11002,
                train_type=TrainType.PASSENGER,
                priority=TrainPriority.PASSENGER,
                capacity_passengers=600,
                length_meters=180.0,
                max_speed_kmh=100.0,
                scheduled_departure=base_time + timedelta(minutes=5),  # Close departure
                scheduled_arrival=base_time + timedelta(hours=1, minutes=15),
                origin_station="StationA", 
                destination_station="StationB",
                route_sections=["S1", "S2"]  # Same route = conflict
            )
        ]
        
        objective = OptimizationObjective(primary_objective=ObjectiveType.MINIMIZE_CONFLICTS)
        config = OptimizationConfig(max_solver_time_seconds=15)
        
        request = OptimizationRequest(
            request_id="TEST_CONFLICT",
            section_id="TEST_SECTION",
            time_horizon_minutes=120,
            trains=conflicting_trains,
            constraints=self.sample_constraints,
            objective=objective,
            disruptions=[],
            requested_at=base_time,
            config=config
        )
        
        response = self.engine.optimize_schedule(request)
        
        # Should successfully resolve conflicts
        assert response.status.value in ["OPTIMAL", "FEASIBLE"]
        assert len(response.optimized_schedule) == 2
        
        # Check that trains are properly separated
        schedule = response.optimized_schedule
        train1_departure = schedule[0].scheduled_departure
        train2_departure = schedule[1].scheduled_departure
        
        # Should have at least 5 minutes separation
        time_diff = abs((train1_departure - train2_departure).total_seconds() / 60)
        assert time_diff >= 5  # Minimum headway
    
    def test_optimization_with_platform_constraints(self):
        """Test optimization with platform capacity constraints."""
        platform_constraint = Constraint(
            id="platform_limit",
            type=ConstraintType.PLATFORM_CAPACITY,
            priority=1,
            parameters={"station_id": "StationA", "max_trains_per_platform": "1"},
            is_hard_constraint=True
        )
        
        objective = OptimizationObjective(primary_objective=ObjectiveType.BALANCED_OPTIMAL)
        config = OptimizationConfig(max_solver_time_seconds=15)
        
        request = OptimizationRequest(
            request_id="TEST_PLATFORM",
            section_id="TEST_SECTION",
            time_horizon_minutes=120,
            trains=self.sample_trains,
            constraints=[platform_constraint],
            objective=objective,
            disruptions=[],
            requested_at=datetime.utcnow(),
            config=config
        )
        
        response = self.engine.optimize_schedule(request)
        
        # Should handle platform constraints
        assert response.status.value in ["OPTIMAL", "FEASIBLE", "TIME_LIMIT_EXCEEDED"]
        
        # Check platform assignments are valid
        for schedule_entry in response.optimized_schedule:
            assert 1 <= schedule_entry.platform <= 10
    
    def test_performance_metrics_calculation(self):
        """Test that performance metrics are calculated correctly."""
        from src.models import PerformanceMetrics
        
        # Create a simple schedule for testing
        schedule = [
            type('MockScheduleEntry', (), {
                'delay_adjustment_minutes': 5,
                'scheduled_departure': datetime.utcnow(),
                'scheduled_arrival': datetime.utcnow() + timedelta(hours=1),
                'train_id': 'T001'
            })(),
            type('MockScheduleEntry', (), {
                'delay_adjustment_minutes': -2,  # Early
                'scheduled_departure': datetime.utcnow(),
                'scheduled_arrival': datetime.utcnow() + timedelta(hours=1),
                'train_id': 'T002'
            })()
        ]
        
        # Mock solver and variables
        mock_solver = Mock()
        mock_variables = {'train_start_times': {'T001': Mock(), 'T002': Mock()}}
        
        metrics = self.engine._calculate_performance_metrics(
            schedule, self.sample_trains[:2], mock_solver, mock_variables
        )
        
        assert isinstance(metrics, PerformanceMetrics)
        assert metrics.total_delay_minutes == 5  # Only positive delays count
        assert metrics.average_delay_per_train == 2.5  # 5/2
        assert metrics.throughput_trains_per_hour > 0
    
    def test_confidence_score_calculation(self):
        """Test confidence score calculation for different optimization statuses."""
        from src.models import OptimizationStatus
        
        mock_solver = Mock()
        
        # Test optimal solution
        optimal_score = self.engine._calculate_confidence_score(mock_solver, OptimizationStatus.OPTIMAL)
        assert optimal_score == 1.0
        
        # Test feasible solution
        feasible_score = self.engine._calculate_confidence_score(mock_solver, OptimizationStatus.FEASIBLE)
        assert 0.8 <= feasible_score <= 0.9
        
        # Test time limit exceeded
        timeout_score = self.engine._calculate_confidence_score(mock_solver, OptimizationStatus.TIME_LIMIT_EXCEEDED)
        assert 0.7 <= timeout_score <= 0.8
        
        # Test error case
        error_score = self.engine._calculate_confidence_score(mock_solver, OptimizationStatus.ERROR)
        assert error_score == 0.0
    
    def test_speed_profile_generation(self):
        """Test speed profile generation for optimized trains."""
        train = self.sample_trains[0]
        mock_solver = Mock()
        mock_variables = {
            'speed_variables': {
                'T001_S1': Mock(),
                'T001_S2': Mock(),
                'T001_S3': Mock()
            }
        }
        
        # Mock solver values
        mock_solver.Value.side_effect = [80, 90, 70]  # Different speeds for each section
        
        speed_profile = self.engine._generate_speed_profile(mock_solver, mock_variables, train)
        
        assert len(speed_profile) == 3  # One point per section
        assert all(isinstance(point['speed_kmh'], (int, float)) for point in speed_profile)
        assert all(point['position_km'] >= 0 for point in speed_profile)
    
    def test_energy_consumption_estimation(self):
        """Test energy consumption estimation."""
        schedule = [
            type('MockScheduleEntry', (), {
                'train_id': 'T001',
                'scheduled_departure': datetime.utcnow(),
                'scheduled_arrival': datetime.utcnow() + timedelta(hours=2),
            })()
        ]
        
        energy = self.engine._estimate_energy_consumption(schedule, self.sample_trains[:1])
        
        assert energy > 0
        assert isinstance(energy, float)
    
    def test_error_handling(self):
        """Test error handling in optimization engine."""
        # Create invalid request
        invalid_request = OptimizationRequest(
            request_id="INVALID_REQ",
            section_id="",  # Empty section ID
            time_horizon_minutes=0,  # Invalid time horizon
            trains=[],  # No trains
            constraints=[],
            objective=OptimizationObjective(primary_objective=ObjectiveType.MINIMIZE_DELAY),
            disruptions=[],
            requested_at=datetime.utcnow(),
            config=OptimizationConfig()
        )
        
        # Should handle gracefully and return error response
        response = self.engine.optimize_schedule(invalid_request)
        assert response.status == OptimizationStatus.ERROR
        assert response.error_message != ""
    
    def test_alternative_generation_placeholder(self):
        """Test alternative generation (placeholder implementation)."""
        from ortools.sat.python import cp_model
        
        model = cp_model.CpModel()
        solver = cp_model.CpSolver()
        variables = {}
        
        request = OptimizationRequest(
            request_id="ALT_TEST",
            section_id="TEST_SECTION",
            time_horizon_minutes=120,
            trains=self.sample_trains[:1],
            constraints=[],
            objective=OptimizationObjective(primary_objective=ObjectiveType.MINIMIZE_DELAY),
            disruptions=[],
            requested_at=datetime.utcnow(),
            config=OptimizationConfig()
        )
        
        alternatives = self.engine._generate_alternatives(model, solver, variables, request)
        
        # Currently returns empty list - this is expected for placeholder
        assert isinstance(alternatives, list)


@pytest.fixture
def sample_optimization_request():
    """Fixture for creating sample optimization requests."""
    base_time = datetime.utcnow()
    
    trains = [
        Train(
            id="FIXTURE_T001",
            train_number=99001,
            train_type=TrainType.EXPRESS,
            priority=TrainPriority.EXPRESS,
            capacity_passengers=400,
            length_meters=180.0,
            max_speed_kmh=110.0,
            scheduled_departure=base_time,
            scheduled_arrival=base_time + timedelta(hours=1, minutes=30),
            origin_station="Origin",
            destination_station="Destination",
            route_sections=["R1", "R2"]
        )
    ]
    
    return OptimizationRequest(
        request_id="FIXTURE_REQ",
        section_id="FIXTURE_SECTION",
        time_horizon_minutes=90,
        trains=trains,
        constraints=[],
        objective=OptimizationObjective(primary_objective=ObjectiveType.MINIMIZE_DELAY),
        disruptions=[],
        requested_at=base_time,
        config=OptimizationConfig(max_solver_time_seconds=5)
    )


def test_optimization_engine_integration(sample_optimization_request):
    """Integration test for the complete optimization flow."""
    engine = OptimizationEngine()
    
    response = engine.optimize_schedule(sample_optimization_request)
    
    # Verify complete response
    assert response.request_id == "FIXTURE_REQ"
    assert response.status in [
        OptimizationStatus.OPTIMAL,
        OptimizationStatus.FEASIBLE,
        OptimizationStatus.TIME_LIMIT_EXCEEDED
    ]
    assert response.execution_time_ms > 0
    assert response.confidence_score >= 0.0
    assert response.completed_at is not None
    
    # If successful, should have optimized schedule
    if response.status in [OptimizationStatus.OPTIMAL, OptimizationStatus.FEASIBLE]:
        assert len(response.optimized_schedule) == 1
        assert response.kpis.total_delay_minutes >= 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
