import os
import sys
import json
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from psycopg2 import connect
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.app.db.session import engine, SessionLocal, DATABASE_URL, DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
from backend.app.db.models import Base, Machine, SensorData, Production, MaintenanceLog

# Setup logging
LOG_FILE = os.path.join(os.path.dirname(__file__), "etl.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)

DATASETS_DIR = os.path.join(os.path.dirname(__file__), "..", "datasets")

def create_database_if_not_exists():
    """Connect to default postgres DB and create target database if missing."""
    try:
        # Connect to system 'postgres' DB first
        conn = connect(
            dbname="postgres",
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
        exists = cursor.fetchone()
        
        if not exists:
            logging.info(f"Database '{DB_NAME}' does not exist. Creating database...")
            cursor.execute(f"CREATE DATABASE {DB_NAME}")
            logging.info(f"[SUCCESS] Database '{DB_NAME}' created successfully.")
        else:
            logging.info(f"Database '{DB_NAME}' already exists.")
            
        cursor.close()
        conn.close()
    except Exception as e:
        logging.error(f"Error checking/creating database: {e}")
        logging.warning("Proceeding assuming database already exists.")

def init_db_tables():
    """Create all relational tables defined in SQLAlchemy models."""
    try:
        logging.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logging.info("[SUCCESS] Database tables initialized successfully.")
    except Exception as e:
        logging.error(f"Failed to initialize database tables: {e}")
        sys.exit(1)

def extract_json(filename):
    filepath = os.path.join(DATASETS_DIR, filename)
    logging.info(f"Extracting JSON: {filepath}")
    with open(filepath, "r") as f:
        data = json.load(f)
    return data

def extract_csv(filename):
    filepath = os.path.join(DATASETS_DIR, filename)
    logging.info(f"Extracting CSV: {filepath}")
    return pd.read_csv(filepath)

def extract_excel(filename, sheet_name=None):
    filepath = os.path.join(DATASETS_DIR, filename)
    logging.info(f"Extracting Excel: {filepath}")
    return pd.read_excel(filepath, sheet_name=sheet_name)

def load_machines(db, machines_data):
    """Load/Upsert machines configs."""
    logging.info("Loading machines into database...")
    loaded_count = 0
    for m in machines_data:
        db_machine = db.query(Machine).filter(Machine.id == m["id"]).first()
        if not db_machine:
            db_machine = Machine(
                id=m["id"],
                name=m["name"],
                type=m["type"],
                location=m["location"],
                status=m["status"],
                installation_date=datetime.strptime(m["installation_date"], "%Y-%m-%d").date()
            )
            db.add(db_machine)
            loaded_count += 1
        else:
            # Update existing machine attributes
            db_machine.name = m["name"]
            db_machine.type = m["type"]
            db_machine.location = m["location"]
            db_machine.status = m["status"]
            
    db.commit()
    logging.info(f"[SUCCESS] Loaded {loaded_count} new machines. Configs synchronized.")

def transform_and_load_sensor_data(db, df):
    """Clean, detect outliers, transform, and load sensor readings in chunks."""
    logging.info("Transforming sensor data...")
    
    # 1. Drop duplicates
    initial_len = len(df)
    df = df.drop_duplicates(subset=["machine_id", "timestamp"])
    dup_removed = initial_len - len(df)
    if dup_removed > 0:
        logging.info(f"Removed {dup_removed} duplicate sensor readings.")
        
    # 2. Convert timestamps
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    
    # 3. Impute missing values (interpolate numeric values per machine)
    numeric_cols = [
        "temperature", "pressure", "humidity", "voltage", "current",
        "rpm", "vibration", "energy_consumption"
    ]
    for col in numeric_cols:
        if df[col].isnull().any():
            logging.warning(f"Imputing missing values in sensor column: {col}")
            df[col] = df.groupby("machine_id")[col].transform(lambda x: x.interpolate().ffill().bfill())
            
    # 4. Outlier detection using Z-score (threshold = 3.5)
    outlier_counts = 0
    for col in ["temperature", "pressure", "vibration"]:
        mean = df[col].mean()
        std = df[col].std()
        if std > 0:
            z_scores = (df[col] - mean) / std
            outliers = np.abs(z_scores) > 3.5
            outlier_counts += outliers.sum()
            # We flag these as anomalies if not already flagged
            df.loc[outliers, "is_anomaly"] = 1
            
    logging.info(f"Identified {outlier_counts} statistical outliers in physical readings (Z-score > 3.5).")
    
    # 5. Load in batches of 10,000 for database efficiency
    logging.info("Loading sensor data to PostgreSQL...")
    batch_size = 10000
    total_records = len(df)
    records_loaded = 0
    
    # Bulk insert using SQLAlchemy Core for high performance
    for start in range(0, total_records, batch_size):
        end = min(start + batch_size, total_records)
        chunk = df.iloc[start:end]
        
        # Convert df chunk to list of dicts mapped to db columns
        records = []
        for _, row in chunk.iterrows():
            records.append({
                "machine_id": int(row["machine_id"]),
                "timestamp": row["timestamp"].to_pydatetime(),
                "temperature": float(row["temperature"]),
                "pressure": float(row["pressure"]),
                "humidity": float(row["humidity"]),
                "voltage": float(row["voltage"]),
                "current": float(row["current"]),
                "rpm": float(row["rpm"]),
                "vibration": float(row["vibration"]),
                "energy_consumption": float(row["energy_consumption"]),
                "is_anomaly": bool(row["is_anomaly"])
            })
            
        # Use bulk insert mappings
        db.bulk_insert_mappings(SensorData, records)
        db.commit()
        records_loaded += len(records)
        logging.info(f"Loaded sensor chunk: {records_loaded}/{total_records} records...")
        
    logging.info(f"[SUCCESS] Successfully loaded {records_loaded} sensor logs.")

def transform_and_load_production(db, df):
    """Clean and calculate OEE for production shift logs before loading."""
    logging.info("Transforming production records...")
    
    # Clean duplicates
    df = df.drop_duplicates(subset=["machine_id", "timestamp"])
    
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    
    # Calculate OEE score if missing or invalid
    def calculate_oee(row):
        if pd.notnull(row["oee_score"]) and row["oee_score"] > 0:
            return row["oee_score"]
        # Basic mock OEE estimation: Yield score * Performance (production rate)
        p_count = row["production_count"]
        d_count = row["defect_count"]
        if p_count == 0:
            return 0.0
        quality = (p_count - d_count) / p_count
        # Target nominal production is 1000 parts per shift
        performance = min(1.0, p_count / 1000.0)
        availability = 0.95 # assume standard uptime
        return round((availability * performance * quality) * 100.0, 2)

    df["oee_score"] = df.apply(calculate_oee, axis=1)
    
    # Load production logs
    logging.info("Loading production records to PostgreSQL...")
    records = []
    for _, row in df.iterrows():
        records.append({
            "machine_id": int(row["machine_id"]),
            "timestamp": row["timestamp"].to_pydatetime(),
            "shift_type": str(row["shift_type"]),
            "production_count": int(row["production_count"]),
            "defect_count": int(row["defect_count"]),
            "oee_score": float(row["oee_score"])
        })
        
    db.bulk_insert_mappings(Production, records)
    db.commit()
    logging.info(f"[SUCCESS] Successfully loaded {len(records)} production records.")

def transform_and_load_maintenance(db, df):
    """Load maintenance history into database."""
    logging.info("Transforming and loading maintenance logs...")
    
    df["log_date"] = pd.to_datetime(df["log_date"])
    
    records = []
    for _, row in df.iterrows():
        records.append({
            "machine_id": int(row["machine_id"]),
            "log_date": row["log_date"].to_pydatetime(),
            "maintenance_type": str(row["maintenance_type"]),
            "description": str(row["description"]),
            "technician": str(row["technician"]),
            "duration_hours": float(row["duration_hours"]),
            "cost": float(row["cost"])
        })
        
    db.bulk_insert_mappings(MaintenanceLog, records)
    db.commit()
    logging.info(f"[SUCCESS] Successfully loaded {len(records)} maintenance logs.")

def run_etl():
    logging.info("=" * 60)
    logging.info("Starting ETL Pipeline Execution")
    logging.info("=" * 60)
    
    start_time = datetime.now()
    
    # Create DB if needed
    create_database_if_not_exists()
    
    # Init tables
    init_db_tables()
    
    db = SessionLocal()
    try:
        # Extract files
        machines_data = extract_json("machines.json")
        sensor_df = extract_csv("sensor_data.csv")
        production_df = extract_excel("production_data.xlsx")
        maintenance_df = extract_csv("maintenance_data.csv")
        
        # Truncate tables for fresh import (since this is Milestone 1 setup)
        logging.info("Clearing existing table records for fresh import...")
        db.query(MaintenanceLog).delete()
        db.query(Production).delete()
        db.query(SensorData).delete()
        db.query(Machine).delete()
        db.commit()
        
        # Load tables
        load_machines(db, machines_data)
        transform_and_load_sensor_data(db, sensor_df)
        transform_and_load_production(db, production_df)
        transform_and_load_maintenance(db, maintenance_df)
        
        duration = datetime.now() - start_time
        logging.info("=" * 60)
        logging.info(f"ETL Execution Completed Successfully in {duration.total_seconds():.2f} seconds!")
        logging.info("=" * 60)
        
    except Exception as e:
        db.rollback()
        logging.error(f"CRITICAL: ETL Pipeline Failed: {e}", exc_info=True)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_etl()
