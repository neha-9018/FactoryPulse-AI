import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from backend.app.db.session import engine, SessionLocal
from backend.app.db.models import Base, User
from backend.app.core.security import get_password_hash

# Set up endpoints
from backend.app.api.endpoints import auth, machines, dashboard, alerts, predictions, quality, chatbot
from computer_vision.generate_demo_images import generate_demo_parts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(
    title="AI Manufacturing Data Platform API",
    description="Industry 4.0 Smart Factory analytics and operations API",
    version="1.0.0"
)

# CORS Policy configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount datasets directory to serve static uploaded and demo images
DATASETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets")
os.makedirs(DATASETS_DIR, exist_ok=True)
app.mount("/datasets", StaticFiles(directory=DATASETS_DIR), name="datasets")

# Startup Seeding Event
@app.on_event("startup")
def startup_db_setup():
    """Ensure database tables exist, seed demo users, and generate demo parts images for CV testing."""
    try:
        logger.info("Verifying tables exist...")
        Base.metadata.create_all(bind=engine)
        
        # Dynamically verify and alter SQLite tables to add columns if they don't exist
        from sqlalchemy import text
        with engine.connect() as conn:
            for col, col_type in [("emp_id", "VARCHAR(50)"), ("shift_zone", "VARCHAR(100)"), ("clearance_level", "VARCHAR(100)")]:
                try:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                    conn.commit()
                    logger.info(f"Dynamically added column {col} to users table.")
                except Exception as ex:
                    pass # column already exists
        
        # Programmatically seed demo parts images
        try:
            generate_demo_parts()
        except Exception as cve:
            logger.error(f"Error generating demo parts images: {cve}")

        db = SessionLocal()
        try:
            logger.info("Syncing system users...")
            users_to_seed = [
                {"username": "admin", "email": "admin@meidensha.com", "password": "admin123", "role": "ADMIN"},
                {"username": "neha_yadav", "email": "neha@meidensha.com", "password": "admin123", "role": "ADMIN"},
                {"username": "engineer_satoh", "email": "satoh@meidensha.com", "password": "admin123", "role": "ENGINEER"},
                {"username": "operator_suzuki", "email": "suzuki@meidensha.com", "password": "admin123", "role": "OPERATOR"},
                {"username": "engineer", "email": "engineer@meidensha.com", "password": "Password123", "role": "ENGINEER"},
                {"username": "operator", "email": "operator@meidensha.com", "password": "Password123", "role": "OPERATOR"},
            ]
            
            for u_data in users_to_seed:
                user = db.query(User).filter(User.username == u_data["username"]).first()
                if not user:
                    user = User(
                        username=u_data["username"],
                        email=u_data["email"],
                        password_hash=get_password_hash(u_data["password"]),
                        role=u_data["role"],
                        is_active=True
                    )
                    db.add(user)
                    logger.info(f"Seeded user: {u_data['username']}")
                else:
                    # Update password to ensure it matches
                    user.password_hash = get_password_hash(u_data["password"])
                    user.role = u_data["role"]
                    logger.info(f"Updated user credentials: {u_data['username']}")
            
            db.commit()
            logger.info("[SUCCESS] Seeding complete!")
            
            # Seed initial predictions for all machines so the dashboard is immediately populated
            from backend.app.db.models import Machine, SensorData, Prediction
            from ml.predict import MaintenancePredictor
            from datetime import datetime
            
            logger.info("Seeding initial predictive health scores...")
            predictor = MaintenancePredictor()
            machines = db.query(Machine).all()
            for m in machines:
                latest_reading = db.query(SensorData).filter(
                    SensorData.machine_id == m.id
                ).order_by(SensorData.timestamp.desc()).first()
                
                if latest_reading:
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
                    
                    # Create prediction record
                    pred_record = Prediction(
                        machine_id=m.id,
                        timestamp=datetime.utcnow(),
                        failure_probability=result["failure_probability"],
                        health_score=result["health_score"],
                        recommendation=result["recommendation"]
                    )
                    db.add(pred_record)
            db.commit()
            logger.info("[SUCCESS] Prediction seeding complete!")
            
            # Seed initial quality inspections in database to match the 1540 starting metrics
            from backend.app.db.models import QualityInspection
            inspections_count = db.query(QualityInspection).count()
            if inspections_count < 1540:
                logger.info(f"Pre-seeding database with 1540 historical CV quality inspection records (previous count: {inspections_count})...")
                db.query(QualityInspection).delete()
                db.commit()
                records = []
                # 1. 1485 PASS records
                for i in range(1485):
                    records.append(QualityInspection(
                        production_id=None,
                        machine_id=1,
                        timestamp=datetime.utcnow(),
                        defect_type="NONE",
                        inspection_status="PASS",
                        confidence_score=0.98,
                        image_path=""
                    ))
                # 2. 55 FAIL records matching exact distribution
                defect_counts = {
                    "LABEL_MISSING": 10,
                    "SURFACE_CRACK": 15,
                    "DAMAGE": 5,
                    "WRONG_COLOR": 12,
                    "WRONG_PACKAGING": 3,
                    "WRONG_DIMENSION": 10
                }
                for defect, count in defect_counts.items():
                    for i in range(count):
                        records.append(QualityInspection(
                            production_id=None,
                            machine_id=1,
                            timestamp=datetime.utcnow(),
                            defect_type=defect,
                            inspection_status="FAIL",
                            confidence_score=0.92,
                            image_path=""
                        ))
                db.bulk_save_objects(records)
                db.commit()
                logger.info("[SUCCESS] Seeding of 1540 quality inspections complete!")
        except Exception as se:
            db.rollback()
            logger.error(f"Error seeding demo users: {se}")
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Could not connect to database on startup: {e}")

# Include Router endpoints
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(machines.router, prefix="/api/v1/machines", tags=["Machines Master"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Analytics Dashboard"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Factory Alerts"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["ML Predictive Maintenance"])
app.include_router(quality.router, prefix="/api/v1/quality", tags=["CV Quality Inspection"])
app.include_router(chatbot.router, prefix="/api/v1/chatbot", tags=["AI Manufacturing Assistant"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AI Manufacturing Data Platform Ingestion Backend",
        "documentation": "/docs"
    }
