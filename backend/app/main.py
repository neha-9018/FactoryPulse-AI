import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.db.session import engine, SessionLocal
from backend.app.db.models import Base, User
from backend.app.core.security import get_password_hash

# Set up endpoints
from backend.app.api.endpoints import auth, machines, dashboard, alerts, predictions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(
    title="AI Manufacturing Data Platform API",
    description="Industry 4.0 Smart Factory analytics and operations API",
    version="1.0.0"
)

# CORS Policy configuration (for React dev client communication)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to dashboard domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup Seeding Event
@app.on_event("startup")
def startup_db_setup():
    """Ensure database tables exist and seed demo users for easy logging-in."""
    try:
        logger.info("Verifying tables exist...")
        Base.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        try:
            # Seed demo users if empty
            if db.query(User).count() == 0:
                logger.info("Seeding system users (Admin, Engineer, Operator)...")
                demo_users = [
                    User(
                        username="admin",
                        email="admin@meidensha.com",
                        password_hash=get_password_hash("Password123"),
                        role="ADMIN",
                        is_active=True
                    ),
                    User(
                        username="engineer",
                        email="engineer@meidensha.com",
                        password_hash=get_password_hash("Password123"),
                        role="ENGINEER",
                        is_active=True
                    ),
                    User(
                        username="operator",
                        email="operator@meidensha.com",
                        password_hash=get_password_hash("Password123"),
                        role="OPERATOR",
                        is_active=True
                    )
                ]
                db.add_all(demo_users)
                db.commit()
                logger.info("[SUCCESS] Seeding complete! Credentials: username/Password123")
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

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AI Manufacturing Data Platform Ingestion Backend",
        "documentation": "/docs"
    }
