"""
AUTHORITATIVE CORRIDOR STATE DEFINITIONS
Used consistently across database, routing, risk model, API, and WebSocket.
These are the ONLY five valid states.
"""

# The five corridor states (in operational priority order)
CORRIDOR_STATES = {
    "OPEN": {
        "display_name": "Open (Safe)",
        "color": "#10b981",  # green
        "cost_multiplier": 1.0,
        "severity": 0,
        "description": "Corridor passable at normal speed. No known hazards."
    },
    "CONSTRAINED": {
        "display_name": "Constrained (Use with Caution)",
        "color": "#f97316",  # orange
        "cost_multiplier": 2.8,
        "severity": 1,
        "description": "Single lane / limited capacity. Reduced speed required."
    },
    "HIGH-RISK": {
        "display_name": "High-Risk (Avoid)",
        "color": "#eab308",  # yellow
        "cost_multiplier": 10.0,
        "severity": 2,
        "description": "Geotechnical hazard detected. Reroute strongly recommended."
    },
    "DISRUPTED": {
        "display_name": "Disrupted (High Risk)",
        "color": "#a855f7",  # purple
        "cost_multiplier": 20.0,
        "severity": 3,
        "description": "Severe debris or minor obstruction. Extreme caution advised."
    },
    "BLOCKED": {
        "display_name": "Blocked (Impassable)",
        "color": "#ef4444",  # red
        "cost_multiplier": float("inf"),
        "severity": 4,
        "description": "Road completely severed. No passage possible."
    }
}

# Valid state names
VALID_STATES = set(CORRIDOR_STATES.keys())

# Risk thresholds for ML model output -> state mapping
# Risk score (0.0 to 1.0) determines default state
RISK_TO_STATE_MAPPING = {
    "HIGH-RISK_threshold": 0.65,      # score >= 0.65 -> HIGH-RISK
    "CONSTRAINED_threshold": 0.40,    # 0.40 <= score < 0.65 -> CONSTRAINED
    # score < 0.40 -> OPEN
}

def get_cost_multiplier(state: str) -> float:
    """
    Returns the cost multiplier for routing based on corridor state.
    Used in A* pathfinding to penalize dangerous/constrained routes.
    
    BLOCKED returns infinity (impassable).
    OPEN returns 1.0 (no penalty).
    CONSTRAINED returns 2.8 (moderate penalty).
    HIGH-RISK returns 10.0 (strong penalty).
    DISRUPTED returns 20.0 (very strong penalty).
    
    Raises ValueError if state is invalid.
    """
    state_upper = state.upper()
    if state_upper not in CORRIDOR_STATES:
        raise ValueError(f"Invalid corridor state: {state}. Valid states: {VALID_STATES}")
    return CORRIDOR_STATES[state_upper]["cost_multiplier"]

# Alias for compatibility
def get_corridor_state_cost(state: str) -> float:
    """Alias for get_cost_multiplier for backward compatibility."""
    return get_cost_multiplier(state)

def validate_state(state: str) -> bool:
    """Validates that a state is one of the five authorized states."""
    return state.upper() in VALID_STATES

# Alias for compatibility
def is_valid_corridor_state(state: str) -> bool:
    """Alias for validate_state for backward compatibility."""
    return validate_state(state)

def normalize_state(state: str) -> str:
    """Normalizes a state string to uppercase and validates."""
    normalized = state.upper()
    if normalized not in VALID_STATES:
        raise ValueError(f"Invalid corridor state: {state}. Valid states: {VALID_STATES}")
    return normalized

def risk_score_to_state(risk_score: float) -> str:
    """
    Converts a ML model risk score (0.0 to 1.0) to a corridor state.
    
    score >= 0.65 -> HIGH-RISK
    0.40 <= score < 0.65 -> CONSTRAINED
    score < 0.40 -> OPEN
    
    Args:
        risk_score: Float between 0.0 and 1.0
        
    Returns:
        One of: "OPEN", "CONSTRAINED", "HIGH-RISK"
    """
    risk_score = max(0.0, min(1.0, risk_score))  # Clamp to [0, 1]
    
    if risk_score >= RISK_TO_STATE_MAPPING["HIGH-RISK_threshold"]:
        return "HIGH-RISK"
    elif risk_score >= RISK_TO_STATE_MAPPING["CONSTRAINED_threshold"]:
        return "CONSTRAINED"
    else:
        return "OPEN"

if __name__ == "__main__":
    # Self-test
    print("Valid corridor states:", VALID_STATES)
    print("Cost multipliers:")
    for state in sorted(VALID_STATES):
        mult = get_cost_multiplier(state)
        print(f"  {state}: {mult}")
    
    print("\nRisk score to state mapping:")
    for score in [0.1, 0.3, 0.5, 0.7, 0.9]:
        state = risk_score_to_state(score)
        print(f"  Score {score} -> {state}")
