import os
import sys
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

# Ensure models directory exists
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

DATASETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets")
SENSOR_DATA_PATH = os.path.join(DATASETS_DIR, "sensor_data.csv")

def load_data():
    """Loads dataset from CSV file."""
    if not os.path.exists(SENSOR_DATA_PATH):
        raise FileNotFoundError(f"Sensor data CSV not found at {SENSOR_DATA_PATH}. Please run data generator first.")
    
    print(f"Loading sensor logs from {SENSOR_DATA_PATH}...")
    df = pd.read_csv(SENSOR_DATA_PATH)
    return df

def preprocess_and_split(df):
    """Splits data into features (X) and labels (y), applies Scaling."""
    feature_cols = [
        "temperature", "pressure", "humidity", "voltage", "current",
        "rpm", "vibration", "energy_consumption"
    ]
    
    X = df[feature_cols]
    y = df["is_anomaly"]
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save scaler
    scaler_path = os.path.join(MODELS_DIR, "scaler.pkl")
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    print(f"[SUCCESS] Feature scaler saved to {scaler_path}")
    
    return X_train_scaled, X_test_scaled, y_train, y_test

def evaluate_model(model_name, y_true, y_pred, y_prob):
    """Computes standard evaluation classification metrics."""
    return {
        "Model": model_name,
        "Accuracy": round(accuracy_score(y_true, y_pred), 4),
        "Precision": round(precision_score(y_true, y_pred, zero_division=0), 4),
        "Recall": round(recall_score(y_true, y_pred, zero_division=0), 4),
        "F1-Score": round(f1_score(y_true, y_pred, zero_division=0), 4),
        "ROC-AUC": round(roc_auc_score(y_true, y_prob), 4)
    }

def train_and_compare():
    df = load_data()
    X_train, X_test, y_train, y_test = preprocess_and_split(df)
    
    print("\nTraining and comparing models (Random Forest, XGBoost, LightGBM)...")
    
    # 1. Random Forest
    print("Training Random Forest Classifier...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    rf_prob = rf.predict_proba(X_test)[:, 1]
    rf_metrics = evaluate_model("Random Forest", y_test, rf_pred, rf_prob)
    
    # 2. XGBoost
    print("Training XGBoost Classifier...")
    xgb = XGBClassifier(n_estimators=100, max_depth=6, random_state=42, n_jobs=-1)
    xgb.fit(X_train, y_train)
    xgb_pred = xgb.predict(X_test)
    xgb_prob = xgb.predict_proba(X_test)[:, 1]
    xgb_metrics = evaluate_model("XGBoost", y_test, xgb_pred, xgb_prob)
    
    # 3. LightGBM
    print("Training LightGBM Classifier...")
    # Disable verbose logs for cleaner output
    lgb = LGBMClassifier(n_estimators=100, random_state=42, verbosity=-1, n_jobs=-1)
    lgb.fit(X_train, y_train)
    lgb_pred = lgb.predict(X_test)
    lgb_prob = lgb.predict_proba(X_test)[:, 1]
    lgb_metrics = evaluate_model("LightGBM", y_test, lgb_pred, lgb_prob)
    
    # Compile comparison
    comparison_df = pd.DataFrame([rf_metrics, xgb_metrics, lgb_metrics])
    print("\n" + "="*70)
    print("MODEL COMPARISON RESULTS")
    print("="*70)
    print(comparison_df.to_string(index=False))
    print("="*70)
    
    # Choose best model based on F1-Score
    models = {
        "Random Forest": (rf, rf_metrics["F1-Score"]),
        "XGBoost": (xgb, xgb_metrics["F1-Score"]),
        "LightGBM": (lgb, lgb_metrics["F1-Score"])
    }
    
    best_name = max(models, key=lambda k: models[k][1])
    best_model = models[best_name][0]
    
    print(f"\n[SUCCESS] Best model chosen: {best_name} (F1-Score: {models[best_name][1]})")
    
    # Save best model
    model_path = os.path.join(MODELS_DIR, "best_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(best_model, f)
    print(f"[SUCCESS] Serialized best model saved to {model_path}")

if __name__ == "__main__":
    train_and_compare()
