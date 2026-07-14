import os
import sys
import unittest
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from ml.predict import MaintenancePredictor

class TestMLPipeline(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        try:
            cls.predictor = MaintenancePredictor()
        except Exception as e:
            raise unittest.SkipTest(f"ML artifacts not found. Skipping ML tests: {e}")

    def test_predictor_bounds(self):
        # 1. Test nominal input values (should predict HEALTHY)
        res = self.predictor.predict_health(
            temperature=60.0,
            pressure=100.0,
            humidity=45.0,
            voltage=220.0,
            current=8.0,
            rpm=2000.0,
            vibration=1.5,
            energy=1.2
        )
        
        self.assertIn("health_score", res)
        self.assertIn("failure_probability", res)
        self.assertIn("status", res)
        self.assertIn("recommendation", res)
        
        self.assertTrue(0.0 <= res["failure_probability"] <= 1.0)
        self.assertTrue(0.0 <= res["health_score"] <= 100.0)
        self.assertEqual(res["status"], "HEALTHY")
        
    def test_predictor_anomaly(self):
        # 2. Test extreme high vibration input values (should predict FAILING or WARNING)
        res = self.predictor.predict_health(
            temperature=95.0,
            pressure=250.0,
            humidity=45.0,
            voltage=220.0,
            current=8.0,
            rpm=2000.0,
            vibration=8.5, # very high vibration anomaly
            energy=1.2
        )
        
        self.assertTrue(res["failure_probability"] > 0.5)
        self.assertTrue(res["health_score"] < 50.0)
        self.assertIn(res["status"], ["WARNING", "FAILING"])
        self.assertTrue(len(res["recommendation"]) > 0)

if __name__ == "__main__":
    unittest.main()
