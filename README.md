# FactoryPulse

An enterprise-grade, Clean Architecture Industry 4.0 data platform combining Data Engineering (ETL, SQL), Machine Learning, Computer Vision, and full-stack React & FastAPI interfaces to simulate, monitor, and optimize smart factory operations.

Inspired by automation and manufacturing solutions from Meidensha, Mitsubishi Electric, Bosch, Siemens, and Hitachi.

---

## Project Structure

```text
FactoryPulse/
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
