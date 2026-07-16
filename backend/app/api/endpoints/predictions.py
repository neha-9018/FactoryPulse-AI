from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.api import deps
from backend.app.db.models import SensorData, Prediction, Machine
from ml.predict import MaintenancePredictor

router = APIRouter()

# Initialize predictor singleton (loads artifacts from ml/models/)
try:
    predictor = MaintenancePredictor()
except Exception as e:
    print(f"Warning: Predictor failed to load (run train.py first): {e}")
    predictor = None

# Schemas
class PredictionOut(BaseModel):
    id: int
    machine_id: int
    timestamp: datetime
    failure_probability: float
    health_score: float
    recommendation: Optional[str] = None

    class Config:
        from_attributes = True

class SinglePredictionIn(BaseModel):
    temperature: float
    pressure: float
    humidity: float
    voltage: float
    current: float
    rpm: float
    vibration: float
    energy_consumption: float

@router.post("/predict/{machine_id}", response_model=PredictionOut)
def run_model_prediction(
    machine_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.RoleChecker(["ADMIN", "ENGINEER"]))
) -> Any:
    """Trigger AI failure forecasting for a machine based on its latest sensor telemetry. Restricted to Admin/Engineer."""
    if not predictor:
        raise HTTPException(
            status_code=500,
            detail="Predictive maintenance model is not loaded. Train model first."
        )

    # 1. Fetch latest sensor data record
    latest_reading = db.query(SensorData).filter(
        SensorData.machine_id == machine_id
    ).order_by(SensorData.timestamp.desc()).first()
    
    if not latest_reading:
        raise HTTPException(
            status_code=404,
            detail="No sensor logs found for this machine. Load database first."
        )

    # 2. Run inference
    result = predictor.predict_health(
        temperature=float(latest_reading.temperature),
        pressure=float(latest_reading.pressure),
        humidity=float(latest_reading.humidity),
        voltage=float(latest_reading.voltage),
        current=float(latest_reading.current),
        rpm=float(latest_reading.rpm),
        vibration=float(latest_reading.vibration),
        energy=float(latest_reading.energy_consumption)
    )

    # 3. Save to predictions table
    pred_record = Prediction(
        machine_id=machine_id,
        timestamp=datetime.utcnow(),
        failure_probability=result["failure_probability"],
        health_score=result["health_score"],
        recommendation=result["recommendation"]
    )
    db.add(pred_record)
    
    # 4. Optional: If failure probability is high, update machine status to FAILING
    if result["status"] == "FAILING":
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        if machine:
            machine.status = "FAILING"
            
    db.commit()
    db.refresh(pred_record)
    return pred_record

@router.get("/health-history/{machine_id}", response_model=List[PredictionOut])
def get_prediction_history(
    machine_id: int,
    limit: int = 50,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    """Retrieve history of predictive inferences for trend charting."""
    predictions = db.query(Prediction).filter(
        Prediction.machine_id == machine_id
    ).order_by(Prediction.timestamp.desc()).limit(limit).all()
    
    # Return ascending order
    return list(reversed(predictions))

@router.post("/predict-custom")
def run_custom_telemetry_prediction(
    payload: SinglePredictionIn,
    current_user: Any = Depends(deps.RoleChecker(["ADMIN", "ENGINEER"]))
) -> Any:
    """Submit manual sensor readings to evaluate failure probability and retrieve custom actionable troubleshooting guidelines."""
    if not predictor:
        raise HTTPException(
            status_code=500,
            detail="Predictive maintenance model is not loaded. Train model first."
        )

    # 1. Run inference using the inputs
    result = predictor.predict_health(
        temperature=payload.temperature,
        pressure=payload.pressure,
        humidity=payload.humidity,
        voltage=payload.voltage,
        current=payload.current,
        rpm=payload.rpm,
        vibration=payload.vibration,
        energy=payload.energy_consumption
    )
    
    # 2. Generate a highly detailed list of step-by-step actionable safety prevention steps
    actionable_steps = []
    
    if result["failure_probability"] > 0.35:
        # High Temperature
        if payload.temperature > 80.0:
            actionable_steps.append("THERMAL CRISIS OVERRIDE: Immediately cut spindle rotation. Check coolant levels and verify that thermal flushing lines are not clogged. Inspect spindle bearings for wear.")
        # High Vibration
        if payload.vibration > 3.0:
            actionable_steps.append("VIBRATION BALANCE PROTOCOL: Shut down rotational drives. Inspect coupling alignment, verify foundation anchor torque, and check for workpiece imbalance.")
        # High Pressure
        if payload.pressure > 180.0:
            actionable_steps.append("HYDRAULIC VALVE PRESSURE RELEASE: Check safety relief valve calibration. Inspect cylinder seals for high-stress damage. Bleed air blocks in hydraulic manifold.")
        # Electrical variations
        if payload.voltage < 200.0 or payload.voltage > 240.0:
            actionable_steps.append("ELECTRICAL INTEGRITY CHECK: Disconnect supply line. Verify phase balancing, check voltage regulator coil, and inspect connection terminals for loose contacts.")
            
        if not actionable_steps:
            actionable_steps.append("GENERAL REPAIR ACTION: Schedule immediate mechanic inspection. Perform general wear checks on gears, belts, and bearings.")
    else:
        actionable_steps.append("No immediate action required. Machinery parameters within normal bounds. Proceed with standard 14-day schedule.")

    return {
        "failure_probability": result["failure_probability"],
        "health_score": result["health_score"],
        "recommendation": result["recommendation"],
        "actionable_steps": actionable_steps
    }

