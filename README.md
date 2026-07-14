# AI Manufacturing Data Platform

An enterprise-grade, Clean Architecture Industry 4.0 data platform combining Data Engineering (ETL, SQL), Machine Learning, Computer Vision, and full-stack React & FastAPI interfaces to simulate, monitor, and optimize smart factory operations.

Inspired by automation and manufacturing solutions from Meidensha, Mitsubishi Electric, Bosch, and Siemens.

---

## Project Structure

```text
AI-Manufacturing-Data-Platform/
├── backend/            # FastAPI REST API backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py      # Login and JWT auth endpoints
│   │   │   │   ├── machines.py  # Shop floor machinery routes
│   │   │   │   ├── dashboard.py # Production chart metrics aggregator
│   │   │   │   └── alerts.py    # Alarm status controllers
│   │   │   └── deps.py          # Role-based auth dependencies
│   │   ├── core/
│   │   │   └── security.py      # Direct bcrypt hashing and JWT token utils
│   │   ├── db/
│   │   │   ├── models.py        # SQLAlchemy database model mappings
│   │   │   └── session.py       # Engine and sessionmaker hooks
│   │   └── main.py              # FastAPI app startup and CORS config
│   ├── requirements.txt# Backend and data science package dependencies
│   └── .env            # Private environment variables (database credentials)
├── frontend/           # React + TypeScript + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── DashboardLayout.tsx # Sidebar shell and navigation controls
│   │   ├── pages/
│   │   │   ├── ExecutiveDashboard.tsx   # Asset health grids and status modals
│   │   │   ├── ProductionDashboard.tsx  # Shift yields and defects charts
│   │   │   ├── MaintenanceDashboard.tsx # AI failure projections and work orders
│   │   │   └── AnalyticsDashboard.tsx   # Live sensor time-series area charts
│   │   ├── App.tsx     # Router protection and authentication context
│   │   ├── index.css   # Custom styling (glassmorphism layouts)
│   │   └── main.tsx    # Virtual DOM mount point
│   ├── package.json    # Frontend dependency mappings (Recharts, Lucide, Tailwind)
│   ├── tailwind.config.js # Dark slate and neon cyan layout configurations
│   ├── tsconfig.json   # TypeScript configuration options
│   └── vite.config.ts  # Vite bundler, proxy configuration
├── database/           # PostgreSQL schemas, migrations, and ER diagrams
│   └── schema.sql      # Schema definitions with indices
├── etl/                # Ingestion scripts, data validation, and transformations
│   ├── generate_data.py# Simulated physical data generator (100k+ rows)
│   └── etl_pipeline.py # Extract-Transform-Load (ETL) ingestion engine
├── ml/                 # Predictive maintenance training and model comparison
├── computer_vision/    # Quality inspection models (OpenCV, YOLO)
├── datasets/           # Raw and processed datasets (CSV, JSON, Excel) (Git ignored)
├── tests/              # Automated unit and integration tests
│   ├── test_generator.py # Tests for mock data generation
│   ├── test_etl.py       # Tests for ETL transformations
│   └── test_api.py       # Tests for REST security and RBAC
└── README.md           # Master documentation
```

---

## Roadmap & Milestones

1. **Milestone 1: Project Setup + PostgreSQL + ETL** (Completed)
   * Repository initialization and directory setup.
   * High-fidelity database schema & design.
   * High-volume factory simulator (108,000 sensor & production records).
   * Transformative ETL Pipeline cleaning, validating, and loading raw data to PostgreSQL.
2. **Milestone 2: Dashboard & Analytics** (Completed)
   * Enterprise FastAPI web endpoints.
   * React, TypeScript, and Tailwind frontend setup.
   * Real-time charts, KPIs, and machine status boards.
3. **Milestone 3: Predictive Maintenance** (Next)
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

## Ingestion & Verification

### Prerequisites
* Python 3.10+
* Node.js v18+

### 1. Ingestion Phase
1. Install Python packages:
   ```powershell
   pip install -r backend/requirements.txt
   ```
2. Generate the factory logs:
   ```powershell
   python etl/generate_data.py
   ```
3. Run the ETL Pipeline (requires PostgreSQL to be active as configured in `backend/.env`):
   ```powershell
   python etl/etl_pipeline.py
   ```

### 2. Launching Backend & Frontend
1. Start the FastAPI backend server (loads database session, seeds default users, and binds to port 8000):
   ```powershell
   uvicorn backend.app.main:app --reload
   ```
2. In a separate terminal shell, install frontend packages and start the Vite React development server:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000` to view the Portal.

#### Demo Credentials:
* **Admin**: User `admin` / Password `Password123`
* **Engineer**: User `engineer` / Password `Password123`
* **Operator**: User `operator` / Password `Password123`

*Note: The frontend has been designed with a local mock data fallback. If the backend is offline, the React dashboards will automatically load high-fidelity simulated telemetry so you can test all features immediately.*

### 3. Running Tests
Run the comprehensive test suite verifying datasets, ETL transforms, and API endpoints:
```powershell
pytest tests/
```
All tests should pass successfully.
