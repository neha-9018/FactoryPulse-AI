from typing import Any, Dict, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api import deps
from backend.app.db.models import Machine, SensorData, Production, Alert

router = APIRouter()

@router.get("/metrics")
def get_dashboard_metrics(
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Dict[str, Any]:
    """Retrieve top-level KPI metrics for the Executive dashboard."""
    # 1. Total machines count and statuses
    total_machines = db.query(Machine).count()
    offline_machines = db.query(Machine).filter(Machine.status == "OFFLINE").count()
    maintenance_machines = db.query(Machine).filter(Machine.status == "MAINTENANCE").count()
    failing_machines = db.query(Machine).filter(Machine.status == "FAILING").count()
    
    # 2. Aggregated OEE (mean of last 7 days production records)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    oee_avg = db.query(func.avg(Production.oee_score)).filter(
        Production.timestamp >= seven_days_ago
    ).scalar() or 0.0
    
    # 3. Production stats (accumulated counts)
    prod_stats = db.query(
        func.sum(Production.production_count).label("total_yield"),
        func.sum(Production.defect_count).label("total_defects")
    ).filter(Production.timestamp >= seven_days_ago).first()
    
    total_yield = prod_stats.total_yield or 0
    total_defects = prod_stats.total_defects or 0
    defect_rate = round((total_defects / total_yield) * 100, 2) if total_yield > 0 else 0.0
    
    # 4. Energy Consumption (cumulative sum from last 24h sensor readings)
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    total_energy = db.query(func.sum(SensorData.energy_consumption)).filter(
        SensorData.timestamp >= one_day_ago
    ).scalar() or 0.0
    
    # 5. Alert counters
    active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()
    
    return {
        "machines": {
            "total": total_machines,
            "offline": offline_machines,
            "maintenance": maintenance_machines,
            "failing": failing_machines,
            "operational": total_machines - offline_machines - maintenance_machines - failing_machines
        },
        "kpis": {
            "oee_average": round(float(oee_avg), 1),
            "total_yield": int(total_yield),
            "total_defects": int(total_defects),
            "defect_rate": defect_rate,
            "energy_consumption_24h": round(float(total_energy), 1),
            "active_alerts": active_alerts
        }
    }

@router.get("/production-charts")
def get_production_chart_data(
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> List[Dict[str, Any]]:
    """Retrieve daily yield and defect aggregates for graphical chart analysis (dialect-safe)."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    # Dialect-specific date grouping (SQLite vs PostgreSQL)
    if db.bind.dialect.name == "sqlite":
        date_group = func.strftime("%Y-%m-%d", Production.timestamp).label("date")
    else:
        date_group = func.date_trunc("day", Production.timestamp).label("date")
    
    results = db.query(
        date_group,
        func.sum(Production.production_count).label("production_yield"),
        func.sum(Production.defect_count).label("defects")
    ).filter(
        Production.timestamp >= seven_days_ago
    ).group_by(
        date_group
    ).order_by(
        date_group
    ).all()
    
    chart_data = []
    for r in results:
        # Handle string return format for SQLite and datetime for PostgreSQL
        date_str = r.date if isinstance(r.date, str) else r.date.strftime("%Y-%m-%d")
        chart_data.append({
            "date": date_str,
            "yield": int(r.production_yield or 0),
            "defects": int(r.defects or 0),
            "defect_rate": round(((r.defects or 0) / (r.production_yield or 1)) * 100, 2)
        })
        
    return chart_data

@router.get("/shifts")
def get_shift_analysis(
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> List[Dict[str, Any]]:
    """Compare production metrics by shift types (Morning, Afternoon, Night)."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    results = db.query(
        Production.shift_type,
        func.sum(Production.production_count).label("production_yield"),
        func.sum(Production.defect_count).label("defects"),
        func.avg(Production.oee_score).label("avg_oee")
    ).filter(
        Production.timestamp >= seven_days_ago
    ).group_by(
        Production.shift_type
    ).all()
    
    shift_data = []
    for r in results:
        shift_data.append({
            "shift": r.shift_type,
            "yield": int(r.production_yield or 0),
            "defects": int(r.defects or 0),
            "oee": round(float(r.avg_oee or 0.0), 1)
        })
    return shift_data
