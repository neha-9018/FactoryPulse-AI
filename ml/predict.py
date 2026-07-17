import os
import sys
import pickle
import numpy as np

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

class MaintenancePredictor:
    def __init__(self):
        self.scaler_path = os.path.join(MODELS_DIR, "scaler.pkl")
        self.model_path = os.path.join(MODELS_DIR, "best_model.pkl")
        
        self.scaler = None
        self.model = None
        
        self.load_artifacts()

    def load_artifacts(self):
        """Loads serialized model and scaler."""
        if not os.path.exists(self.scaler_path) or not os.path.exists(self.model_path):
            raise FileNotFoundError("Model artifacts not trained yet. Run train.py first.")
            
        with open(self.scaler_path, "rb") as f:
            self.scaler = pickle.load(f)
            
        with open(self.model_path, "rb") as f:
            self.model = pickle.load(f)

    def predict_health(
        self, 
        temperature: float, 
        pressure: float, 
        humidity: float, 
        voltage: float, 
        current: float, 
        rpm: float, 
        vibration: float, 
        energy: float
    ):
        """Runs model inference on physical inputs, returning failure probability, health score, and actions."""
        if not self.model or not self.scaler:
            self.load_artifacts()
            
        # Features frame matching train order
        features = np.array([[
            temperature, pressure, humidity, voltage, current, rpm, vibration, energy
        ]])
        
        # Scale
        scaled_features = self.scaler.transform(features)
        prob = float(self.model.predict_proba(scaled_features)[0][1])
        
        # B.Tech Viva Health Score Formula:
        # Health Score = 40% Vibration + 30% Temperature + 20% Current + 10% Reject Rate
        # Normalize variables to 0-100% scores:
        vibration_score = max(0.0, min(100.0, (1.0 - (vibration / 10.0)) * 100.0))   # 10mm/s is max limit
        temp_score = max(0.0, min(100.0, (1.0 - ((temperature - 20.0) / 100.0)) * 100.0)) # 120C is max limit
        current_score = max(0.0, min(100.0, (1.0 - (current / 20.0)) * 100.0))        # 20A is max limit
        reject_score = 98.0  # Assumes standard 2% defect rate baseline
        
        formula_health = (0.4 * vibration_score) + (0.3 * temp_score) + (0.2 * current_score) + (0.1 * reject_score)
        health_score = round(formula_health, 1)
        
        # Classify health status based on viva thresholds:
        # Healthy (>80%), Warning (60-80%), Critical (<60%)
        if health_score > 80.0:
            rec = "Asset running within nominal parameters. Continue standard checks."
            status = "HEALTHY"
        elif health_score >= 60.0:
            rec = "Minor physical variance. Monitor spindle vibration and bearing temperature metrics closely."
            status = "WARNING"
        else:
            rec = "CRITICAL: Imminent failure probability detected! Halt line operations immediately for engineering inspection."
            status = "FAILING"
            
        return {
            "failure_probability": round(prob, 4),
            "health_score": health_score,
            "status": status,
            "recommendation": rec
        }
