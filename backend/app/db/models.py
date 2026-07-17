from sqlalchemy import Column, Integer, String, Boolean, Numeric, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # ADMIN, ENGINEER, OPERATOR, MANAGER
    is_active = Column(Boolean, default=True)
    emp_id = Column(String(50), nullable=True)
    shift_zone = Column(String(100), nullable=True)
    clearance_level = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    type = Column(String(50), nullable=False)
    location = Column(String(100))
    status = Column(String(20), default="OPERATIONAL")  # OPERATIONAL, MAINTENANCE, OFFLINE, FAILING
    installation_date = Column(Date)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sensors_data = relationship("SensorData", back_populates="machine", cascade="all, delete-orphan")
    production_records = relationship("Production", back_populates="machine", cascade="all, delete-orphan")
    quality_inspections = relationship("QualityInspection", back_populates="machine", cascade="all, delete-orphan")
    maintenance_logs = relationship("MaintenanceLog", back_populates="machine", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="machine", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="machine", cascade="all, delete-orphan")


class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    temperature = Column(Numeric(6, 2), nullable=False)
    pressure = Column(Numeric(6, 2), nullable=False)
    humidity = Column(Numeric(5, 2), nullable=False)
    voltage = Column(Numeric(5, 2), nullable=False)
    current = Column(Numeric(5, 2), nullable=False)
    rpm = Column(Numeric(6, 2), nullable=False)
    vibration = Column(Numeric(5, 2), nullable=False)
    energy_consumption = Column(Numeric(6, 2), nullable=False)
    is_anomaly = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    machine = relationship("Machine", back_populates="sensors_data")


class Production(Base):
    __tablename__ = "production"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    shift_type = Column(String(20), nullable=False)  # MORNING, AFTERNOON, NIGHT
    production_count = Column(Integer, nullable=False, default=0)
    defect_count = Column(Integer, nullable=False, default=0)
    oee_score = Column(Numeric(5, 2))  # Overall Equipment Effectiveness
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    machine = relationship("Machine", back_populates="production_records")
    inspections = relationship("QualityInspection", back_populates="production")


class QualityInspection(Base):
    __tablename__ = "quality_inspection"

    id = Column(Integer, primary_key=True, index=True)
    production_id = Column(Integer, ForeignKey("production.id", ondelete="SET NULL"))
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    defect_type = Column(String(50))  # NONE, LABEL_MISSING, SURFACE_CRACK, DAMAGE, WRONG_COLOR, WRONG_PACKAGING, WRONG_DIMENSION
    inspection_status = Column(String(10), nullable=False, index=True)  # PASS, FAIL
    confidence_score = Column(Numeric(4, 3), nullable=False)
    image_path = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    machine = relationship("Machine", back_populates="quality_inspections")
    production = relationship("Production", back_populates="inspections")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    log_date = Column(DateTime(timezone=True), nullable=False)
    maintenance_type = Column(String(20), nullable=False)  # PREVENTIVE, CORRECTIVE, PREDICTIVE
    description = Column(Text, nullable=False)
    technician = Column(String(100), nullable=False)
    duration_hours = Column(Numeric(4, 2), nullable=False)
    cost = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    machine = relationship("Machine", back_populates="maintenance_logs")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    failure_probability = Column(Numeric(4, 3), nullable=False)
    health_score = Column(Numeric(5, 2), nullable=False)
    recommendation = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    machine = relationship("Machine", back_populates="predictions")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False, index=True)  # INFO, WARNING, CRITICAL
    message = Column(Text, nullable=False)
    status = Column(String(20), default="ACTIVE", index=True)  # ACTIVE, ACKNOWLEDGED, RESOLVED
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    machine = relationship("Machine", back_populates="alerts")
