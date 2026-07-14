# AI Manufacturing Data Platform

An enterprise-grade, Clean Architecture Industry 4.0 data platform combining Data Engineering (ETL, SQL), Machine Learning, Computer Vision, and full-stack React & FastAPI interfaces to simulate, monitor, and optimize smart factory operations.

Inspired by automation and manufacturing solutions from Meidensha, Mitsubishi Electric, Bosch, and Siemens.

---

## Project Structure

```text
AI-Manufacturing-Data-Platform/
├── backend/            # FastAPI REST API backend
│   ├── app/
│   │   ├── db/
│   │   │   ├── models.py      # SQLAlchemy DB ORM models
│   │   │   └── session.py     # Database engine & sessionmaker config
│   └── requirements.txt# Backend and data science requirements
├── frontend/           # React + TypeScript + Tailwind CSS frontend
├── database/           # PostgreSQL schemas, migrations, and ER diagrams
│   └── schema.sql      # Database schema design with relations
├── etl/                # Ingestion scripts, data validation, and transformations
│   ├── generate_data.py# Simulated physics-based factory data generator
│   └── etl_pipeline.py # Robust Extract-Transform-Load (ETL) ingestion engine
├── ml/                 # Predictive maintenance training and model comparison
├── computer_vision/    # Quality inspection models (OpenCV, YOLO)
├── dashboard/          # Configs, scripts, or templates for factory dashboarding
├── datasets/           # Raw and processed datasets (CSV, JSON, Excel) (Git ignored)
├── docker/             # Containerization files (Dockerfiles, compose)
├── docs/               # System architecture and user documentation
├── tests/              # Automated unit and integration tests
│   ├── test_generator.py # Tests for mock data generation
│   └── test_etl.py       # Tests for ETL transformations
└── README.md           # Master documentation
```

---

## Roadmap & Milestones

1. **Milestone 1: Project Setup + PostgreSQL + ETL** (Completed)
   * Repository initialization and directory setup.
   * High-fidelity database schema & design.
   * High-volume factory simulator (108,000 sensor & production records).
   * Transformative ETL Pipeline cleaning, validating, and loading raw data to PostgreSQL.
2. **Milestone 2: Dashboard & Analytics** (Next)
   * Enterprise FastAPI web endpoints.
   * React, TypeScript, and Tailwind frontend setup.
   * Real-time charts, KPIs, and machine status boards.
3. **Milestone 3: Predictive Maintenance**
   * Failure classification and regression (Time-to-failure, Health Score).
   * Models: XGBoost, Random Forest, LightGBM.
4. **Milestone 4: Quality Inspection**
   * Computer Vision pipeline detecting label alignment, surface cracks, and dimension failures.
5. **Milestone 5: AI Assistant**
   * Google Gemini LLM agent query-to-SQL dashboard helper.
6. **Milestone 6: Docker & AWS Deployment**
   * Containerize services using Docker Compose.
   * Production deployment configuration on AWS EC2.

---

## Milestone 1 Implementation

### 1. Database Design & Schema
The relational database structure matches standard enterprise shop-floor telemetry systems:
* **users**: User authentication and Role-Based Access Control (RBAC) (Admin, Engineer, Operator, Manager).
* **machines**: Shop-floor assets tracking status (Operational, Maintenance, Offline, Failing).
* **sensor_data**: High-frequency physical variables (temperature, pressure, voltage, RPM, vibration).
* **production**: Ingests shift counts, defect counts, and computes OEE (Overall Equipment Effectiveness).
* **quality_inspection**: Stores results of computer vision part inspections.
* **maintenance_logs**: Tracks technician maintenance records and cost.
* **predictions**: AI predictive maintenance inferences (health score, failure probability).
* **alerts**: Automatically captures rule-based alarms (e.g., Temperature > threshold).

### 2. Data Simulator
Generates a realistic, physical dataset under `datasets/` containing:
* **`machines.json`**: Static configuration metadata.
* **`sensor_data.csv`**: Over 108,000 sensor readings with simulated physics, age wear, and physical anomaly spikes.
* **`production_data.xlsx`**: Excel records tracking morning/afternoon/night shifts.
* **`maintenance_data.csv`**: Logs detailing history of preventive/corrective actions.

### 3. ETL Pipeline
Located in `etl/etl_pipeline.py`, this script extracts raw data from multi-format files, cleans duplicates, imputes missing records using time-based interpolation, flags statistical outliers via Z-score analysis, and performs high-speed bulk database load operations.

---

## Ingestion & Verification

### Prerequisites
Ensure Python 3.10+ is installed.

### Setup and Ingestion
1. Install dependencies:
   ```powershell
   pip install -r backend/requirements.txt
   ```
2. Set up the local `.env` database credentials inside `backend/.env`.
3. Generate the datasets:
   ```powershell
   python etl/generate_data.py
   ```
4. Run the ETL Pipeline (requires PostgreSQL to be active as configured in `.env`):
   ```powershell
   python etl/etl_pipeline.py
   ```

### Running Tests
Execute the unit test suite to verify the simulation logic and cleaning transforms:
```powershell
pytest tests/
```
All 6 tests should output `passed`.
