# 🚆 Railway Intelligence System

An intelligent decision-support system for Indian Railways train traffic controllers, combining Operations Research and AI/ML for real-time train precedence and crossing optimization.

## 🎯 Project Overview

This system assists section controllers in making optimized, real-time decisions for train precedence and crossings, leveraging:
- **Operations Research** (OR-Tools) for constraint programming
- **AI/ML Models** for delay prediction and disruption handling  
- **Real-time optimization** with sub-5 second response times
- **Human-in-the-loop** design with controller override capabilities

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │    │   Rust Backend   │    │ Python Optimizer│
│   Dashboard     │◄──►│   Services       │◄──►│   OR-Tools      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │    SurrealDB     │
                        │  Graph Database  │
                        └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Rust 1.75+
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose

### Setup
```bash
# Clone and setup
git clone <repository>
cd railway-intelligence-system

# Start all services
docker-compose up -d

# Access dashboard
open http://localhost:3000
```

## 📁 Project Structure

```
railway-intelligence-system/
├── backend/           # Rust backend services
├── optimizer/         # Python OR-Tools service  
├── frontend/          # React dashboard
├── infrastructure/    # Docker, K8s configs
├── docs/             # Documentation
├── scripts/          # Build and deployment scripts
└── tests/            # Integration tests
```

## 🎯 Hackathon Goals

- **Week 1**: Foundation (Rust backend + SurrealDB)
- **Week 2**: Core Logic (OR-Tools integration)  
- **Week 3**: Intelligence (AI/ML + what-if scenarios)
- **Week 4**: Demo (Frontend + end-to-end testing)

## 📊 Expected Impact

- **10%** improvement in punctuality
- **15%** increase in throughput  
- **20%** reduction in average delays
- **National scale** deployment potential

## 🛠️ Tech Stack

- **Backend**: Rust (Axum, Tokio, SurrealDB)
- **Optimization**: Python (OR-Tools, gRPC)
- **AI/ML**: XGBoost, PyTorch, scikit-learn
- **Frontend**: React, TypeScript, WebSocket
- **Database**: SurrealDB (graph + time-series)
- **Infrastructure**: Docker, Kubernetes, Prometheus

## 📚 Documentation

- [Workflow Documentation](docs/workflow.md)
- [API Reference](docs/api.md) 
- [Deployment Guide](docs/deployment.md)
- [Architecture Overview](docs/architecture.md)

## 🤝 Team

- **Backend Engineer**: Rust services, APIs, data pipelines
- **Optimization Engineer**: OR-Tools, constraint programming
- **AI/ML Engineer**: Prediction models, RL agents
- **Frontend Engineer**: React dashboard, UX/UI
- **Data Engineer**: Ingestion, synthetic data
- **DevOps Engineer**: Infrastructure, monitoring
- **Railway Domain Expert**: Operations knowledge, validation
- **Product Manager**: Roadmap, presentation

---

*Built for Smart India Hackathon 2024 - Solving national-level railway optimization challenges*
