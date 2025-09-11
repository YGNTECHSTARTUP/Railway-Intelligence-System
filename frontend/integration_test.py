#!/usr/bin/env python3
"""
Complete Integration Test for Railway Optimization System
Tests the full pipeline: Frontend -> Backend -> Python Service
"""

import asyncio
import json
import logging
import requests
import grpc
from typing import Dict, Any
import sys
import os

# Add the proto path
sys.path.append('C:/Users/gagan/Desktop/Personal/SOA/SIH/railway-intelligence-system/optimizer/python_service')

# Try to import the protobuf classes
try:
    import proto.optimization_pb2 as optimization_pb2
    import proto.optimization_pb2_grpc as optimization_pb2_grpc
except ImportError as e:
    print(f"❌ Failed to import protobuf classes: {e}")
    print("Please make sure the Python service protobuf files are generated")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class OptimizationIntegrationTest:
    def __init__(self):
        self.backend_url = "http://localhost:8080"
        self.grpc_url = "localhost:50051"
        self.frontend_url = "http://localhost:3000"
        
    async def test_grpc_service(self) -> bool:
        """Test direct connection to Python gRPC service"""
        logger.info("🔌 Testing gRPC service connection...")
        
        try:
            # Create gRPC channel
            channel = grpc.insecure_channel(self.grpc_url)
            stub = optimization_pb2_grpc.OptimizationServiceStub(channel)
            
            # Create test request
            request = optimization_pb2.OptimizationRequest()
            request.request_id = "test-grpc-001"
            request.section_id = "SEC_001"
            request.time_horizon_minutes = 120
            request.objective = optimization_pb2.MINIMIZE_DELAY
            
            # Add mock train data
            train = request.trains.add()
            train.train_id = "T001"
            train.train_number = "12345"
            train.priority = optimization_pb2.HIGH
            train.delay_minutes = 5.0
            
            # Send request
            response = stub.OptimizeSchedule(request)
            
            if response.status == optimization_pb2.OPTIMAL:
                logger.info(f"✅ gRPC service working! Response: {response.request_id}")
                return True
            else:
                logger.error(f"❌ gRPC service returned error: {response.error_message}")
                return False
                
        except Exception as e:
            logger.error(f"❌ gRPC connection failed: {str(e)}")
            return False
    
    def test_backend_service(self) -> bool:
        """Test REST API connection to backend service"""
        logger.info("🌐 Testing backend service connection...")
        
        try:
            # Test health endpoint
            health_response = requests.get(f"{self.backend_url}/health", timeout=5)
            if health_response.status_code == 200:
                logger.info("✅ Backend health check passed")
                
                # Test optimization endpoint
                optimization_data = {
                    "section_id": "SEC_001",
                    "trains": [{
                        "train_id": "T001",
                        "train_number": "12345",
                        "current_station": "STN001",
                        "destination_station": "STN002",
                        "scheduled_departure": "2024-01-01T10:00:00Z",
                        "actual_departure": "2024-01-01T10:05:00Z",
                        "priority": "HIGH",
                        "status": "DELAYED",
                        "delay_minutes": 5,
                        "speed_kmh": 80.0
                    }],
                    "constraints": [],
                    "objective": "MinimizeDelay",
                    "time_horizon_minutes": 120
                }
                
                opt_response = requests.post(
                    f"{self.backend_url}/api/optimization/optimize",
                    json=optimization_data,
                    timeout=10
                )
                
                if opt_response.status_code == 200:
                    logger.info("✅ Backend optimization endpoint working!")
                    return True
                else:
                    logger.error(f"❌ Backend optimization failed: {opt_response.status_code}")
                    return False
            else:
                logger.error(f"❌ Backend health check failed: {health_response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Backend connection failed: {str(e)}")
            return False
    
    def test_frontend_availability(self) -> bool:
        """Test frontend availability"""
        logger.info("🖥️  Testing frontend availability...")
        
        try:
            response = requests.get(self.frontend_url, timeout=5)
            if response.status_code == 200:
                logger.info("✅ Frontend is accessible")
                return True
            else:
                logger.error(f"❌ Frontend not accessible: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Frontend connection failed: {str(e)}")
            return False
    
    async def run_complete_test(self):
        """Run complete integration test"""
        logger.info("🚀 Starting Complete Railway Optimization Integration Test")
        logger.info("=" * 60)
        
        results = {
            "grpc_service": False,
            "backend_service": False,
            "frontend_service": False
        }
        
        # Test each component
        results["grpc_service"] = await self.test_grpc_service()
        results["backend_service"] = self.test_backend_service()  
        results["frontend_service"] = self.test_frontend_availability()
        
        # Print summary
        logger.info("=" * 60)
        logger.info("🏁 Integration Test Results:")
        logger.info(f"  🐍 Python gRPC Service: {'✅ PASS' if results['grpc_service'] else '❌ FAIL'}")
        logger.info(f"  🦀 Rust Backend Service: {'✅ PASS' if results['backend_service'] else '❌ FAIL'}")
        logger.info(f"  ⚛️  React Frontend Service: {'✅ PASS' if results['frontend_service'] else '❌ FAIL'}")
        
        all_passed = all(results.values())
        
        if all_passed:
            logger.info("🎉 ALL SYSTEMS OPERATIONAL!")
            logger.info("💫 The Railway Optimization Dashboard is ready!")
            logger.info(f"🌐 Access it at: {self.frontend_url}/optimization")
        else:
            logger.error("⚠️  Some components are not working properly")
            logger.error("Please check the failed services and restart them")
        
        return all_passed

def main():
    """Main function to run the integration test"""
    print("""
╔══════════════════════════════════════════════════════╗
║        🚂 Railway Intelligence System                ║  
║           Integration Test Suite                     ║
╠══════════════════════════════════════════════════════╣
║  Testing: Frontend ↔ Backend ↔ Python Service       ║
║  Components: React + Rust + Python + gRPC           ║
╚══════════════════════════════════════════════════════╝
    """)
    
    test_suite = OptimizationIntegrationTest()
    
    try:
        result = asyncio.run(test_suite.run_complete_test())
        if result:
            print("\n🎊 Integration test completed successfully!")
            print("🚀 You can now access the optimization dashboard!")
        else:
            print("\n🔧 Please fix the failing services and try again")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"❌ Test suite failed with error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
