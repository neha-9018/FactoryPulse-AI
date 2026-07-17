# 🏭 FactoryPulse AI

**FactoryPulse AI** is an **Industry 4.0 Data Analytics and Business Intelligence Platform** that combines **Data Engineering, Machine Learning, Computer Vision, and Full-Stack Development** to monitor, analyze, and optimize smart factory operations.

The platform transforms raw manufacturing data into actionable insights through interactive dashboards, predictive analytics, and AI-assisted reporting.

---

## 📌 Key Features

- 📊 Interactive Business Intelligence Dashboard
- 🤖 Predictive Maintenance using Machine Learning
- 📷 OpenCV Quality Inspection (PASS / FAIL Classification)
- 💬 Gemini AI Text-to-SQL Assistant
- 🔐 JWT Authentication & Role-Based Access Control (RBAC)
- 📈 ETL Pipeline for Manufacturing Data
- 🗄 PostgreSQL / SQLite Database Support
- 📑 Automated Report Generation
- ⚡ FastAPI REST APIs
- ⚛ React + TypeScript Frontend

---

# 🏗 System Architecture

```
FactoryPulse/
│
├── frontend/                 # React + TypeScript Dashboard
├── backend/                  # FastAPI REST API
├── ml/                       # Machine Learning Models
├── computer_vision/          # OpenCV Inspection
├── database/                 # SQL Schema
├── datasets/                 # Sensor & Production Data
├── tests/                    # Unit Tests
└── README.md
```

---

# 📊 Project Workflow

```
Historical Sensor Logs
          │
          ▼
     ETL Pipeline
          │
          ▼
 PostgreSQL Database
          │
          ▼
 FastAPI Backend APIs
          │
   ┌──────┼─────────┐
   │      │         │
   ▼      ▼         ▼
 ML     OpenCV   Gemini AI
   │      │         │
   └──────┼─────────┘
          ▼
 React Dashboard
          │
          ▼
 Business Insights
```

---

# 📈 Analytics Modules

## 1️⃣ Descriptive Analytics

Calculates factory KPIs including:

- Overall Equipment Effectiveness (OEE)
- Machine Health
- Production Output
- Defect Rate
- Shift Performance

Displayed using:

- KPI Cards
- Line Charts
- Bar Charts
- Doughnut Charts

---

## 2️⃣ Diagnostic Analytics

Uses **OpenCV** to inspect manufactured products.

Performs:

- PASS / FAIL Classification
- Defect Counting
- Quality Monitoring

Results are automatically updated on the dashboard.

---

## 3️⃣ Predictive Analytics

Machine Learning model built using **Random Forest**.

Predicts:

- Machine Health Score
- Failure Probability
- Time-to-Failure
- Maintenance Recommendations

---

## 4️⃣ AI Assistant

Powered by **Google Gemini API**.

Supports:

- Text-to-SQL
- Report Generation
- Natural Language Queries
- Factory Insights

Example:

> "Which machine has the highest downtime today?"

---

# 🔐 Role-Based Access Control

| Role | Permissions |
|-------|-------------|
| **Admin** | Full System Access |
| **Manager** | Dashboard, Reports, Analytics |
| **Engineer** | Maintenance & Diagnostics |
| **Operator** | Assigned Machine Monitoring |

---

# ⚙ Technology Stack

## Frontend

- React
- TypeScript
- Tailwind CSS
- Vite

## Backend

- FastAPI
- SQLAlchemy
- JWT Authentication
- Pydantic

## Database

- PostgreSQL
- SQLite

## Machine Learning

- Scikit-learn
- Pandas
- NumPy

## Computer Vision

- OpenCV

## AI

- Google Gemini API

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/neha-9018/FactoryPulse-AI.git
cd FactoryPulse-AI
```

---

## Backend

Create Virtual Environment

```bash
python -m venv venv
```

Windows

```bash
venv\Scripts\activate
```

Linux / macOS

```bash
source venv/bin/activate
```

Install dependencies

```bash
pip install -r backend/requirements.txt
```

Run Backend

```bash
uvicorn backend.app.main:app --reload --port 8085
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

Open

```
http://localhost:3000
```

---

# 👤 Demo Credentials

| Role | Username | Password |
|-------|----------|----------|
| Admin | admin | admin123 |
| Manager | manager | Password123 |
| Engineer | engineer | admin123 |
| Operator | operator | admin123 |

---

# 🧪 Testing

Run unit tests

```bash
pytest
```

---

# 📸 Project Modules

- Executive Dashboard
- Production Analytics
- Quality Dashboard
- Predictive Maintenance
- AI Manufacturing Assistant
- Reports Dashboard
- User Profile

---

# 📊 Business Value

FactoryPulse AI enables manufacturers to:

- Reduce machine downtime
- Improve product quality
- Monitor production performance
- Support predictive maintenance
- Generate AI-powered reports
- Make data-driven decisions

---

# 🎯 Future Enhancements

- MQTT / OPC-UA Integration
- Real-Time IoT Sensors
- PLC Connectivity
- Cloud Deployment (AWS/Azure)
- Mobile Dashboard
- Digital Twin Integration

---

# 👩‍💻 Author

**Neha Yadav**

B.Tech Computer Science & Engineering

GitHub: https://github.com/neha-9018

---

## ⭐ If you found this project useful, please consider giving it a star!
