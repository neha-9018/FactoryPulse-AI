import unittest
import pandas as pd
import numpy as np
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from etl.etl_pipeline import transform_and_load_sensor_data, transform_and_load_production

class MockDB:
    def __init__(self):
        self.inserted_sensor_records = []
        self.inserted_production_records = []
        self.committed = False
        
    def bulk_insert_mappings(self, model_class, records):
        if model_class.__name__ == "SensorData":
            self.inserted_sensor_records.extend(records)
        elif model_class.__name__ == "Production":
            self.inserted_production_records.extend(records)
            
    def commit(self):
        self.committed = True
        
    def rollback(self):
        pass

class TestETLPipeline(unittest.TestCase):
    
    def test_sensor_data_transformation(self):
        # Create small mock DataFrame containing duplicates, missing values, and anomalies
        mock_data = pd.DataFrame([
            {
                "machine_id": 1,
                "timestamp": "2026-07-01 08:00:00",
                "temperature": 55.0,
                "pressure": 100.0,
                "humidity": 45.0,
                "voltage": 220.0,
                "current": 8.0,
                "rpm": 1200.0,
                "vibration": 1.5,
                "energy_consumption": 0.5,
                "is_anomaly": 0
            },
            # Duplicate record
            {
                "machine_id": 1,
                "timestamp": "2026-07-01 08:00:00",
                "temperature": 55.0,
                "pressure": 100.0,
                "humidity": 45.0,
                "voltage": 220.0,
                "current": 8.0,
                "rpm": 1200.0,
                "vibration": 1.5,
                "energy_consumption": 0.5,
                "is_anomaly": 0
            },
            # Missing value record
            {
                "machine_id": 1,
                "timestamp": "2026-07-01 08:02:00",
                "temperature": np.nan,  # should be interpolated
                "pressure": 102.0,
                "humidity": 44.0,
                "voltage": 221.0,
                "current": 8.1,
                "rpm": 1205.0,
                "vibration": 1.6,
                "energy_consumption": 0.6,
                "is_anomaly": 0
            },
            {
                "machine_id": 1,
                "timestamp": "2026-07-01 08:04:00",
                "temperature": 57.0,
                "pressure": 104.0,
                "humidity": 43.0,
                "voltage": 220.0,
                "current": 8.2,
                "rpm": 1210.0,
                "vibration": 1.7,
                "energy_consumption": 0.7,
                "is_anomaly": 0
            }
        ])
        
        db = MockDB()
        transform_and_load_sensor_data(db, mock_data)
        
        # Verify duplicates removed (3 unique rows instead of 4)
        self.assertEqual(len(db.inserted_sensor_records), 3)
        
        # Verify interpolation (value between 55.0 and 57.0 should be ~56.0)
        interpolated_temp = db.inserted_sensor_records[1]["temperature"]
        self.assertAlmostEqual(interpolated_temp, 56.0)
        
    def test_production_oee_calculation(self):
        # Create mock production logs
        mock_data = pd.DataFrame([
            {
                "machine_id": 1,
                "timestamp": "2026-07-01 14:00:00",
                "shift_type": "MORNING",
                "production_count": 800,
                "defect_count": 20,
                "oee_score": np.nan # should be computed
            },
            {
                "machine_id": 2,
                "timestamp": "2026-07-01 14:00:00",
                "shift_type": "MORNING",
                "production_count": 900,
                "defect_count": 0,
                "oee_score": 92.5 # should be kept as-is
            }
        ])
        
        db = MockDB()
        transform_and_load_production(db, mock_data)
        
        self.assertEqual(len(db.inserted_production_records), 2)
        
        # Verify first OEE score was computed:
        # Availability (0.95) * Performance (800 / 1000 = 0.8) * Quality (780 / 800 = 0.975) = 0.741 -> 74.1%
        oee_computed = db.inserted_production_records[0]["oee_score"]
        self.assertAlmostEqual(oee_computed, 74.1)
        
        # Verify second OEE score remains as-is
        oee_kept = db.inserted_production_records[1]["oee_score"]
        self.assertEqual(oee_kept, 92.5)

if __name__ == "__main__":
    unittest.main()
