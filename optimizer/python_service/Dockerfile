# Use Python 3.11 slim image for smaller size
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OR-Tools and gRPC
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy proto files and generate gRPC code
COPY proto/ ./proto/
RUN python -m grpc_tools.protoc -I./proto --python_out=./src --grpc_python_out=./src proto/optimization.proto

# Copy source code
COPY src/ ./src/
COPY setup.py .

# Install the package
RUN pip install -e .

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash optimizer
USER optimizer

# Expose gRPC port
EXPOSE 50051

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import grpc; grpc.channel_ready_future(grpc.insecure_channel('localhost:50051')).result(timeout=5)"

# Set environment variables
ENV PYTHONPATH=/app/src
ENV GRPC_PORT=50051
ENV LOG_LEVEL=INFO

# Start the optimization service
CMD ["python", "-m", "src.grpc_server"]
