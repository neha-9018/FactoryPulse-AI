from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.api import deps
from backend.app.db.models import Machine, SensorData
from backend.app.db.session import engine

router = APIRouter()

# Schema definitions
class MachineOut(BaseModel):
    id: int
    name: str
    type: str
    location: str
    status: str
    installation_date: Optional[str] = None
    created_at: datetime
    health_score: Optional[int] = None

    class Config:
        from_attributes = True

class MachineStatusUpdate(BaseModel):
    status: str # OPERATIONAL, MAINTENANCE, OFFLINE, FAILING

class SensorDataOut(BaseModel):
    id: int
    machine_id: int
    timestamp: datetime
    temperature: float
    pressure: float
    humidity: float
    voltage: float
    current: float
    rpm: float
    vibration: float
    energy_consumption: float
    is_anomaly: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[MachineOut])
def read_machines(
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    """Retrieve machines lists with dynamic health scores."""
    from backend.app.db.models import Prediction
    machines = db.query(Machine).all()
    for m in machines:
        latest_pred = db.query(Prediction).filter(Prediction.machine_id == m.id).order_by(Prediction.timestamp.desc()).first()
        m.health_score = int(latest_pred.health_score) if latest_pred else None
    return machines

@router.get("/{machine_id}", response_model=MachineOut)
def read_machine(
    machine_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    """Retrieve machine profile by ID with health score."""
    from backend.app.db.models import Prediction
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    latest_pred = db.query(Prediction).filter(Prediction.machine_id == machine.id).order_by(Prediction.timestamp.desc()).first()
    machine.health_score = int(latest_pred.health_score) if latest_pred else None
    return machine

@router.put("/{machine_id}/status", response_model=MachineOut)
def update_machine_status(
    machine_id: int,
    status_in: MachineStatusUpdate,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.RoleChecker(["ADMIN", "ENGINEER"]))
) -> Any:
    """Update a machine's operational status and return updated details."""
    from backend.app.db.models import Prediction
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
        
    status_upper = status_in.status.upper()
    if status_upper not in ["OPERATIONAL", "MAINTENANCE", "OFFLINE", "FAILING"]:
        raise HTTPException(status_code=400, detail="Invalid machine status")
        
    machine.status = status_upper
    db.commit()
    db.refresh(machine)
    
    latest_pred = db.query(Prediction).filter(Prediction.machine_id == machine.id).order_by(Prediction.timestamp.desc()).first()
    machine.health_score = int(latest_pred.health_score) if latest_pred else None
    return machine

@router.get("/{machine_id}/sensors", response_model=List[SensorDataOut])
def read_machine_sensors(
    machine_id: int,
    limit: int = 100,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    """Get time-series sensor logs for a specific machine."""
    query = db.query(SensorData).filter(SensorData.machine_id == machine_id)
    
    if start_time:
        query = query.filter(SensorData.timestamp >= start_time)
    if end_time:
        query = query.filter(SensorData.timestamp <= end_time)
        
    sensor_logs = query.order_by(SensorData.timestamp.desc()).limit(limit).all()
    # Return chronologically ascending for standard charting
    return list(reversed(sensor_logs))
