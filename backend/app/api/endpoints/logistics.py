from datetime import datetime
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.api import deps
from backend.app.db.models import WMSInventory, WESMovementTask, WCSConveyorState

router = APIRouter()

# Schema classes
class MaterialRequestSchema(BaseModel):
    material_type: str
    quantity: int
    destination: str
    priority: str = "MEDIUM" # HIGH, MEDIUM, LOW

class ConveyorControlSchema(BaseModel):
    command: str  # START, STOP, REVERSE, ADJUST_SPEED, TRIGGER_FAULT, CLEAR_FAULT
    speed: float = 0.5
    direction: str = "FORWARD"
    cargo: str = None

@router.get("/inventory", response_model=List[Dict[str, Any]])
def get_inventory(db: Session = Depends(deps.get_db)) -> Any:
    """Retrieve all raw-material stock inventory counts (WMS)."""
    items = db.query(WMSInventory).all()
    # If empty, return initial list structure
    return [
        {
            "id": i.id,
            "item_name": i.item_name,
            "item_code": i.item_code,
            "quantity": i.quantity,
            "min_threshold": i.min_threshold,
            "unit": i.unit,
            "last_updated": i.last_updated
        }
        for i in items
    ]

@router.post("/request", response_model=Dict[str, Any])
def request_materials(payload: MaterialRequestSchema, db: Session = Depends(deps.get_db)) -> Any:
    """WES request dispatcher: receives production request, checks WMS stock, assigns carrier."""
    # 1. Check raw inventory
    stock = db.query(WMSInventory).filter(WMSInventory.item_name == payload.material_type).first()
    if not stock:
        # Auto-create inventory record if not exists
        stock = WMSInventory(
            item_name=payload.material_type,
            item_code=payload.material_type.upper()[:4] + "_RAW",
            quantity=150,
            min_threshold=30,
            unit="units"
        )
        db.add(stock)
        db.commit()
        db.refresh(stock)

    if stock.quantity < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient WMS raw inventory for {payload.material_type}. Available: {stock.quantity}."
        )

    # 2. Allocate and deduct raw stock
    stock.quantity -= payload.quantity

    # 3. Create WES Movement Task
    # Assign carrier based on destination
    carrier = "CONVEYOR_LINE_A" if "CNC" in payload.destination or "Spindle" in payload.destination else "AGV_ROBOT_02"
    
    task = WESMovementTask(
        material_type=payload.material_type,
        quantity=payload.quantity,
        source="MAIN_WAREHOUSE",
        destination=payload.destination,
        priority=payload.priority,
        assigned_carrier=carrier,
        status="IN_TRANSIT"
    )
    db.add(task)
    
    # 4. Trigger WCS Cargo update if conveyor was assigned
    if carrier == "CONVEYOR_LINE_A":
        conveyor = db.query(WCSConveyorState).filter(WCSConveyorState.name == "MAIN_CONVEYOR").first()
        if conveyor and conveyor.status != "FAULTED":
            conveyor.is_running = True
            conveyor.speed_mps = 0.8
            conveyor.status = "ACTIVE"
            conveyor.current_cargo = f"{payload.quantity}x {payload.material_type}"

    db.commit()
    db.refresh(task)

    return {
        "status": "success",
        "message": f"WES Task {task.id} scheduled. {payload.quantity} {payload.material_type} in transit.",
        "task": {
            "id": task.id,
            "material_type": task.material_type,
            "quantity": task.quantity,
            "carrier": task.assigned_carrier,
            "priority": task.priority,
            "status": task.status
        }
    }

@router.get("/tasks", response_model=List[Dict[str, Any]])
def get_movement_tasks(db: Session = Depends(deps.get_db)) -> Any:
    """Retrieve active and completed WES logistics movement workflow tasks."""
    tasks = db.query(WESMovementTask).order_by(WESMovementTask.created_at.desc()).limit(30).all()
    return [
        {
            "id": t.id,
            "material_type": t.material_type,
            "quantity": t.quantity,
            "source": t.source,
            "destination": t.destination,
            "priority": t.priority,
            "assigned_carrier": t.assigned_carrier,
            "status": t.status,
            "created_at": t.created_at,
            "updated_at": t.updated_at
        }
        for t in tasks
    ]

@router.post("/tasks/{task_id}/complete", response_model=Dict[str, Any])
def complete_movement_task(task_id: int, db: Session = Depends(deps.get_db)) -> Any:
    """Complete a WES movement task. Simulates delivery at destination station."""
    task = db.query(WESMovementTask).filter(WESMovementTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="WES logistics task not found.")

    if task.status == "COMPLETED":
        return {"status": "already_completed", "message": f"Task {task_id} is already completed."}

    task.status = "COMPLETED"
    task.updated_at = datetime.utcnow()

    # Clear Conveyor cargo payload if it was carrying it
    if task.assigned_carrier == "CONVEYOR_LINE_A":
        conveyor = db.query(WCSConveyorState).filter(WCSConveyorState.name == "MAIN_CONVEYOR").first()
        if conveyor and conveyor.current_cargo and task.material_type in conveyor.current_cargo:
            conveyor.current_cargo = None
            conveyor.status = "IDLE"
            conveyor.speed_mps = 0.0
            conveyor.is_running = False

    db.commit()
    return {"status": "success", "message": f"Task {task_id} marked COMPLETED."}

@router.get("/conveyor", response_model=Dict[str, Any])
def get_conveyor_state(db: Session = Depends(deps.get_db)) -> Any:
    """Retrieve WCS conveyor equipment control dashboard status telemetry."""
    conveyor = db.query(WCSConveyorState).filter(WCSConveyorState.name == "MAIN_CONVEYOR").first()
    if not conveyor:
        # Setup fallback default conveyor state
        conveyor = WCSConveyorState(
            name="MAIN_CONVEYOR",
            is_running=False,
            speed_mps=0.0,
            direction="FORWARD",
            motor_temp=38.4,
            current_cargo=None,
            status="IDLE"
        )
        db.add(conveyor)
        db.commit()
        db.refresh(conveyor)

    return {
        "id": conveyor.id,
        "name": conveyor.name,
        "is_running": conveyor.is_running,
        "speed_mps": float(conveyor.speed_mps),
        "direction": conveyor.direction,
        "motor_temp": float(conveyor.motor_temp),
        "current_cargo": conveyor.current_cargo,
        "status": conveyor.status,
        "error_message": conveyor.error_message,
        "last_ping": conveyor.last_ping
    }

@router.post("/conveyor/control", response_model=Dict[str, Any])
def control_conveyor(payload: ConveyorControlSchema, db: Session = Depends(deps.get_db)) -> Any:
    """WCS equipment direct control dispatcher. Simulates SCADA PLC override triggers."""
    conveyor = db.query(WCSConveyorState).filter(WCSConveyorState.name == "MAIN_CONVEYOR").first()
    if not conveyor:
        raise HTTPException(status_code=404, detail="WCS main conveyor module not registered.")

    cmd = payload.command.upper()

    if cmd == "START":
        if conveyor.status == "FAULTED":
            raise HTTPException(status_code=400, detail="Cannot start conveyor while in FAULTED state. Clear fault first.")
        conveyor.is_running = True
        conveyor.speed_mps = payload.speed if payload.speed > 0 else 0.5
        conveyor.status = "ACTIVE"
        conveyor.error_message = None
        conveyor.motor_temp = 42.5
    elif cmd == "STOP":
        conveyor.is_running = False
        conveyor.speed_mps = 0.0
        conveyor.status = "IDLE"
        conveyor.motor_temp = 36.2
    elif cmd == "REVERSE":
        conveyor.direction = "REVERSE" if conveyor.direction == "FORWARD" else "FORWARD"
    elif cmd == "ADJUST_SPEED":
        if conveyor.is_running:
            conveyor.speed_mps = payload.speed
            conveyor.motor_temp = 38.0 + (payload.speed * 10) # Simulated physical heat build
    elif cmd == "TRIGGER_FAULT":
        conveyor.is_running = False
        conveyor.speed_mps = 0.0
        conveyor.status = "FAULTED"
        conveyor.error_message = "OVERHEAT DETECTED: Motor coil thermal limit exceeded (85.4 C)."
        conveyor.motor_temp = 85.4
        
        # Dispatch critical SCADA alert in DB
        from backend.app.db.models import Alert
        fault_alert = Alert(
            machine_id=1, # CNC machine anchor
            timestamp=datetime.utcnow(),
            alert_type="WCS FAULT",
            severity="CRITICAL",
            message="WCS ALARM: Conveyor belt motor overhead trip (Coil Temp: 85.4 C). Halted immediately.",
            status="ACTIVE"
        )
        db.add(fault_alert)
    elif cmd == "CLEAR_FAULT":
        conveyor.status = "IDLE"
        conveyor.is_running = False
        conveyor.speed_mps = 0.0
        conveyor.error_message = None
        conveyor.motor_temp = 39.0

    conveyor.last_ping = datetime.utcnow()
    db.commit()

    return {
        "status": "success",
        "message": f"Conveyor command {cmd} dispatched successfully.",
        "conveyor": {
            "is_running": conveyor.is_running,
            "speed_mps": float(conveyor.speed_mps),
            "status": conveyor.status,
            "motor_temp": float(conveyor.motor_temp),
            "direction": conveyor.direction
        }
    }
