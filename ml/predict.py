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
        
        # Inference
        prob = float(self.model.predict_proba(scaled_features)[0][1])
        health_score = round((1.0 - prob) * 100.0, 1)
        
        # Formulate industry action items
        if prob < 0.10:
            rec = "Asset running within nominal parameters. Continue standard checks."
            status = "HEALTHY"
        elif prob < 0.50:
            rec = "Minor physical variance. Monitor spindle vibration and bearing temperature metrics closely."
            status = "HEALTHY"
        elif prob < 0.85:
            rec = "Moderate anomaly metrics. Schedule preventive maintenance and joint check within 48 hours."
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
