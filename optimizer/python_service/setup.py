"""
Setup script for Railway Intelligence System - Python Optimization Service
"""

from setuptools import setup, find_packages

setup(
    name="railway-optimization-service",
    version="0.1.0",
    description="Python optimization service using OR-Tools for railway scheduling",
    author="Railway Intelligence System Team",
    packages=find_packages(),
    package_dir={"": "src"},
    python_requires=">=3.8",
    install_requires=[
        "ortools>=9.7.2996",
        "grpcio>=1.59.0",
        "grpcio-tools>=1.59.0",
        "protobuf>=4.24.0",
        "numpy>=1.24.0",
        "pandas>=2.0.0",
        "pydantic>=2.0.0",
        "loguru>=0.7.0",
        "python-dateutil>=2.8.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.5.0",
        ],
        "monitoring": [
            "psutil>=5.9.0",
            "memory-profiler>=0.61.0",
        ],
        "visualization": [
            "matplotlib>=3.7.0",
            "plotly>=5.15.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "railway-optimizer=src.grpc_server:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
)
