import os
import shutil
from typing import Any, Dict, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.api import deps
from backend.app.db.models import QualityInspection, Production, Machine, Alert
from computer_vision.inspector import QualityInspector

router = APIRouter()

# Directories for uploads
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "datasets", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize CV Inspector
inspector = QualityInspector()

class QualityStats(BaseModel):
    total_inspected: int
    passed_count: int
    failed_count: int
    pass_rate: float
    defect_distribution: Dict[str, int]

@router.post("/inspect", status_code=status.HTTP_201_CREATED)
def inspect_part_image(
    file: UploadFile = File(...),
    production_id: int = None,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    """Upload a part image and run computer vision quality inspection. Saves results in DB."""
    # 1. Save uploaded file to datasets/uploads/
    filename = f"{datetime.utcnow().timestamp()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Annotated image destination
    annotated_filename = f"annotated_{filename}"
    annotated_path = os.path.join(UPLOAD_DIR, annotated_filename)

    # 2. Run OpenCV Inferences
    try:
        cv_result = inspector.inspect_image(file_path, annotated_path)
    except Exception as e:
        # Cleanup file if fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=500,
            detail=f"Computer Vision inspection failed: {e}"
        )

    # 3. Lookup production record if supplied
    machine_id = 1 # default to CNC Milling
    if production_id:
        prod = db.query(Production).filter(Production.id == production_id).first()
        if prod:
            machine_id = prod.machine_id

    # 4. Save record to DB
    inspection_record = QualityInspection(
        production_id=production_id,
        machine_id=machine_id,
        timestamp=datetime.utcnow(),
        defect_type=cv_result["defect_type"],
        inspection_status=cv_result["status"],
        confidence_score=cv_result["confidence_score"],
        image_path=f"/datasets/uploads/{annotated_filename}" # return reference path
    )
    db.add(inspection_record)
    
    # 5. Optional: If fail, increment defect count on production shift log & check for PLC auto-stop limits
    if cv_result["status"] == "FAIL":
        if production_id:
            prod = db.query(Production).filter(Production.id == production_id).first()
            if prod:
                prod.defect_count += 1
                
        # Retrieve the last 2 quality inspections to check if we hit 3 consecutive failures
        recent = db.query(QualityInspection).filter(
            QualityInspection.machine_id == machine_id
        ).order_by(QualityInspection.timestamp.desc()).limit(2).all()
        
        if len(recent) >= 2 and all(r.inspection_status == "FAIL" for r in recent):
            # Trigger PLC Auto-Stop (set status to OFFLINE)
            m = db.query(Machine).filter(Machine.id == machine_id).first()
            if m and m.status != "OFFLINE":
                m.status = "OFFLINE"
                
                # Add PLC auto-stop alarm alert
                plc_alert = Alert(
                    machine_id=machine_id,
                    timestamp=datetime.utcnow(),
                    alert_type="PLC AUTO-STOP",
                    message=f"CRITICAL: Spindle halted automatically on {m.name} due to 3 consecutive defects.",
                    is_active=True
                )
                db.add(plc_alert)
            
    db.commit()
    db.refresh(inspection_record)
    
    return {
        "id": inspection_record.id,
        "status": cv_result["status"],
        "defect_type": cv_result["defect_type"],
        "confidence_score": cv_result["confidence_score"],
        "image_path": f"/datasets/uploads/{annotated_filename}"
    }

@router.get("/stats", response_model=QualityStats)
def get_quality_statistics(
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    """Retrieve yield stats and defect categories breakdown for quality charts."""
    total = db.query(QualityInspection).count()
    passed = db.query(QualityInspection).filter(QualityInspection.inspection_status == "PASS").count()
    failed = db.query(QualityInspection).filter(QualityInspection.inspection_status == "FAIL").count()
    
    pass_rate = round((passed / total) * 100, 2) if total > 0 else 100.0
    
    # Defect breakdowns
    breakdowns = db.query(
        QualityInspection.defect_type,
        func.count(QualityInspection.id)
    ).filter(
        QualityInspection.defect_type != "NONE"
    ).group_by(QualityInspection.defect_type).all()
    
    defect_dist = {str(k): int(v) for k, v in breakdowns}
    # Pre-populate empty standard defect categories for graph schema
    for cat in ["LABEL_MISSING", "SURFACE_CRACK", "DAMAGE", "WRONG_COLOR", "WRONG_PACKAGING", "WRONG_DIMENSION"]:
        if cat not in defect_dist:
            defect_dist[cat] = 0
            
    return {
        "total_inspected": total,
        "passed_count": passed,
        "failed_count": failed,
        "pass_rate": pass_rate,
        "defect_distribution": defect_dist
    }
