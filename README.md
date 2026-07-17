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
│   │   │   │   ├── auth.py        # Login, JWT authentication & case-insensitive matching
│   │   │   │   ├── machines.py    # Shop floor machinery master routes
│   │   │   │   ├── dashboard.py   # Shift production aggregator
│   │   │   │   ├── alerts.py      # Active alarms and triggers
│   │   │   │   ├── predictions.py # ML forecasting, health diagnostics & Auto-Stop
│   │   │   │   ├── quality.py     # CV quality check uploads & defect Auto-Stop
│   │   │   │   ├── chatbot.py     # AI text-to-SQL manufacturing chatbot
│   │   │   │   └── reports.py     # Corporate report compiler and CSV exporter
│   │   │   └── deps.py            # JWT and role-based permissions
│   │   ├── core/
│   │   │   └── security.py        # Direct bcrypt hashing
│   │   ├── db/
│   │   │   ├── models.py          # SQLAlchemy SQLite / Postgres schemas
│   │   │   └── session.py         # Sessionmaker engine hooks
│   │   └── main.py                # Startup migrations, user & stats pre-seeder
│   ├── requirements.txt   # Backend & ML dependencies
│   └── .env               # Database configs & GEMINI_API_KEY credentials
├── frontend/           # React + TypeScript client dashboard
│   ├── src/
│   │   ├── components/
│   │   │   └── DashboardLayout.tsx  # Sidebar frame (filtered by RBAC rules)
│   │   ├── pages/
│   │   │   ├── ExecutiveDashboard.tsx   # Asset health matrix and alarm board
│   │   │   ├── ProductionDashboard.tsx  # Production stats and shift-locked views
│   │   │   ├── QualityDashboard.tsx     # OpenCV uploads inspection station (1540 logs)
│   │   │   ├── MaintenanceDashboard.tsx # Real-time ML diagnostic gauges
│   │   │   ├── AnalyticsDashboard.tsx   # Live sensor time-series charts (limit locks)
│   │   │   ├── AssistantDashboard.tsx   # AI Natural Language database chat portal
│   │   │   ├── ReportsDashboard.tsx     # Corporate report exporter (OEE, Downtime, Health)
│   │   │   └── ProfileDashboard.tsx     # User session details
│   │   ├── App.tsx        # Protected route wrappers and routing
│   │   ├── index.css      # Styling tokens & high-contrast accessible layouts
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
└── README.md           # Master documentation
```

---

## Key Features & Implementations

### 1. Role-Based Access Control (RBAC) Matrix
The dashboard enforces strict page filters and routing guards to protect corporate assets:
* **Admin / Manager**: Full privileges across all modules, including machine controls and all CSV reports downloads.
* **Engineer**: View-only access on the Executive View (cannot toggle E-Stops). Can export only Maintenance reports.
* **Operator**: Completely blocked from Executive View and Reports. Custom Analytics are locked to their assigned machine, and Production Analytics display only their assigned shift logs.

### 2. Auto-Stop SCADA Request Triggers
* **Critical Health Threshold**: If a machine's calculated health score falls below 60%, the backend automatically sets the machine's status to `OFFLINE` (Safe Stop) and registers a PLC Auto-Stop Alarm.
* **Quality Fail limit**: If the CV inspection logs detect 3 consecutive defect failures on a single machine conveyor line, the backend dispatches a SCADA stop command and triggers an alarm notification.

### 3. High-Contrast Accessibility Theme
* Integrated high-contrast colors, pure black primary text (`#000000`), bold font weights (`font-weight: 600`), and thicker borders (`border-width: 2px`) in Light Mode to support visually impaired shop floor staff.

---

## Running Instructions

### Prerequisites
* Python 3.10+
* Node.js v18+

### 1. Backend Setup & Ingestion
1. Initialize virtual environment:
   * **Windows Command Prompt (cmd)**:
     ```cmd
     python -m venv venv
     venv\Scripts\activate
     ```
   * **Windows PowerShell**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
2. Install Python packages:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Generate the factory telemetry database:
   ```bash
   python etl/generate_data.py
   ```

### 2. Startup Servers
1. Start the FastAPI backend server (auto-creates tables, alters schemas, seeds users, pre-populates 1,540 historical inspection logs, and runs on port 8085):
   ```bash
   uvicorn backend.app.main:app --port 8085 --reload
   ```
2. Start the React frontend client:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open **`http://localhost:3000`** in your web browser.

#### Demo Credentials:
* **Admin**: Username `admin` or `neha_yadav` / Password `admin123`
* **Manager**: Username `manager` / Password `Password123`
* **Engineer**: Username `engineer` or `engineer_satoh` / Password `admin123`
* **Operator**: Username `operator` or `operator_suzuki` / Password `admin123`

### 3. Verification & Testing
To execute the complete unit testing suite verifying all models, data pipelines, and security layers, run:
```bash
pytest
```
