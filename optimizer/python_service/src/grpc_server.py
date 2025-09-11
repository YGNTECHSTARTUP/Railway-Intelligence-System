"""
gRPC server implementation for the Python optimization service.
Exposes OR-Tools optimization capabilities to the Rust backend.
"""

import asyncio
import logging
from concurrent import futures
from typing import Dict, Any
import grpc
from datetime import datetime

# Import generated protobuf classes
import optimization_pb2
import optimization_pb2_grpc

# Import models and optimization engine
from models import (
    OptimizationRequest, OptimizationResponse, OptimizationStatus,
    SimulationRequest, SimulationResponse, ValidationRequest, ValidationResponse,
    StatusRequest, StatusResponse, Train, TrainType, TrainPriority, 
    OptimizationObjective, ObjectiveType, OptimizationConfig,
    SimulationResults, PerformanceComparison, ValidationError, PerformanceMetrics
)
from optimization_engine import OptimizationEngine

logger = logging.getLogger(__name__)


class OptimizationServiceImpl:
    """
    Implementation of the OptimizationService gRPC service.
    """
    
    def __init__(self):
        self.optimization_engine = OptimizationEngine()
        self.active_requests: Dict[str, Dict[str, Any]] = {}
        
    async def OptimizeSchedule(self, request, context):
        """
        Main optimization endpoint that schedules trains using OR-Tools.
        
        Args:
            request: OptimizationRequest protobuf message
            context: gRPC context
            
        Returns:
            OptimizationResponse protobuf message
        """
        try:
            # Convert protobuf to Python models
            optimization_request = self._convert_optimization_request(request)
            
            # Track active request
            self.active_requests[request.request_id] = {
                'status': 'PROCESSING',
                'start_time': datetime.utcnow(),
                'progress': 0.0,
                'phase': 'Model Building'
            }
            
            logger.info(f"Starting optimization for request {request.request_id}")
            
            # Update progress
            self.active_requests[request.request_id]['progress'] = 25.0
            self.active_requests[request.request_id]['phase'] = 'Constraint Programming'
            
            # Perform optimization
            response = self.optimization_engine.optimize_schedule(optimization_request)
            
            # Update progress
            self.active_requests[request.request_id]['progress'] = 100.0
            self.active_requests[request.request_id]['phase'] = 'Completed'
            self.active_requests[request.request_id]['status'] = 'COMPLETED'
            
            # Convert back to protobuf
            proto_response = self._convert_optimization_response(response)
            
            logger.info(f"Optimization completed for request {request.request_id}")
            return proto_response
            
        except Exception as e:
            logger.error(f"Optimization failed for request {request.request_id}: {str(e)}")
            
            # Update request status
            if request.request_id in self.active_requests:
                self.active_requests[request.request_id]['status'] = 'FAILED'
                self.active_requests[request.request_id]['error'] = str(e)
            
            # Return error response
            error_response = self._create_error_response(request.request_id, str(e))
            return self._convert_optimization_response(error_response)
    
    async def SimulateScenario(self, request, context):
        """
        Simulation endpoint for what-if scenario analysis.
        
        Args:
            request: SimulationRequest protobuf message
            context: gRPC context
            
        Returns:
            SimulationResponse protobuf message
        """
        try:
            logger.info(f"Starting simulation for scenario {request.scenario_name}")
            
            # Convert protobuf to Python models
            simulation_request = self._convert_simulation_request(request)
            
            # Perform simulation (using optimization engine)
            simulation_response = await self._perform_simulation(simulation_request)
            
            # Convert back to protobuf
            proto_response = self._convert_simulation_response(simulation_response)
            
            logger.info(f"Simulation completed for scenario {request.scenario_name}")
            return proto_response
            
        except Exception as e:
            logger.error(f"Simulation failed for scenario {request.scenario_name}: {str(e)}")
            error_response = self._create_simulation_error_response(request.request_id, str(e))
            return self._convert_simulation_response(error_response)
    
    async def ValidateSchedule(self, request, context):
        """
        Validation endpoint to check schedule feasibility.
        
        Args:
            request: ValidationRequest protobuf message
            context: gRPC context
            
        Returns:
            ValidationResponse protobuf message
        """
        try:
            logger.info(f"Validating schedule for request {request.request_id}")
            
            # Convert and validate
            validation_request = self._convert_validation_request(request)
            validation_response = self._perform_validation(validation_request)
            
            # Convert back to protobuf
            proto_response = self._convert_validation_response(validation_response)
            
            return proto_response
            
        except Exception as e:
            logger.error(f"Validation failed for request {request.request_id}: {str(e)}")
            # Return validation error response
            return self._create_validation_error_response(request.request_id, str(e))
    
    async def GetOptimizationStatus(self, request, context):
        """
        Status endpoint to check optimization progress.
        
        Args:
            request: StatusRequest protobuf message
            context: gRPC context
            
        Returns:
            StatusResponse protobuf message
        """
        request_id = request.request_id
        
        if request_id in self.active_requests:
            request_info = self.active_requests[request_id]
            
            # Calculate estimated completion time
            if request_info['status'] == 'PROCESSING':
                elapsed_time = (datetime.utcnow() - request_info['start_time']).total_seconds()
                progress = request_info['progress']
                if progress > 0:
                    estimated_total_time = elapsed_time / (progress / 100)
                    estimated_remaining = max(0, estimated_total_time - elapsed_time)
                else:
                    estimated_remaining = 30  # Default estimate
            else:
                estimated_remaining = 0
            
            status_response = StatusResponse(
                request_id=request_id,
                status=request_info['status'],
                progress_percent=request_info['progress'],
                current_phase=request_info['phase'],
                estimated_completion_ms=int(estimated_remaining * 1000)
            )
        else:
            # Request not found
            status_response = StatusResponse(
                request_id=request_id,
                status='NOT_FOUND',
                progress_percent=0.0,
                current_phase='Unknown',
                estimated_completion_ms=0
            )
        
        return self._convert_status_response(status_response)
    
    def _convert_optimization_request(self, proto_request) -> OptimizationRequest:
        """Convert protobuf OptimizationRequest to Python model."""
        # This would use the ModelConverter to convert from protobuf
        # For now, create a mock conversion
        
        trains = []
        # trains = [ModelConverter.protobuf_to_train(t) for t in proto_request.trains]
        
        constraints = []
        # constraints = [ModelConverter.protobuf_to_constraint(c) for c in proto_request.constraints]
        
        # Mock conversion for development
        from .models import Train, TrainType, TrainPriority, OptimizationObjective, ObjectiveType, OptimizationConfig
        
        # Create mock data based on protobuf structure
        mock_train = Train(
            id="T001",
            train_number=12345,
            train_type=TrainType.EXPRESS,
            priority=TrainPriority.EXPRESS,
            capacity_passengers=500,
            length_meters=200.0,
            max_speed_kmh=120.0,
            scheduled_departure=datetime.utcnow(),
            scheduled_arrival=datetime.utcnow(),
            origin_station="StationA",
            destination_station="StationB",
            route_sections=["S1", "S2", "S3"]
        )
        
        mock_objective = OptimizationObjective(
            primary_objective=ObjectiveType.MINIMIZE_DELAY
        )
        
        mock_config = OptimizationConfig()
        
        return OptimizationRequest(
            request_id=proto_request.request_id if hasattr(proto_request, 'request_id') else "REQ001",
            section_id="SEC001",
            time_horizon_minutes=120,
            trains=[mock_train],
            constraints=[],
            objective=mock_objective,
            disruptions=[],
            requested_at=datetime.utcnow(),
            config=mock_config
        )
    
    def _convert_optimization_response(self, response: OptimizationResponse):
        """Convert Python OptimizationResponse to protobuf."""
        # This would convert back to protobuf format
        # For now, return a mock protobuf-like object
        
        class MockProtoResponse:
            def __init__(self, response):
                self.request_id = response.request_id
                self.status = response.status.value
                self.execution_time_ms = response.execution_time_ms
                self.error_message = response.error_message
                # Add other fields as needed
        
        return MockProtoResponse(response)
    
    def _convert_simulation_request(self, proto_request) -> SimulationRequest:
        """Convert protobuf SimulationRequest to Python model."""
        # Mock conversion for development
        return SimulationRequest(
            request_id=getattr(proto_request, 'request_id', 'SIM001'),
            scenario_name=getattr(proto_request, 'scenario_name', 'Test Scenario'),
            section_id="SEC001",
            base_schedule=[],
            modifications=[],
            what_if_conditions=[],
            simulation_duration_hours=2.0
        )
    
    def _convert_simulation_response(self, response: SimulationResponse):
        """Convert Python SimulationResponse to protobuf."""
        class MockSimulationResponse:
            def __init__(self, response):
                self.request_id = response.request_id
                self.success = response.success
                self.scenario_name = response.scenario_name
                self.error_message = response.error_message
        
        return MockSimulationResponse(response)
    
    def _convert_validation_request(self, proto_request) -> ValidationRequest:
        """Convert protobuf ValidationRequest to Python model."""
        return ValidationRequest(
            request_id=getattr(proto_request, 'request_id', 'VAL001'),
            schedule=[],
            constraints=[],
            section_id="SEC001"
        )
    
    def _convert_validation_response(self, response: ValidationResponse):
        """Convert Python ValidationResponse to protobuf."""
        class MockValidationResponse:
            def __init__(self, response):
                self.request_id = response.request_id
                self.is_valid = response.is_valid
                self.error_count = len(response.errors)
                self.warning_count = len(response.warnings)
        
        return MockValidationResponse(response)
    
    def _convert_status_response(self, response: StatusResponse):
        """Convert Python StatusResponse to protobuf."""
        class MockStatusResponse:
            def __init__(self, response):
                self.request_id = response.request_id
                self.status = response.status
                self.progress_percent = response.progress_percent
                self.current_phase = response.current_phase
                self.estimated_completion_ms = response.estimated_completion_ms
        
        return MockStatusResponse(response)
    
    async def _perform_simulation(self, request: SimulationRequest) -> SimulationResponse:
        """Perform scenario simulation."""
        # Mock simulation for now
        from .models import SimulationResults, PerformanceComparison
        
        mock_results = SimulationResults(
            total_trains_processed=10,
            average_delay_minutes=8.5,
            throughput_trains_per_hour=12.0,
            conflicts_detected=2,
            utilization_percent=85.0,
            timeline_events=[]
        )
        
        mock_comparison = PerformanceComparison(
            baseline_delay_minutes=15.0,
            scenario_delay_minutes=8.5,
            improvement_percent=43.3,
            baseline_throughput=10.0,
            scenario_throughput=12.0,
            throughput_improvement_percent=20.0
        )
        
        return SimulationResponse(
            request_id=request.request_id,
            success=True,
            scenario_name=request.scenario_name,
            simulation_results=mock_results,
            performance_comparison=mock_comparison,
            recommendations=[
                "Consider implementing dynamic platform assignment",
                "Optimize signal timing for peak hours",
                "Add buffer time for high-priority trains"
            ],
            error_message=""
        )
    
    def _perform_validation(self, request: ValidationRequest) -> ValidationResponse:
        """Perform schedule validation."""
        # Mock validation for now
        return ValidationResponse(
            request_id=request.request_id,
            is_valid=True,
            errors=[],
            warnings=[]
        )
    
    def _create_error_response(self, request_id: str, error_msg: str) -> OptimizationResponse:
        """Create error response for optimization failures."""
        from .models import PerformanceMetrics
        
        return OptimizationResponse(
            request_id=request_id,
            status=OptimizationStatus.ERROR,
            optimized_schedule=[],
            kpis=PerformanceMetrics(),
            reasoning="",
            confidence_score=0.0,
            alternatives=[],
            execution_time_ms=0,
            completed_at=datetime.utcnow(),
            error_message=error_msg
        )
    
    def _create_simulation_error_response(self, request_id: str, error_msg: str) -> SimulationResponse:
        """Create error response for simulation failures."""
        from .models import SimulationResults, PerformanceComparison
        
        return SimulationResponse(
            request_id=request_id,
            success=False,
            scenario_name="",
            simulation_results=SimulationResults(0, 0, 0, 0, 0, []),
            performance_comparison=PerformanceComparison(0, 0, 0, 0, 0, 0),
            recommendations=[],
            error_message=error_msg
        )
    
    def _create_validation_error_response(self, request_id: str, error_msg: str):
        """Create error response for validation failures."""
        from .models import ValidationError
        
        class MockValidationErrorResponse:
            def __init__(self, request_id, error_msg):
                self.request_id = request_id
                self.is_valid = False
                self.error_count = 1
                self.error_message = error_msg
        
        return MockValidationErrorResponse(request_id, error_msg)


class OptimizationServer:
    """
    Main gRPC server for the optimization service.
    """
    
    def __init__(self, port: int = 50051):
        self.port = port
        self.server = None
        self.service_impl = OptimizationServiceImpl()
    
    async def start_server(self):
        """Start the gRPC server."""
        self.server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
        
        # Add the service implementation
        # optimization_pb2_grpc.add_OptimizationServiceServicer_to_server(
        #     self.service_impl, self.server
        # )
        
        # Add insecure port
        listen_addr = f'[::]:{self.port}'
        self.server.add_insecure_port(listen_addr)
        
        logger.info(f"Starting optimization server on {listen_addr}")
        await self.server.start()
        
        try:
            await self.server.wait_for_termination()
        except KeyboardInterrupt:
            logger.info("Server interrupted by user")
        finally:
            await self.stop_server()
    
    async def stop_server(self):
        """Stop the gRPC server gracefully."""
        if self.server:
            logger.info("Stopping optimization server...")
            await self.server.stop(grace=5)
            logger.info("Optimization server stopped")
    
    def start_server_sync(self):
        """Start the server synchronously."""
        asyncio.run(self.start_server())


class HealthCheckServiceImpl:
    """Health check service implementation."""
    
    async def Check(self, request, context):
        """Health check endpoint."""
        # Mock health check response
        class MockHealthResponse:
            def __init__(self):
                self.status = "SERVING"
        
        return MockHealthResponse()


def create_server_with_health_check(port: int = 50051) -> OptimizationServer:
    """
    Create optimization server with health check capability.
    
    Args:
        port: Port number for the server
        
    Returns:
        OptimizationServer instance
    """
    server = OptimizationServer(port)
    
    # Add health check service
    health_service = HealthCheckServiceImpl()
    
    # In a real implementation, you would add the health service:
    # grpc_health.add_HealthServicer_to_server(health_service, server.server)
    
    return server


def main():
    """Main entry point for the optimization service."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger.info("Railway Optimization Service starting...")
    
    try:
        # Create and start server
        server = create_server_with_health_check(port=50051)
        server.start_server_sync()
        
    except Exception as e:
        logger.error(f"Failed to start optimization service: {str(e)}")
        raise


if __name__ == "__main__":
    main()
