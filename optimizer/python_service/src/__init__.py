"""
Railway Intelligence System - Python Optimization Service

This module provides advanced optimization capabilities using Google OR-Tools
for railway scheduling, conflict resolution, and performance optimization.
"""

__version__ = "0.1.0"
__author__ = "Railway Intelligence System Team"

from .optimization_engine import OptimizationEngine
from .constraint_models import ConstraintBuilder
from .objectives import ObjectiveManager
from .grpc_server import OptimizationServer

__all__ = [
    "OptimizationEngine",
    "ConstraintBuilder", 
    "ObjectiveManager",
    "OptimizationServer"
]
