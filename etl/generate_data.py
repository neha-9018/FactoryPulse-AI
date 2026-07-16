import os
import json
import csv
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Set random seed for reproducibility
random.seed(42)
np.random.seed(42)

DATASETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets")

# Ensure datasets directory exists
os.makedirs(DATASETS_DIR, exist_ok=True)

# 1. Machine Configurations (JSON)
MACHINES_CONFIG = [
    {
        "id": 1,
        "name": "CNC Milling Machine Alpha",
        "type": "CNC_MILLING",
        "location": "Bay A - Precision Machining",
        "status": "OPERATIONAL",
        "installation_date": "2024-01-15"
    },
    {
        "id": 2,
        "name": "Industrial Robot Arm Beta",
        "type": "ROBOT_ARM",
        "location": "Bay B - Welding & Assembly",
        "status": "OPERATIONAL",
        "installation_date": "2024-03-10"
    },
    {
        "id": 3,
        "name": "Injection Molding Gamma",
        "type": "INJECTION_MOLDING",
        "location": "Bay C - Plastics",
        "status": "OPERATIONAL",
        "installation_date": "2023-11-20"
    },
    {
        "id": 4,
        "name": "Hydraulic Press Delta",
        "type": "HYDRAULIC_PRESS",
        "location": "Bay D - Heavy Stamping",
        "status": "MAINTENANCE",
        "installation_date": "2023-08-05"
    },
    {
        "id": 5,
        "name": "Packaging Conveyor Epsilon",
        "type": "CONVEYOR",
        "location": "Bay E - Packaging & Shipping",
        "status": "OPERATIONAL",
        "installation_date": "2024-05-01"
    }
]

def save_machines_json():
    filepath = os.path.join(DATASETS_DIR, "machines.json")
    with open(filepath, "w") as f:
        json.dump(MACHINES_CONFIG, f, indent=4)
    print(f"[SUCCESS] Saved machine configurations to {filepath}")

# 2. Sensor Data & Production Generation (CSV & Excel)
def generate_factory_datasets(days=30, interval_minutes=2):
    start_time = datetime.utcnow() - timedelta(days=days)
    start_time = start_time.replace(minute=0, second=0, microsecond=0)
    total_steps = int((days * 24 * 60) / interval_minutes)
    
    print(f"Generating {total_steps * len(MACHINES_CONFIG):,} rows of sensor readings across {days} days...")
    
    sensor_rows = []
    production_rows = []
    maintenance_rows = []
    
    # Initialize running machine stats to simulate continuous wear & tear
    machine_age_factor = {m["id"]: 0.0 for m in MACHINES_CONFIG}
    
    # Generate historical maintenance records
    for m in MACHINES_CONFIG:
        # Pre-populate 2-3 historical maintenance logs
        num_logs = random.randint(2, 4)
        for i in range(num_logs):
            log_date = start_time + timedelta(days=random.randint(1, days-5))
            m_type = random.choice(["PREVENTIVE", "CORRECTIVE"])
            duration = round(random.uniform(1.5, 6.0), 1)
            cost = round(duration * random.uniform(80, 150) + random.uniform(100, 500), 2)
            technician = random.choice(["Kenji Sato", "Hiroshi Tanaka", "Yuki Watanabe", "Takashi Oda"])
            desc = f"Routine {m_type.lower()} maintenance and parts replacement for {m['name']}."
            maintenance_rows.append({
                "machine_id": m["id"],
                "log_date": log_date.strftime("%Y-%m-%d %H:%M:%S"),
                "maintenance_type": m_type,
                "description": desc,
                "technician": technician,
                "duration_hours": duration,
                "cost": cost
            })
            
    # Main simulation loop
    current_time = start_time
    shift_production_accum = {m["id"]: {"count": 0, "defects": 0, "hours": 0} for m in MACHINES_CONFIG}
    
    for step in range(total_steps):
        # Determine shift type based on hour
        hour = current_time.hour
        if 6 <= hour < 14:
            shift_type = "MORNING"
        elif 14 <= hour < 22:
            shift_type = "AFTERNOON"
        else:
            shift_type = "NIGHT"
            
        for m in MACHINES_CONFIG:
            m_id = m["id"]
            m_type = m["type"]
            
            # Gradually increase age factor (wear & tear simulation)
            machine_age_factor[m_id] += 0.00001
            
            # Base machine physics
            if m_type == "CNC_MILLING":
                base_temp = 60.0
                base_press = 100.0
                base_vib = 2.5
                base_rpm = 2400.0
                base_current = 8.5
            elif m_type == "ROBOT_ARM":
                base_temp = 45.0
                base_press = 50.0
                base_vib = 1.8
                base_rpm = 0.0 # N/A or static
                base_current = 12.0
            elif m_type == "INJECTION_MOLDING":
                base_temp = 180.0 # Heat critical
                base_press = 150.0
                base_vib = 1.2
                base_rpm = 800.0
                base_current = 15.0
            elif m_type == "HYDRAULIC_PRESS":
                base_temp = 70.0
                base_press = 300.0 # Pressure critical
                base_vib = 4.5
                base_rpm = 0.0
                base_current = 22.0
            elif m_type == "CONVEYOR":
                base_temp = 38.0
                base_press = 10.0
                base_vib = 0.8
                base_rpm = 120.0
                base_current = 4.0
                
            # Random variations + age wear
            wear = machine_age_factor[m_id]
            temp = base_temp + np.random.normal(0, 1.5) + (wear * 15.0)
            press = base_press + np.random.normal(0, 5.0) + (wear * 20.0)
            vib = base_vib + np.random.normal(0, 0.2) + (wear * 1.5)
            rpm = base_rpm + np.random.normal(0, 10.0) if base_rpm > 0 else 0.0
            curr = base_current + np.random.normal(0, 0.5) + (wear * 2.0)
            volts = 220.0 + np.random.normal(0, 1.2)
            humid = 45.0 + np.random.normal(0, 1.0)
            energy = round((curr * volts * (interval_minutes / 60)) / 1000.0, 4) # kWh
            
            # Inject random anomalies (approx 0.5% chance)
            is_anomaly = False
            if random.random() < 0.005:
                is_anomaly = True
                anomaly_type = random.choice(["OVERHEAT", "PRESSURE_SPIKE", "VIBRATION_SPIKE", "VOLTAGE_DROP"])
                if anomaly_type == "OVERHEAT":
                    temp += random.uniform(25.0, 50.0)
                elif anomaly_type == "PRESSURE_SPIKE":
                    press += random.uniform(80.0, 150.0)
                elif anomaly_type == "VIBRATION_SPIKE":
                    vib += random.uniform(3.5, 6.0)
                elif anomaly_type == "VOLTAGE_DROP":
                    volts -= random.uniform(30.0, 50.0)
            
            # Append sensor record
            sensor_rows.append([
                m_id,
                current_time.strftime("%Y-%m-%d %H:%M:%S"),
                round(temp, 2),
                round(press, 2),
                round(humid, 2),
                round(volts, 2),
                round(curr, 2),
                round(rpm, 2),
                round(vib, 2),
                round(energy, 4),
                1 if is_anomaly else 0
            ])
            
            # Accumulate production & defect stats
            # base yield per 2 minutes
            base_yield = random.randint(3, 8) if m["status"] == "OPERATIONAL" else 0
            defect_prob = 0.01 + (wear * 0.1) # increases with wear
            if temp > (base_temp + 20) or vib > (base_vib + 2.0):
                defect_prob += 0.15 # poor machine health causes defects!
                
            yield_parts = 0
            defects = 0
            for _ in range(base_yield):
                yield_parts += 1
                if random.random() < defect_prob:
                    defects += 1
                    
            shift_production_accum[m_id]["count"] += yield_parts
            shift_production_accum[m_id]["defects"] += defects
            
        # End of shift check (approx every 8 hours)
        if current_time.hour in [5, 13, 21] and current_time.minute == 58:
            for m in MACHINES_CONFIG:
                m_id = m["id"]
                p_count = shift_production_accum[m_id]["count"]
                d_count = shift_production_accum[m_id]["defects"]
                
                # OEE calculation: Availability * Performance * Quality
                # Availability: mock (mostly 95-98% unless in maintenance)
                avail = 0.0 if m["status"] == "OFFLINE" else random.uniform(0.92, 0.99)
                # Performance: actual count / expected count
                expected = 1200 # parts per shift expected
                perf = min(1.0, p_count / expected) if expected > 0 else 0
                # Quality: good / total
                qual = (p_count - d_count) / p_count if p_count > 0 else 1.0
                
                oee = round((avail * perf * qual) * 100, 2)
                
                production_rows.append({
                    "machine_id": m_id,
                    "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "shift_type": shift_type,
                    "production_count": p_count,
                    "defect_count": d_count,
                    "oee_score": oee
                })
                
                # Reset shift accumulator
                shift_production_accum[m_id] = {"count": 0, "defects": 0, "hours": 0}
                
        current_time += timedelta(minutes=interval_minutes)
        
    # Write sensor data to CSV
    sensor_filepath = os.path.join(DATASETS_DIR, "sensor_data.csv")
    with open(sensor_filepath, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "machine_id", "timestamp", "temperature", "pressure", "humidity",
            "voltage", "current", "rpm", "vibration", "energy_consumption", "is_anomaly"
        ])
        writer.writerows(sensor_rows)
    print(f"[SUCCESS] Saved {len(sensor_rows):,} sensor readings to {sensor_filepath}")
    
    # Write production data to Excel
    prod_df = pd.DataFrame(production_rows)
    prod_filepath = os.path.join(DATASETS_DIR, "production_data.xlsx")
    prod_df.to_excel(prod_filepath, index=False, sheet_name="Shift Production")
    print(f"[SUCCESS] Saved {len(production_rows):,} production shift records to {prod_filepath}")
    
    # Write maintenance data to CSV
    maint_df = pd.DataFrame(maintenance_rows)
    maint_filepath = os.path.join(DATASETS_DIR, "maintenance_data.csv")
    maint_df.to_excel(maint_filepath.replace(".csv", ".xlsx"), index=False, sheet_name="Maintenance Logs")
    maint_df.to_csv(maint_filepath, index=False)
    print(f"[SUCCESS] Saved {len(maintenance_rows):,} maintenance logs to {maint_filepath}")

if __name__ == "__main__":
    print("Initializing mock manufacturing data generation...")
    save_machines_json()
    # Generate 30 days of data at 2 minute intervals -> ~108,000 records
    generate_factory_datasets(days=30, interval_minutes=2)
    print("Factory data simulation complete!")
