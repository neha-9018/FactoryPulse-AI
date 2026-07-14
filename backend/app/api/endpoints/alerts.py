from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.api import deps
from backend.app.db.models import Alert

router = APIRouter()

class AlertOut(BaseModel):
    id: int
    machine_id: int
    timestamp: datetime
    alert_type: str
    severity: str
    message: str
    status: str
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AlertStatusUpdate(BaseModel):
    status: str # ACTIVE, ACKNOWLEDGED, RESOLVED

@router.get("/", response_model=List[AlertOut])
def read_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    """Retrieve alerts list with optional severity and status query filters."""
    query = db.query(Alert)
    
    if status:
        query = query.filter(Alert.status == status.upper())
    if severity:
        query = query.filter(Alert.severity == severity.upper())
        
    alerts = query.order_by(Alert.timestamp.desc()).limit(limit).all()
    return alerts

@router.put("/{alert_id}/status", response_model=AlertOut)
def update_alert_status(
    alert_id: int,
    status_in: AlertStatusUpdate,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    """Acknowledge or Resolve an alert. Open to Admin, Engineer, and Operator roles."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    status_upper = status_in.status.upper()
    if status_upper not in ["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]:
        raise HTTPException(status_code=400, detail="Invalid alert status")
        
    alert.status = status_upper
    if status_upper == "RESOLVED":
        alert.resolved_at = datetime.utcnow()
    else:
        alert.resolved_at = None
        
    db.commit()
    db.refresh(alert)
    return alert
