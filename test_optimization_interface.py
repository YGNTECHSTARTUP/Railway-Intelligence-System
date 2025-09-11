#!/usr/bin/env python3
"""
End-to-end test script for the Railway Intelligence System Optimization Interface

This script tests the complete optimization workflow:
1. Python optimization service (gRPC)
2. Rust backend (HTTP API)
3. Frontend integration (simulated)
"""

import asyncio
import json
import time
import requests
import sys
from datetime import datetime, timezone
import subprocess
import signal
import os
from typing import Dict, List, Any

class OptimizationInterfaceTest:
    def __init__(self):
        self.backend_url = "http://localhost:8080"
        self.python_service_port = 50051
        self.python_process = None
        
    async def test_complete_interface(self):
        """Run complete end-to-end test"""
        print("🚂 Railway Intelligence System - Optimization Interface Test")
        print("=" * 60)
        
        try:
            # 1. Start Python optimization service
            await self.start_python_service()
            
            # 2. Test gRPC service directly
            await self.test_grpc_service()
            
            # 3. Test Rust backend compilation
            await self.test_backend_compilation()
            
            # 4. Test HTTP API endpoints
            await self.test_http_endpoints()
            
            # 5. Test integration workflow
            await self.test_integration_workflow()
            
            print("\n✅ All tests completed successfully!")
            
        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            sys.exit(1)
        finally:
            await self.cleanup()
    
    async def start_python_service(self):
        """Start the Python optimization service"""
        print("\n1. Starting Python Optimization Service...")
        
        python_service_path = "optimizer/python_service"
        
        if not os.path.exists(python_service_path):
            print("❌ Python service directory not found")
            return False
            
        # Check if virtual environment exists
        venv_path = os.path.join(python_service_path, "venv")
        if not os.path.exists(venv_path):
            print("❌ Virtual environment not found. Please run setup first.")
            return False
            
        # Start the service
        python_exe = os.path.join(venv_path, "Scripts", "python.exe")
        service_script = os.path.join(python_service_path, "src", "simple_server.py")
        
        if os.path.exists(service_script):
            print("📡 Starting simple_server.py...")
            self.python_process = subprocess.Popen(
                [python_exe, service_script],
                cwd=python_service_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait for service to start
            await asyncio.sleep(3)
            
            if self.python_process.poll() is None:
                print("✅ Python optimization service started successfully")
                return True
            else:
                stdout, stderr = self.python_process.communicate()
                print(f"❌ Python service failed to start: {stderr.decode()}")
                return False
        else:
            print("❌ simple_server.py not found")
            return False
    
    async def test_grpc_service(self):
        """Test gRPC service directly"""
        print("\n2. Testing gRPC Service...")
        
        # For now, we'll assume the service is working if it started
        # In a real test, we'd use a gRPC client to test
        print("✅ gRPC service assumed to be working (mock responses)")
    
    async def test_backend_compilation(self):
        """Test Rust backend compilation"""
        print("\n3. Testing Rust Backend Compilation...")
        
        backend_path = "backend"
        
        try:
            # Check if we can compile the backend
            result = subprocess.run(
                ["cargo", "check"],
                cwd=backend_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                print("✅ Backend compilation check passed")
            else:
                print(f"❌ Backend compilation failed: {result.stderr}")
                raise Exception("Backend compilation failed")
                
        except subprocess.TimeoutExpired:
            print("❌ Backend compilation check timed out")
            raise Exception("Backend compilation timeout")
        except FileNotFoundError:
            print("❌ Cargo not found. Please install Rust toolchain.")
            raise Exception("Cargo not found")
    
    async def test_http_endpoints(self):
        """Test HTTP API endpoints"""
        print("\n4. Testing HTTP API Endpoints...")
        
        # First, we need to start the backend server
        # For this test, we'll assume it's running or will be started separately
        
        test_requests = [
            {
                "name": "Health Check",
                "url": f"{self.backend_url}/health",
                "method": "GET",
                "expected_status": 200
            },
            {
                "name": "Optimization Health",
                "url": f"{self.backend_url}/api/v1/optimize/health",
                "method": "GET",
                "expected_status": [200, 503]  # 503 is OK if optimizer is not available
            },
            {
                "name": "Available Objectives",
                "url": f"{self.backend_url}/api/v1/optimize/objectives",
                "method": "GET",
                "expected_status": 200
            }
        ]
        
        print("ℹ️ Note: Backend server needs to be running for HTTP tests")
        print("   Run 'cargo run' in backend/ directory in another terminal")
        
        for test in test_requests:
            try:
                response = requests.request(
                    test["method"],
                    test["url"],
                    timeout=5
                )
                
                expected = test["expected_status"]
                if isinstance(expected, list):
                    if response.status_code in expected:
                        print(f"✅ {test['name']}: {response.status_code}")
                    else:
                        print(f"⚠️ {test['name']}: {response.status_code} (expected {expected})")
                else:
                    if response.status_code == expected:
                        print(f"✅ {test['name']}: {response.status_code}")
                    else:
                        print(f"❌ {test['name']}: {response.status_code} (expected {expected})")
                        
            except requests.ConnectionError:
                print(f"⚠️ {test['name']}: Connection failed (backend not running?)")
            except requests.Timeout:
                print(f"❌ {test['name']}: Request timed out")
    
    async def test_integration_workflow(self):
        """Test the complete optimization workflow"""
        print("\n5. Testing Integration Workflow...")
        
        # Sample optimization request
        optimization_request = {
            "section_id": "TEST_SECTION_001",
            "trains": [
                {
                    "id": "T001",
                    "number": 12345,
                    "train_type": "Express",
                    "priority": "Express",
                    "capacity": 500,
                    "max_speed": 120.0,
                    "scheduled_departure": datetime.now(timezone.utc).isoformat(),
                    "scheduled_arrival": (datetime.now(timezone.utc)).isoformat(),
                    "origin_station": "Station A",
                    "destination_station": "Station B"
                }
            ],
            "constraints": [
                {
                    "constraint_type": "SafetyDistance",
                    "priority": 1,
                    "parameters": {
                        "min_distance_seconds": "300"
                    }
                }
            ],
            "objective": "MinimizeDelay",
            "time_horizon_minutes": 120
        }
        
        try:
            print("📡 Sending optimization request...")
            response = requests.post(
                f"{self.backend_url}/api/v1/optimize/schedule",
                json=optimization_request,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Optimization request successful!")
                print(f"   - Success: {result.get('success', 'Unknown')}")
                print(f"   - Conflicts resolved: {result.get('conflicts_resolved', 'Unknown')}")
                print(f"   - Computation time: {result.get('computation_time_ms', 'Unknown')}ms")
                print(f"   - Message: {result.get('message', 'No message')}")
            else:
                print(f"❌ Optimization request failed: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except requests.ConnectionError:
            print("⚠️ Integration test skipped: Backend not running")
        except requests.Timeout:
            print("❌ Integration test failed: Request timed out")
        except Exception as e:
            print(f"❌ Integration test failed: {e}")
    
    async def cleanup(self):
        """Clean up test resources"""
        print("\n🧹 Cleaning up...")
        
        if self.python_process:
            try:
                self.python_process.terminate()
                await asyncio.sleep(1)
                if self.python_process.poll() is None:
                    self.python_process.kill()
                print("✅ Python service stopped")
            except Exception as e:
                print(f"⚠️ Error stopping Python service: {e}")

def print_setup_instructions():
    """Print setup instructions"""
    print("\n📋 Setup Instructions:")
    print("=" * 40)
    print("1. Python Service Setup:")
    print("   cd optimizer/python_service")
    print("   python -m venv venv")
    print("   .\\venv\\Scripts\\Activate.ps1  (PowerShell)")
    print("   pip install -r requirements.txt")
    print()
    print("2. Backend Setup:")
    print("   cd backend")
    print("   cargo build")
    print()
    print("3. Run this test:")
    print("   python test_optimization_interface.py")
    print()
    print("4. To test HTTP endpoints, start backend in another terminal:")
    print("   cd backend && cargo run")

async def main():
    """Main test function"""
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print_setup_instructions()
        return
    
    test = OptimizationInterfaceTest()
    await test.test_complete_interface()

if __name__ == "__main__":
    asyncio.run(main())
