# AI Manufacturing Data Platform

An enterprise-grade, Clean Architecture Industry 4.0 data platform combining Data Engineering (ETL, SQL), Machine Learning, Computer Vision, and full-stack React & FastAPI interfaces to simulate, monitor, and optimize smart factory operations.

Inspired by automation and manufacturing solutions from Meidensha, Mitsubishi Electric, Bosch, Siemens, and Hitachi.

---

## Project Structure

```text
AI-Manufacturing-Data-Platform/
├── backend/            # FastAPI REST API backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py        # Login and JWT token authentication
│   │   │   │   ├── machines.py    # Shop floor machinery master routes
│   │   │   │   ├── dashboard.py   # Shift production aggregator
│   │   │   │   ├── alerts.py      # Active alarms and triggers
│   │   │   │   ├── predictions.py # ML forecasting & health diagnostics
│   │   │   │   ├── quality.py     # CV quality inspection uploading
│   │   │   │   └── chatbot.py     # AI text-to-SQL manufacturing chatbot
│   │   │   └── deps.py            # JWT and role-based permissions
│   │   ├── core/
│   │   │   └── security.py        # Direct bcrypt hashing
│   │   ├── db/
│   │   │   ├── models.py          # SQLAlchemy PostgreSQL schemas
│   │   │   └── session.py         # Sessionmaker engine hooks
│   │   └── main.py                # App entrypoint and static image mounts
│   ├── requirements.txt   # Backend & ML scikit-learn/xgboost/opencv deps
│   └── .env               # Database configs & GEMINI_API_KEY credentials
├── frontend/           # React + TypeScript + Tailwind CSS client dashboard
│   ├── src/
│   │   ├── components/
│   │   │   └── DashboardLayout.tsx  # Sidebar portal frame
│   │   ├── pages/
│   │   │   ├── ExecutiveDashboard.tsx   # Asset health matrix and alarm board
│   │   │   ├── ProductionDashboard.tsx  # Production stats and defect distribution
│   │   │   ├── QualityDashboard.tsx     # OpenCV uploads inspection camera
│   │   │   ├── MaintenanceDashboard.tsx # Real-time ML diagnostic gauges
│   │   │   ├── AnalyticsDashboard.tsx   # Live sensor time-series charts
│   │   │   └── AssistantDashboard.tsx   # AI Natural Language database chat portal
│   │   ├── App.tsx        # Protected route wrappers and routing
│   │   ├── index.css      # Styling tokens & glassmorphism details
│   │   └── main.tsx       # VDOM mount point
│   ├── package.json       # Node dependency locks
│   └── vite.config.ts     # Dev proxy forwarding
├── ml/                 # Machine learning training & prediction
│   ├── train.py           # Multi-classifier comparison script (RF, XGB, LGBM)
│   ├── predict.py         # Diagnostic inference engine
│   └── models/            # Serialized pickle model checkouts (.pkl)
├── computer_vision/    # Quality inspection models & image processing
│   ├── generate_demo_images.py # Programmatically seeds mock parts (Healthy, Crack, Color, Size)
│   └── inspector.py       # OpenCV color check, Canny filters, and dimension contours
├── datasets/           # CSV datasets and uploads directory (Git ignored)
├── database/           # PostgreSQL definitions
│   └── schema.sql         # Base database definitions
├── tests/              # Comprehensive pytest suite
│   ├── test_api.py        # Auth & machine routes RBAC checks
│   ├── test_ml.py         # Model accuracy checks on anomalous metrics
│   ├── test_cv.py         # OpenCV image crack & size check filters
│   └── test_chatbot.py    # Intent parsing & SQL summary rendering
└── README.md           # Master documentation
```

---

## Roadmap & Milestones

1. **Milestone 1: Project Setup + PostgreSQL + ETL** (Completed)
   * Simulated high-fidelity factory logs (108,000 records).
   * Robust ETL script converting raw entries to PostgreSQL database tables.
2. **Milestone 2: Dashboard & Analytics** (Completed)
   * High-speed FastAPI REST endpoints with role permissions (Admin, Engineer, Operator).
   * Interactive React client, Recharts analytics, and alert consoles.
3. **Milestone 3: Predictive Maintenance** (Completed)
   * Multi-classifier training (Random Forest, XGBoost, LightGBM). Random Forest selected (**0.977 F1-Score**).
   * dynamic gauge diagnostics linked to live backend predictions.
4. **Milestone 4: Quality Inspection** (Completed)
   * OpenCV visual checker detecting cracks, sizes, missing labels, and colors.
   * Upload endpoints logging inspections directly in SQLite/Postgres.
5. **Milestone 5: AI Assistant** (Completed)
   * Natural language query routing executing context queries against SQL tables.
   * Google Gemini flash agent summarizer with standalone local templates.
6. **Milestone 6: Docker & AWS Deployment** (Next)
   * Containerize database, FastAPI, and Vite services.
   * Configure AWS staging.

---

## Running Instructions

### Prerequisites
* Python 3.10+
* Node.js v18+

### 1. Backend Setup & Ingestion
1. Install Python packages:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Generate the factory telemetry database:
   ```bash
   python etl/generate_data.py
   ```
3. Run the ETL Pipeline (requires PostgreSQL to be active as configured in `backend/.env`, otherwise skips database ingestion and utilizes frontend simulation):
   ```bash
   python etl/etl_pipeline.py
   ```

### 2. Startup Servers
1. Start the FastAPI backend server (auto-creates tables, seeds users, generates CV parts, and runs on port 8085):
   ```bash
   uvicorn backend.app.main:app --port 8085 --reload
   ```
2. Start the React frontend client:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000` in your web browser.

#### Demo Credentials:
* **Admin**: User `admin` / Password `Password123`
* **Engineer**: User `engineer` / Password `Password123`
* **Operator**: User `operator` / Password `Password123`

*Note: The frontend has built-in mock fallback capabilities. If you do not have PostgreSQL installed, the Vite app runs 100% of features locally using client-side diagnostic simulation.*

### 3. Verification & Testing
To execute the complete unit testing suite verifying all models, data pipelines, and security layers, run:
```bash
pytest
```
All 17 tests should pass successfully.
