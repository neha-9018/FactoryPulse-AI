import os
import unittest
import json
import pandas as pd
import numpy as np

DATASETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets")

class TestDataGenerator(unittest.TestCase):
    
    def test_machines_json(self):
        filepath = os.path.join(DATASETS_DIR, "machines.json")
        self.assertTrue(os.path.exists(filepath), f"File not found: {filepath}")
        
        with open(filepath, "r") as f:
            machines = json.load(f)
            
        self.assertEqual(len(machines), 5)
        for m in machines:
            self.assertIn("id", m)
            self.assertIn("name", m)
            self.assertIn("type", m)
            self.assertIn("location", m)
            self.assertIn("status", m)
            
    def test_sensor_data_csv(self):
        filepath = os.path.join(DATASETS_DIR, "sensor_data.csv")
        self.assertTrue(os.path.exists(filepath), f"File not found: {filepath}")
        
        df = pd.read_csv(filepath)
        self.assertGreaterEqual(len(df), 100000, "Should generate at least 100,000 rows")
        
        expected_cols = [
            "machine_id", "timestamp", "temperature", "pressure", "humidity",
            "voltage", "current", "rpm", "vibration", "energy_consumption", "is_anomaly"
        ]
        for col in expected_cols:
            self.assertIn(col, df.columns)
            
        # Check physical bounds
        self.assertTrue((df["temperature"] > 0).all(), "Temperature must be positive")
        self.assertTrue((df["vibration"] >= 0).all(), "Vibration must be non-negative")
        
    def test_production_data_xlsx(self):
        filepath = os.path.join(DATASETS_DIR, "production_data.xlsx")
        self.assertTrue(os.path.exists(filepath), f"File not found: {filepath}")
        
        df = pd.read_excel(filepath)
        self.assertGreater(len(df), 0, "Should generate production logs")
        
        expected_cols = [
            "machine_id", "timestamp", "shift_type", "production_count", "defect_count", "oee_score"
        ]
        for col in expected_cols:
            self.assertIn(col, df.columns)
            
    def test_maintenance_data_csv(self):
        filepath = os.path.join(DATASETS_DIR, "maintenance_data.csv")
        self.assertTrue(os.path.exists(filepath), f"File not found: {filepath}")
        
        df = pd.read_csv(filepath)
        self.assertGreater(len(df), 0, "Should generate maintenance records")
        
        expected_cols = [
            "machine_id", "log_date", "maintenance_type", "description", "technician", "duration_hours", "cost"
        ]
        for col in expected_cols:
            self.assertIn(col, df.columns)

if __name__ == "__main__":
    unittest.main()
