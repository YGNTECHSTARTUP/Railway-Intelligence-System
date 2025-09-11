"""
Simple gRPC server for testing the Railway Optimization Service.
This is a minimal implementation to get the service running.
"""

import asyncio
import logging
from concurrent import futures
import grpc
from datetime import datetime
import time

# Import generated protobuf classes
import optimization_pb2
import optimization_pb2_grpc

logger = logging.getLogger(__name__)


class SimpleOptimizationService(optimization_pb2_grpc.OptimizationServiceServicer):
    """
    Simple implementation of the OptimizationService gRPC service.
    """
    
    def __init__(self):
        self.active_requests = {}
        logger.info("🚂 Simple Optimization Service initialized")
    
    def OptimizeSchedule(self, request, context):
        """Handle optimization requests with mock responses."""
        try:
            logger.info(f"📊 Processing optimization request: {request.request_id}")
            
            # Simulate some processing time
            time.sleep(0.5)
            
            # Create mock response
            response = optimization_pb2.OptimizationResponse()
            response.request_id = request.request_id
            response.status = optimization_pb2.OPTIMAL
            response.reasoning = "Mock optimization completed successfully"
            response.confidence_score = 0.95
            response.execution_time_ms = 500
            response.error_message = ""
            
            # Add mock performance metrics
            response.kpis.total_delay_minutes = 12.5
            response.kpis.average_delay_per_train = 2.1
            response.kpis.conflicts_resolved = 3
            response.kpis.throughput_trains_per_hour = 15.0
            response.kpis.utilization_percent = 87.5
            
            logger.info(f"✅ Optimization completed for request: {request.request_id}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Optimization failed: {str(e)}")
            response = optimization_pb2.OptimizationResponse()
            response.request_id = request.request_id
            response.status = optimization_pb2.ERROR
            response.error_message = str(e)
            return response
    
    def SimulateScenario(self, request, context):
        """Handle simulation requests with mock responses."""
        try:
            logger.info(f"🎭 Processing simulation: {request.scenario_name}")
            
            # Simulate processing
            time.sleep(0.3)
            
            response = optimization_pb2.SimulationResponse()
            response.request_id = request.request_id
            response.success = True
            response.scenario_name = request.scenario_name
            response.error_message = ""
            
            # Add mock simulation results
            response.simulation_results.total_trains_processed = 25
            response.simulation_results.average_delay_minutes = 6.2
            response.simulation_results.throughput_trains_per_hour = 18.0
            response.simulation_results.conflicts_detected = 1
            response.simulation_results.utilization_percent = 92.0
            
            # Add mock performance comparison
            response.performance_comparison.baseline_delay_minutes = 12.0
            response.performance_comparison.scenario_delay_minutes = 6.2
            response.performance_comparison.improvement_percent = 48.3
            
            response.recommendations.append("Implement smart signal coordination")
            response.recommendations.append("Consider adding express lanes")
            
            logger.info(f"✅ Simulation completed: {request.scenario_name}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Simulation failed: {str(e)}")
            response = optimization_pb2.SimulationResponse()
            response.request_id = request.request_id
            response.success = False
            response.error_message = str(e)
            return response
    
    def ValidateSchedule(self, request, context):
        """Handle validation requests with mock responses."""
        try:
            logger.info(f"🔍 Validating schedule: {request.request_id}")
            
            response = optimization_pb2.ValidationResponse()
            response.request_id = request.request_id
            response.is_valid = True
            
            logger.info(f"✅ Validation completed: {request.request_id}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Validation failed: {str(e)}")
            response = optimization_pb2.ValidationResponse()
            response.request_id = request.request_id
            response.is_valid = False
            return response
    
    def GetOptimizationStatus(self, request, context):
        """Handle status requests."""
        try:
            logger.info(f"📈 Status check: {request.request_id}")
            
            response = optimization_pb2.StatusResponse()
            response.request_id = request.request_id
            response.status = optimization_pb2.COMPLETED
            response.progress_percent = 100.0
            response.current_phase = "Ready"
            response.estimated_completion_ms = 0
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Status check failed: {str(e)}")
            response = optimization_pb2.StatusResponse()
            response.request_id = request.request_id
            response.status = optimization_pb2.FAILED
            return response


def serve():
    """Start the gRPC server."""
    port = "50051"
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    
    # Add the service to the server
    optimization_pb2_grpc.add_OptimizationServiceServicer_to_server(
        SimpleOptimizationService(), server
    )
    
    # Add insecure port
    listen_addr = f'[::]:{port}'
    server.add_insecure_port(listen_addr)
    
    # Start the server
    server.start()
    
    print(f"""
🚀 Railway Optimization Service Started!
┌─────────────────────────────────────────┐
│  🌐 Server Address: {listen_addr:<20} │
│  📊 Status: READY                       │
│  🔧 Mode: Development                   │
│  🎯 Services: 4 endpoints available     │
└─────────────────────────────────────────┘

📡 Available gRPC Services:
  • OptimizeSchedule     - Train schedule optimization
  • SimulateScenario     - What-if scenario analysis  
  • ValidateSchedule     - Schedule validation
  • GetOptimizationStatus - Request status tracking

🛑 Press Ctrl+C to stop the server
""")
    
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down server...")
        server.stop(grace=5)
        print("✅ Server stopped gracefully")


if __name__ == '__main__':
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger.info("🚆 Starting Railway Intelligence Optimization Service...")
    serve()
