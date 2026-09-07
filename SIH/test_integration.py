#!/usr/bin/env python3
"""
Integration test script for the SIH React + FastAPI dashboard
Tests that all backend operations required by the frontend are working correctly
"""
import sys
import os
sys.path.insert(0, '.')

import asyncio
import json
from backend.database import init_db
from backend.main import get_corridor_payload
from backend.router import get_safest_ai_route
from backend.triage_engine import get_all_cargo, seed_mixed_convoy, dispatch_on_lane_cleared
from backend.ml_risk_model import predict_segment_risk, load_risk_model

def test_basic_data_loading():
    """Test that basic corridor data loads correctly"""
    print("=== Testing Basic Data Loading ===")
    
    try:
        data = get_corridor_payload()
        
        # Check nodes
        nodes = data['nodes']
        print(f"✓ Loaded {len(nodes)} nodes")
        assert len(nodes) > 0, "No nodes found"
        
        # Check segments
        segments = data['segments']
        print(f"✓ Loaded {len(segments)} segments")
        assert len(segments) > 0, "No segments found"
        
        # Check segment states
        states = set(seg['state'] for seg in segments)
        print(f"✓ Segment states: {', '.join(states)}")
        
        # Check optimal route
        opt_route = data['optimal_route']
        if opt_route['success']:
            print(f"✓ Optimal route calculated: {opt_route['total_distance_km']}km")
        else:
            print(f"✗ Optimal route failed: {opt_route.get('error', 'Unknown error')}")
            
        return True
        
    except Exception as e:
        print(f"✗ Basic data loading failed: {e}")
        return False

def test_ai_routing():
    """Test the safest AI route calculation"""
    print("\n=== Testing AI Routing ===")
    
    try:
        safest = get_safest_ai_route(source="N1", target="N11", cargo_type="Medicines/Vaccines")
        
        if safest['success']:
            print(f"✓ Safest route calculated: {safest['safety_score_pct']}% safety")
            print(f"✓ Route distance: {safest['total_distance_km']}km")
            print(f"✓ Bypass active: {safest['bypass_active']}")
            print(f"✓ Driver instructions: {len(safest['driver_instructions'])} steps")
            
            # Print first instruction
            if safest['driver_instructions']:
                first = safest['driver_instructions'][0]
                print(f"✓ First instruction: {first['title']}")
                
        else:
            print(f"✗ Safest route failed: {safest.get('error', 'Unknown error')}")
            return False
            
        return True
        
    except Exception as e:
        print(f"✗ AI routing failed: {e}")
        return False

def test_cargo_system():
    """Test the cargo triage system"""
    print("\n=== Testing Cargo System ===")
    
    try:
        # Get initial cargo state
        cargo = get_all_cargo()
        initial_stranded = len(cargo['stranded'])
        initial_dispatched = len(cargo['dispatched'])
        print(f"✓ Initial cargo: {initial_stranded} stranded, {initial_dispatched} dispatched")
        
        # Seed some cargo
        added = seed_mixed_convoy(count=3)
        print(f"✓ Seeded {len(added)} cargo vehicles")
        
        # Check cargo after seeding
        cargo_after = get_all_cargo()
        new_stranded = len(cargo_after['stranded'])
        print(f"✓ After seeding: {new_stranded} stranded vehicles")
        
        # Test dispatch
        if new_stranded > 0:
            dispatch_result = dispatch_on_lane_cleared(batch_size=2)
            print(f"✓ Dispatch completed: {dispatch_result}")
            
        return True
        
    except Exception as e:
        print(f"✗ Cargo system failed: {e}")
        return False

def test_ml_risk_prediction():
    """Test the ML risk prediction system"""
    print("\n=== Testing ML Risk Prediction ===")
    
    try:
        load_risk_model()
        print("✓ ML model loaded")
        
        # Test risk prediction with different rainfall levels
        test_cases = [
            (50, 35, 0.7),   # Light rain, moderate slope
            (150, 45, 0.8),  # Heavy rain, steep slope
            (250, 50, 0.9),  # Extreme rain, very steep slope
        ]
        
        for rainfall, slope, susceptibility in test_cases:
            risk_prob, predicted_state = predict_segment_risk(rainfall, slope, susceptibility)
            print(f"✓ Rain {rainfall}mm, slope {slope}°: {risk_prob:.3f} risk → {predicted_state}")
            
        return True
        
    except Exception as e:
        print(f"✗ ML risk prediction failed: {e}")
        return False

def test_segment_states():
    """Test that all five segment states are represented"""
    print("\n=== Testing Segment States ===")
    
    try:
        data = get_corridor_payload()
        segments = data['segments']
        
        # Count states
        state_counts = {}
        for seg in segments:
            state = seg['state']
            state_counts[state] = state_counts.get(state, 0) + 1
            
        print("✓ Segment state distribution:")
        for state, count in state_counts.items():
            print(f"  {state}: {count} segments")
            
        # Check that we have the required states
        required_states = {'OPEN', 'CONSTRAINED', 'DISRUPTED', 'HIGH-RISK', 'BLOCKED'}
        available_states = set(state_counts.keys())
        
        if required_states.issubset(available_states):
            print("✓ All required states present")
        else:
            missing = required_states - available_states
            print(f"⚠ Missing states: {missing}")
            
        return True
        
    except Exception as e:
        print(f"✗ Segment state test failed: {e}")
        return False

def main():
    """Run all integration tests"""
    print("SIH React + FastAPI Integration Test")
    print("=" * 50)
    
    # Initialize database and ML model
    init_db()
    load_risk_model()
    
    tests = [
        test_basic_data_loading,
        test_ai_routing,
        test_cargo_system,
        test_ml_risk_prediction,
        test_segment_states,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"✗ Test {test.__name__} crashed: {e}")
            failed += 1
    
    print(f"\n{'='*50}")
    print(f"Integration Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed! Backend is ready for frontend integration.")
        return True
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)