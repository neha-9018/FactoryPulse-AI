# AI Manufacturing Data Platform

An enterprise-grade, Clean Architecture Industry 4.0 data platform combining Data Engineering (ETL, SQL), Machine Learning, Computer Vision, and full-stack React & FastAPI interfaces to simulate, monitor, and optimize smart factory operations.

Inspired by automation and manufacturing solutions from Meidensha, Mitsubishi Electric, Bosch, and Siemens.

---

## Project Structure

```text
AI-Manufacturing-Data-Platform/
├── backend/            # FastAPI REST API backend
├── frontend/           # React + TypeScript + Tailwind CSS frontend
├── database/           # PostgreSQL schemas, migrations, and ER diagrams
├── etl/                # Ingestion scripts, data validation, and transformations
├── ml/                 # Predictive maintenance training and model comparison
├── computer_vision/    # Quality inspection models (OpenCV, YOLO)
├── dashboard/          # Configs, scripts, or templates for factory dashboarding
├── datasets/           # Raw and processed datasets (CSV, JSON, Excel)
├── docker/             # Containerization files (Dockerfiles, compose)
├── docs/               # System architecture and user documentation
├── tests/              # Automated unit and integration tests
└── README.md           # Master documentation
```

---

## Roadmap & Milestones

1. **Milestone 1: Project Setup + PostgreSQL + ETL**
   * Repository initialization and directory setup.
   * High-fidelity database schema & design.
   * High-volume factory simulator (100k+ sensor & production records).
   * Transformative ETL Pipeline cleaning, validating, and loading raw data to PostgreSQL.
2. **Milestone 2: Dashboard & Analytics**
   * Enterprise FastAPI web endpoints.
   * React, TypeScript, and Tailwind frontend setup.
   * Real-time charts, KPIs, and machine status boards.
3. **Milestone 3: Predictive Maintenance**
   * Failure classification and regression (Time-to-failure, Health Score).
   * Models: XGBoost, Random Forest, LightGBM.
   * Model serving API endpoints.
4. **Milestone 4: Quality Inspection**
   * Computer Vision pipeline detecting label alignment, surface cracks, and dimension failures.
   * PostgreSQL persistence of quality flags and inspection image references.
5. **Milestone 5: AI Assistant**
   * Google Gemini LLM agent query-to-SQL dashboard helper.
6. **Milestone 6: Docker & AWS Deployment**
   * Containerize services using Docker Compose.
   * Production deployment configuration on AWS EC2.

---

## Getting Started

### Installation & Prerequisites
* Python 3.10+
* Node.js v18+
* PostgreSQL

Details for each module are documented in their respective directories.
