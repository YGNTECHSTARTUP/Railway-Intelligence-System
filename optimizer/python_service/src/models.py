"""
Data models for the Python optimization service.
These models mirror the protobuf definitions and provide type safety.
"""

from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum


class OptimizationStatus(Enum):
    OPTIMAL = "OPTIMAL"
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    UNKNOWN = "UNKNOWN"
    TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED"
    ERROR = "ERROR"


class TrainType(Enum):
    PASSENGER = "PASSENGER"
    EXPRESS = "EXPRESS"
    FREIGHT = "FREIGHT"
    MAIL = "MAIL"
    MAINTENANCE = "MAINTENANCE"
    EMPTY = "EMPTY"


class TrainPriority(Enum):
    EMERGENCY = "EMERGENCY"
    EXPRESS = "EXPRESS"
    MAIL = "MAIL"
    PASSENGER = "PASSENGER"
    FREIGHT = "FREIGHT"
    MAINTENANCE = "MAINTENANCE"


class ObjectiveType(Enum):
    MINIMIZE_DELAY = "MINIMIZE_DELAY"
    MAXIMIZE_THROUGHPUT = "MAXIMIZE_THROUGHPUT"
    MINIMIZE_ENERGY_CONSUMPTION = "MINIMIZE_ENERGY_CONSUMPTION"
    MAXIMIZE_UTILIZATION = "MAXIMIZE_UTILIZATION"
    MINIMIZE_CONFLICTS = "MINIMIZE_CONFLICTS"
    BALANCED_OPTIMAL = "BALANCED_OPTIMAL"


class ConstraintType(Enum):
    SAFETY_DISTANCE = "SAFETY_DISTANCE"
    PLATFORM_CAPACITY = "PLATFORM_CAPACITY"
    TRAIN_PRIORITY = "TRAIN_PRIORITY"
    MAINTENANCE_WINDOW = "MAINTENANCE_WINDOW"
    SPEED_LIMIT = "SPEED_LIMIT"
    CROSSING_TIME = "CROSSING_TIME"
    SIGNAL_SPACING = "SIGNAL_SPACING"
    ENERGY_EFFICIENCY = "ENERGY_EFFICIENCY"
    PASSENGER_TRANSFER = "PASSENGER_TRANSFER"


@dataclass
class TrainCharacteristics:
    acceleration_ms2: float = 1.0
    deceleration_ms2: float = 1.2
    power_kw: float = 2000.0
    weight_tons: float = 400.0
    passenger_load_percent: int = 70
    is_electric: bool = True
    required_platforms: List[str] = None
    
    def __post_init__(self):
        if self.required_platforms is None:
            self.required_platforms = []


@dataclass
class Train:
    id: str
    train_number: int
    train_type: TrainType
    priority: TrainPriority
    capacity_passengers: int
    length_meters: float
    max_speed_kmh: float
    scheduled_departure: datetime
    scheduled_arrival: datetime
    origin_station: str
    destination_station: str
    route_sections: List[str]
    characteristics: Optional[TrainCharacteristics] = None
    
    def __post_init__(self):
        if self.characteristics is None:
            self.characteristics = TrainCharacteristics()


@dataclass
class Constraint:
    id: str
    type: ConstraintType
    priority: int  # 1 = highest, 10 = lowest
    parameters: Dict[str, str]
    is_hard_constraint: bool = True


@dataclass
class WeightedObjective:
    objective: ObjectiveType
    weight: float


@dataclass
class OptimizationObjective:
    primary_objective: ObjectiveType
    secondary_objectives: List[WeightedObjective] = None
    time_limit_seconds: float = 30.0
    enable_preprocessing: bool = True
    
    def __post_init__(self):
        if self.secondary_objectives is None:
            self.secondary_objectives = []


@dataclass
class OptimizationConfig:
    max_solver_time_seconds: int = 30
    enable_preprocessing: bool = True
    num_search_workers: int = 4
    strategy: str = "AUTOMATIC"
    enable_detailed_logging: bool = False


@dataclass
class DisruptionEvent:
    id: str
    type: str
    affected_section: str
    start_time: datetime
    end_time: datetime
    severity: int  # 1-10 scale
    metadata: Dict[str, str] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class OptimizationRequest:
    request_id: str
    section_id: str
    time_horizon_minutes: int
    trains: List[Train]
    constraints: List[Constraint]
    objective: OptimizationObjective
    disruptions: List[DisruptionEvent]
    requested_at: datetime
    config: OptimizationConfig


@dataclass
class SpeedProfilePoint:
    position_km: float
    speed_kmh: float
    time_offset_minutes: float


@dataclass
class TrainScheduleEntry:
    train_id: str
    train_number: int
    scheduled_departure: datetime
    scheduled_arrival: datetime
    platform: int
    priority_applied: TrainPriority
    delay_adjustment_minutes: int
    conflicts_resolved: List[str]
    speed_profile: List[SpeedProfilePoint]


@dataclass
class PerformanceMetrics:
    total_delay_minutes: float = 0.0
    average_delay_per_train: float = 0.0
    conflicts_resolved: int = 0
    throughput_trains_per_hour: float = 0.0
    utilization_percent: float = 0.0
    energy_consumption_kwh: float = 0.0
    platform_changes: int = 0
    passenger_waiting_time_minutes: float = 0.0


@dataclass
class AlternativeSchedule:
    name: str
    description: str
    schedule: List[TrainScheduleEntry]
    kpis: PerformanceMetrics
    trade_offs: str
    score: float


@dataclass
class OptimizationResponse:
    request_id: str
    status: OptimizationStatus
    optimized_schedule: List[TrainScheduleEntry]
    kpis: PerformanceMetrics
    reasoning: str
    confidence_score: float
    alternatives: List[AlternativeSchedule]
    execution_time_ms: int
    completed_at: datetime
    error_message: str = ""


# Simulation models
@dataclass
class ScheduleModification:
    type: str
    train_id: str
    parameters: Dict[str, str]


@dataclass
class WhatIfCondition:
    type: str
    parameters: Dict[str, str]
    impact_level: int  # 1-10 scale


@dataclass
class SimulationEvent:
    timestamp: datetime
    event_type: str
    train_id: str
    section_id: str
    description: str


@dataclass
class SimulationResults:
    total_trains_processed: int
    average_delay_minutes: float
    throughput_trains_per_hour: float
    conflicts_detected: int
    utilization_percent: float
    timeline_events: List[SimulationEvent]


@dataclass
class PerformanceComparison:
    baseline_delay_minutes: float
    scenario_delay_minutes: float
    improvement_percent: float
    baseline_throughput: float
    scenario_throughput: float
    throughput_improvement_percent: float


@dataclass
class SimulationRequest:
    request_id: str
    scenario_name: str
    section_id: str
    base_schedule: List[TrainScheduleEntry]
    modifications: List[ScheduleModification]
    what_if_conditions: List[WhatIfCondition]
    simulation_duration_hours: float


@dataclass
class SimulationResponse:
    request_id: str
    success: bool
    scenario_name: str
    simulation_results: SimulationResults
    performance_comparison: PerformanceComparison
    recommendations: List[str]
    error_message: str = ""


# Validation models
@dataclass
class ValidationError:
    error_code: str
    message: str
    train_id: str
    timestamp: Optional[datetime] = None


@dataclass
class ValidationWarning:
    warning_code: str
    message: str
    train_id: str


@dataclass
class ValidationRequest:
    request_id: str
    schedule: List[TrainScheduleEntry]
    constraints: List[Constraint]
    section_id: str


@dataclass
class ValidationResponse:
    request_id: str
    is_valid: bool
    errors: List[ValidationError]
    warnings: List[ValidationWarning]


# Status models
@dataclass
class StatusRequest:
    request_id: str


@dataclass
class StatusResponse:
    request_id: str
    status: str
    progress_percent: float
    current_phase: str
    estimated_completion_ms: int


# Utility functions for model conversion
class ModelConverter:
    """Utility class for converting between protobuf and Python models."""
    
    @staticmethod
    def protobuf_to_train(proto_train) -> Train:
        """Convert protobuf Train to Python Train model."""
        characteristics = None
        if hasattr(proto_train, 'characteristics') and proto_train.characteristics:
            characteristics = TrainCharacteristics(
                acceleration_ms2=proto_train.characteristics.acceleration_ms2,
                deceleration_ms2=proto_train.characteristics.deceleration_ms2,
                power_kw=proto_train.characteristics.power_kw,
                weight_tons=proto_train.characteristics.weight_tons,
                passenger_load_percent=proto_train.characteristics.passenger_load_percent,
                is_electric=proto_train.characteristics.is_electric,
                required_platforms=list(proto_train.characteristics.required_platforms)
            )
        
        return Train(
            id=proto_train.id,
            train_number=proto_train.train_number,
            train_type=TrainType(proto_train.train_type),
            priority=TrainPriority(proto_train.priority),
            capacity_passengers=proto_train.capacity_passengers,
            length_meters=proto_train.length_meters,
            max_speed_kmh=proto_train.max_speed_kmh,
            scheduled_departure=proto_train.scheduled_departure.ToDatetime(),
            scheduled_arrival=proto_train.scheduled_arrival.ToDatetime(),
            origin_station=proto_train.origin_station,
            destination_station=proto_train.destination_station,
            route_sections=list(proto_train.route_sections),
            characteristics=characteristics
        )
    
    @staticmethod
    def protobuf_to_constraint(proto_constraint) -> Constraint:
        """Convert protobuf Constraint to Python Constraint model."""
        return Constraint(
            id=proto_constraint.id,
            type=ConstraintType(proto_constraint.type),
            priority=proto_constraint.priority,
            parameters=dict(proto_constraint.parameters),
            is_hard_constraint=proto_constraint.is_hard_constraint
        )
    
    @staticmethod
    def train_to_protobuf(train: Train, proto_train):
        """Convert Python Train model to protobuf Train."""
        proto_train.id = train.id
        proto_train.train_number = train.train_number
        proto_train.train_type = train.train_type.value
        proto_train.priority = train.priority.value
        proto_train.capacity_passengers = train.capacity_passengers
        proto_train.length_meters = train.length_meters
        proto_train.max_speed_kmh = train.max_speed_kmh
        proto_train.scheduled_departure.FromDatetime(train.scheduled_departure)
        proto_train.scheduled_arrival.FromDatetime(train.scheduled_arrival)
        proto_train.origin_station = train.origin_station
        proto_train.destination_station = train.destination_station
        proto_train.route_sections.extend(train.route_sections)
        
        if train.characteristics:
            proto_train.characteristics.acceleration_ms2 = train.characteristics.acceleration_ms2
            proto_train.characteristics.deceleration_ms2 = train.characteristics.deceleration_ms2
            proto_train.characteristics.power_kw = train.characteristics.power_kw
            proto_train.characteristics.weight_tons = train.characteristics.weight_tons
            proto_train.characteristics.passenger_load_percent = train.characteristics.passenger_load_percent
            proto_train.characteristics.is_electric = train.characteristics.is_electric
            proto_train.characteristics.required_platforms.extend(train.characteristics.required_platforms)
