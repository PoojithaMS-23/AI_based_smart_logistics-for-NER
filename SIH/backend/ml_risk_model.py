import os
import numpy as np
import pandas as pd
import joblib
from typing import Tuple

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
CSV_PATH = os.path.join(DATA_DIR, "synthetic_landslide_history.csv")
MODEL_PATH = os.path.join(MODELS_DIR, "risk_model.joblib")

_model = None

def generate_synthetic_data(n_samples: int = 3000) -> pd.DataFrame:
    """
    Generates mathematically plausible synthetic geological and hydrological dataset
    modeling mountain slope instability under monsoon rainfall in the Eastern Himalayas.
    """
    np.random.seed(42)
    os.makedirs(DATA_DIR, exist_ok=True)

    # 1. 24-hour antecedent rainfall (mm) - skewed distribution
    rainfall = np.random.exponential(scale=45.0, size=n_samples)
    rainfall = np.clip(rainfall, 0.0, 320.0)

    # 2. Slope angle in degrees (10° to 60°)
    slope = np.random.normal(loc=35.0, scale=10.0, size=n_samples)
    slope = np.clip(slope, 10.0, 60.0)

    # 3. Baseline geological susceptibility (lithology & fault proximity: 0.1 to 0.95)
    susceptibility = np.random.beta(a=2.0, b=3.0, size=n_samples)

    # 4. Soil saturation index (0.0 to 1.0) correlated with antecedent rainfall
    soil_sat = np.clip(0.15 + (rainfall / 300.0) * 0.7 + np.random.normal(0, 0.08, size=n_samples), 0.05, 0.99)

    # 5. Historical past disruptions count (0 to 10)
    past_incidents = np.random.poisson(lam=1.5 + susceptibility * 3.0, size=n_samples)

    # Physics-based geotechnical failure probability (Mohr-Coulomb / Infinite Slope proxy)
    # Driving stress increases with sin(slope) and pore pressure from saturation & rainfall
    slope_rad = np.radians(slope)
    driving_stress = np.sin(slope_rad) * (1.0 + 0.9 * soil_sat)
    resisting_stress = np.cos(slope_rad) * (1.2 - 0.7 * susceptibility)

    stress_ratio = driving_stress / np.maximum(resisting_stress, 0.1)
    
    # Critical rainfall threshold trigger (>100mm heavily escalates risk in Dibang Valley)
    rain_escalation = 1.0 / (1.0 + np.exp(-(rainfall - 110.0) / 25.0))

    prob = 1.0 / (1.0 + np.exp(-(stress_ratio * 1.8 + rain_escalation * 2.5 + past_incidents * 0.15 - 3.2)))
    prob = np.clip(prob + np.random.normal(0, 0.04, size=n_samples), 0.01, 0.99)

    slide_occurred = (prob > 0.50).astype(int)

    df = pd.DataFrame({
        "rainfall_mm": np.round(rainfall, 1),
        "slope_deg": np.round(slope, 1),
        "susceptibility": np.round(susceptibility, 3),
        "soil_saturation": np.round(soil_sat, 3),
        "past_incidents": past_incidents,
        "risk_probability": np.round(prob, 3),
        "slide_occurred": slide_occurred
    })

    df.to_csv(CSV_PATH, index=False)
    return df

def train_risk_model():
    global _model
    os.makedirs(MODELS_DIR, exist_ok=True)

    if not os.path.exists(CSV_PATH):
        df = generate_synthetic_data()
    else:
        df = pd.read_csv(CSV_PATH)

    features = ["rainfall_mm", "slope_deg", "susceptibility", "soil_saturation", "past_incidents"]
    X = df[features]
    y = df["slide_occurred"]

    try:
        from xgboost import XGBClassifier
        model = XGBClassifier(
            n_estimators=80,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.85,
            random_state=42,
            eval_metric="logloss"
        )
    except Exception:
        from sklearn.ensemble import GradientBoostingClassifier
        model = GradientBoostingClassifier(
            n_estimators=80,
            max_depth=4,
            learning_rate=0.08,
            random_state=42
        )

    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)
    _model = model
    return model

def load_risk_model():
    global _model
    if _model is not None:
        return _model
    if os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            return _model
        except Exception:
            pass
    return train_risk_model()

def predict_segment_risk(rainfall_mm: float, slope_deg: float, susceptibility: float) -> Tuple[float, str]:
    """
    Evaluates dynamic landslide risk score (0.0 to 1.0) and recommended status.
    Risk thresholds:
      - score >= 0.65 -> HIGH-RISK
      - score >= 0.40 -> CONSTRAINED
      - otherwise     -> OPEN
    """
    model = load_risk_model()

    # Estimate soil saturation dynamically from rainfall
    soil_sat = min(0.98, max(0.1, 0.15 + (rainfall_mm / 250.0) * 0.75))
    past_incidents = int(round(susceptibility * 4.0))

    features_df = pd.DataFrame([{
        "rainfall_mm": rainfall_mm,
        "slope_deg": slope_deg,
        "susceptibility": susceptibility,
        "soil_saturation": soil_sat,
        "past_incidents": past_incidents
    }])

    prob = float(model.predict_proba(features_df)[0][1])
    
    # Physics sanity floor for extreme precipitation (>160mm in steep slopes)
    if rainfall_mm >= 160.0 and slope_deg >= 36.0:
        prob = max(prob, 0.78)
    elif rainfall_mm >= 120.0 and slope_deg >= 32.0:
        prob = max(prob, 0.66)

    prob = round(prob, 3)

    if prob >= 0.65:
        state = "HIGH-RISK"
    elif prob >= 0.40:
        state = "CONSTRAINED"
    else:
        state = "OPEN"

    return prob, state

if __name__ == "__main__":
    print("Generating synthetic data and training risk model...")
    train_risk_model()
    test_score, test_state = predict_segment_risk(rainfall_mm=190.0, slope_deg=46.0, susceptibility=0.78)
    print(f"Test prediction for heavy rain on steep slope: Risk = {test_score}, State = {test_state}")

