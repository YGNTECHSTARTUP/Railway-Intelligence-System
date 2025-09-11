# Railway Intelligence System - OR-Tools Optimization Service

This directory contains the Python-based optimization service that uses Google OR-Tools for advanced railway scheduling optimization. The service communicates with the Rust backend via gRPC.

## Architecture Overview

```
┌─────────────────┐    gRPC     ┌──────────────────────┐
│   Rust Backend  │ ◄─────────► │  Python Optimizer   │
│   (Web API)     │             │   (OR-Tools)        │
└─────────────────┘             └──────────────────────┘
```

## Features

### Core Optimization Capabilities
- **Constraint Programming**: Uses OR-Tools CP-SAT solver for railway scheduling
- **Multi-Objective Optimization**: Support for various optimization goals:
  - Minimize train delays
  - Maximize throughput
  - Minimize energy consumption
  - Balanced optimization
  - Minimize conflicts

### Railway-Specific Constraints
- **Safety Distance**: Minimum time separation between trains
- **Platform Capacity**: Station platform capacity limits
- **Train Priority**: Priority-based scheduling (Emergency > Express > Mail > Passenger > Freight)
- **Maintenance Windows**: Avoid scheduling during maintenance
- **Speed Limits**: Section-specific speed restrictions
- **Signal Spacing**: Minimum headway between trains
- **Energy Efficiency**: Power consumption optimization
- **Passenger Transfers**: Connection time requirements

### Advanced Features
- **Real-time Optimization**: Dynamic rescheduling based on disruptions
- **What-if Simulation**: Scenario analysis for planning
- **Performance Metrics**: Comprehensive KPIs and analytics
- **Alternative Solutions**: Multiple optimal solutions with trade-offs
- **Conflict Resolution**: Automatic detection and resolution of scheduling conflicts

## Quick Start

### Prerequisites
- Python 3.8+
- OR-Tools 9.7+
- gRPC tools
- Docker (optional)

### Installation

1. **Install Python dependencies:**
```bash
cd optimizer/python_service
pip install -r requirements.txt
```

2. **Generate gRPC code from protobuf:**
```bash
python -m grpc_tools.protoc -I./proto --python_out=./src --grpc_python_out=./src proto/optimization.proto
```

3. **Install the package:**
```bash
pip install -e .
```

### Running the Service

#### Local Development
```bash
cd optimizer/python_service
python -m src.grpc_server
```

#### Using Docker
```bash
# Build and run with Docker Compose
docker-compose up optimizer
```

The service will start on port **50051** by default.

## Usage Examples

### Basic Optimization Request

```python
from datetime import datetime, timedelta
from src.models import *

# Create trains
trains = [
    Train(
        id="T001",
        train_number=12345,
        train_type=TrainType.EXPRESS,
        priority=TrainPriority.EXPRESS,
        capacity_passengers=500,
        scheduled_departure=datetime.utcnow(),
        scheduled_arrival=datetime.utcnow() + timedelta(hours=2),
        origin_station="Mumbai",
        destination_station="Delhi",
        route_sections=["S1", "S2", "S3"]
    )
]

# Create optimization request
request = OptimizationRequest(
    request_id="OPT_001",
    section_id="WESTERN_RAILWAY",
    time_horizon_minutes=120,
    trains=trains,
    constraints=[],
    objective=OptimizationObjective(
        primary_objective=ObjectiveType.MINIMIZE_DELAY
    ),
    disruptions=[],
    requested_at=datetime.utcnow(),
    config=OptimizationConfig()
)

# Optimize
engine = OptimizationEngine()
response = engine.optimize_schedule(request)
```

### Constraint Programming Example

```python
# Add safety and capacity constraints
constraints = [
    Constraint(
        id="safety_headway",
        type=ConstraintType.SAFETY_DISTANCE,
        priority=1,
        parameters={"min_distance_seconds": "300"},  # 5 minutes
        is_hard_constraint=True
    ),
    Constraint(
        id="platform_limit",
        type=ConstraintType.PLATFORM_CAPACITY,
        priority=2,
        parameters={"station_id": "Mumbai", "max_trains_per_platform": "1"},
        is_hard_constraint=True
    )
]

request.constraints = constraints
```

### Multi-Objective Optimization

```python
# Balanced optimization with multiple objectives
objective = OptimizationObjective(
    primary_objective=ObjectiveType.BALANCED_OPTIMAL,
    secondary_objectives=[
        WeightedObjective(ObjectiveType.MINIMIZE_DELAY, 0.4),
        WeightedObjective(ObjectiveType.MAXIMIZE_THROUGHPUT, 0.3),
        WeightedObjective(ObjectiveType.MINIMIZE_ENERGY_CONSUMPTION, 0.3)
    ],
    time_limit_seconds=60.0
)

request.objective = objective
```

## Configuration

### Environment Variables
- `GRPC_PORT`: gRPC server port (default: 50051)
- `LOG_LEVEL`: Logging level (default: INFO)
- `PYTHONPATH`: Python path for imports

### Solver Configuration
```python
config = OptimizationConfig(
    max_solver_time_seconds=30,      # Time limit for optimization
    enable_preprocessing=True,        # Enable OR-Tools preprocessing
    num_search_workers=4,            # Parallel search workers
    strategy="AUTOMATIC",            # Search strategy
    enable_detailed_logging=False    # Detailed solver logs
)
```

## Performance Tuning

### Solver Parameters
- **Time Limits**: Adjust `max_solver_time_seconds` based on problem complexity
- **Search Workers**: Use `num_search_workers` for parallel processing
- **Search Strategy**: Choose between AUTOMATIC, FIXED_SEARCH, PORTFOLIO_SEARCH

### Constraint Optimization
- **Hard vs Soft Constraints**: Use `is_hard_constraint` to prioritize critical constraints
- **Constraint Priorities**: Set priorities 1-10 for constraint enforcement order
- **Preprocessing**: Enable for faster solving on large problems

### Memory Management
- **Large Problems**: Use streaming for problems with 100+ trains
- **Time Horizons**: Limit to 2-4 hours for real-time optimization
- **Variable Bounds**: Set tight bounds on decision variables

## Integration with Rust Backend

The Python service communicates with the Rust backend via gRPC:

### Rust Client Usage
```rust
use railway_backend::services::{OptimizationService, GrpcClientConfig};

// Configure gRPC client
let config = GrpcClientConfig {
    endpoint: "http://localhost:50051".to_string(),
    timeout_seconds: 30,
    max_retries: 3,
    retry_delay_ms: 1000,
};

// Create service with gRPC integration
let optimization_service = OptimizationService::with_config(config);

// Use the service
let response = optimization_service.optimize_schedule(request).await?;
```

### Environment Configuration
Set these environment variables in your Rust backend:
```bash
OPTIMIZER_ENDPOINT=http://localhost:50051
OPTIMIZER_TIMEOUT_SECONDS=30
OPTIMIZER_MAX_RETRIES=3
OPTIMIZER_RETRY_DELAY_MS=1000
```

## Testing

### Python Tests
```bash
cd optimizer/python_service
pytest tests/ -v
```

### Rust Integration Tests
```bash
cd backend
cargo test optimization_integration_tests
```

### End-to-End Testing
```bash
# Start the full stack
docker-compose up

# Run API tests
curl -X POST http://localhost:8080/api/optimization/schedule \
  -H "Content-Type: application/json" \
  -d @test_data/sample_optimization_request.json
```

## Monitoring and Observability

### Metrics
The optimization service provides metrics for:
- Optimization execution time
- Solution quality scores
- Constraint satisfaction rates
- Resource utilization
- Error rates

### Logging
Structured logging with configurable levels:
- `DEBUG`: Detailed solver progress
- `INFO`: Request/response summaries
- `WARN`: Fallback scenarios
- `ERROR`: Optimization failures

### Health Checks
- gRPC service health endpoint
- OR-Tools solver availability
- Memory and CPU monitoring

## Deployment

### Docker Deployment
```bash
# Build and deploy
docker-compose up -d optimizer

# Check logs
docker-compose logs -f optimizer

# Scale for high load
docker-compose up -d --scale optimizer=3
```

### Production Configuration
- Use `SolverStrategy.PORTFOLIO_SEARCH` for robust solutions
- Set appropriate time limits (30-60 seconds)
- Enable monitoring and alerting
- Configure log rotation and retention

## Troubleshooting

### Common Issues

1. **Infeasible Solutions**
   - Check constraint conflicts
   - Reduce constraint strictness
   - Increase time horizon

2. **Slow Performance**
   - Reduce problem size
   - Adjust solver time limits
   - Use preprocessing

3. **gRPC Connection Issues**
   - Verify network connectivity
   - Check port accessibility
   - Review firewall settings

### Debug Mode
```python
# Enable detailed logging
config = OptimizationConfig(
    enable_detailed_logging=True,
    max_solver_time_seconds=60
)

# Check solver statistics
print(f"Solver status: {solver.StatusName()}")
print(f"Objective value: {solver.ObjectiveValue()}")
print(f"Solve time: {solver.WallTime()}")
```

## Contributing

### Adding New Constraints
1. Add constraint type to `ConstraintType` enum in `optimization.proto`
2. Implement constraint logic in `constraint_models.py`
3. Register in `ConstraintBuilder.constraint_registry`
4. Add tests in `test_constraint_models.py`

### Adding New Objectives
1. Add objective type to `ObjectiveType` enum
2. Implement objective builder in `objectives.py`
3. Register in `ObjectiveManager.objective_builders`
4. Add tests and documentation

## License

This project is part of the Railway Intelligence System developed for Smart India Hackathon.

## Support

For technical support or questions:
- Check the troubleshooting section
- Review logs for error details
- Test with simplified scenarios
- Verify OR-Tools installation
