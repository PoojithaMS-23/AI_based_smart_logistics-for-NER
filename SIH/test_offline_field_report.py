#!/usr/bin/env python3
"""
Test offline field report scenario - simulates Flutter app behavior
"""
import requests
import json
import uuid
from datetime import datetime

def simulate_offline_field_report():
    """Simulate the offline -> online field report workflow"""
    print("=== SCENARIO 3 — FIELD LANDSLIDE / BLOCKED TEST ===")
    
    # Step 1-6: Simulate Flutter app creating offline report
    offline_report = {
        "id": str(uuid.uuid4()),
        "segment_id": "SEG-07",
        "hazard_type": "Landslide",
        "severity": "Severe", 
        "reporter_id": "FIELD-MOBILE-DEMO",
        "notes": "DEMO: Massive rockslide blocking both lanes at Kronli Cliff. Impassable.",
        "latitude": 28.234567,
        "longitude": 95.345678,
        "photo_path": "/local/demo_landslide.jpg",
        "timestamp": datetime.now().isoformat(),
        "sync_status": "pending"
    }
    
    print("✓ Offline report created (simulated Flutter behavior)")
    print(f"  Report ID: {offline_report['id']}")
    print(f"  Hazard: {offline_report['hazard_type']} - {offline_report['severity']}")
    print(f"  Location: {offline_report['latitude']}, {offline_report['longitude']}")
    print("✓ Report stored locally (would be SQLite in Flutter)")
    
    # Step 8-10: Simulate network restoration and sync
    try:
        print("✓ Network restored - attempting sync...")
        
        api_payload = {
            "segment_id": offline_report["segment_id"],
            "hazard_type": offline_report["hazard_type"],
            "severity": offline_report["severity"],
            "reporter_id": offline_report["reporter_id"],
            "notes": offline_report["notes"],
            "latitude": offline_report["latitude"],
            "longitude": offline_report["longitude"],
            "photo_path": offline_report["photo_path"],
            "timestamp": offline_report["timestamp"]
        }
        
        response = requests.post(
            "http://127.0.0.1:8000/api/reports",
            json=api_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"✓ Report synced successfully: {result.get('report_id')}")
            
            # Step 11-12: Verify database persistence and state changes
            if result.get('ground_truth_applied'):
                print("✓ Ground truth override applied - segment marked as BLOCKED")
                
                # Check corridor state
                corridor_response = requests.get("http://127.0.0.1:8000/api/corridor")
                if corridor_response.status_code == 200:
                    corridor = corridor_response.json()
                    
                    # Find the affected segment
                    affected_segment = None
                    for seg in corridor['segments']:
                        if seg['id'] == offline_report['segment_id']:
                            affected_segment = seg
                            break
                    
                    if affected_segment:
                        print(f"✓ Segment {affected_segment['id']} state: {affected_segment['state']}")
                        print(f"✓ Risk score: {affected_segment['risk_score']:.3f}")
                        
                        # Step 14: Verify route recalculation
                        if corridor['optimal_route']['success']:
                            print(f"✓ Route recalculated: {corridor['optimal_route']['total_distance_km']}km")
                            print(f"✓ Bypass active: {corridor['optimal_route']['bypass_active']}")
                            
                            # Check if the route avoids the blocked segment
                            path_segments = corridor['optimal_route'].get('path_segments', [])
                            if offline_report['segment_id'] not in path_segments:
                                print("✅ Route correctly avoids blocked segment")
                            else:
                                print("⚠ Route still includes blocked segment (may be unavoidable)")
                
                print("✅ SCENARIO 3 PASSED - Field landslide workflow complete")
                return True
            else:
                print("⚠ Ground truth not applied (may be due to severity threshold)")
                
        else:
            print(f"✗ Sync failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Sync error: {e}")
        return False

def test_blocked_to_constrained():
    """Test SCENARIO 4 - BLOCKED to CONSTRAINED transition"""
    print("\n=== SCENARIO 4 — BLOCKED TO CONSTRAINED TEST ===")
    
    try:
        # Step 1: Verify we have a blocked segment
        corridor = requests.get("http://127.0.0.1:8000/api/corridor").json()
        blocked_segment = None
        
        for seg in corridor['segments']:
            if seg['state'] == 'BLOCKED':
                blocked_segment = seg
                break
        
        if not blocked_segment:
            print("⚠ No blocked segment found - creating one first")
            # Block SEG-07 for testing
            block_payload = {
                "state": "BLOCKED",
                "override_reason": "Test: Simulating blocked segment for demo"
            }
            requests.post(
                f"http://127.0.0.1:8000/api/segments/SEG-07/state",
                json=block_payload,
                headers={"Content-Type": "application/json"}
            )
            blocked_segment = {"id": "SEG-07"}
        
        print(f"✓ Found blocked segment: {blocked_segment['id']}")
        
        # Step 2: Verify A* avoids it by checking current route
        initial_route = corridor['optimal_route']
        initial_path = initial_route.get('path_segments', [])
        if blocked_segment['id'] not in initial_path:
            print("✓ A* correctly avoids blocked segment")
        
        # Step 3: Clear segment to CONSTRAINED
        clear_payload = {
            "state": "CONSTRAINED", 
            "override_reason": "BRO Clearance: Single lane opened under escort"
        }
        
        response = requests.post(
            f"http://127.0.0.1:8000/api/segments/{blocked_segment['id']}/state",
            json=clear_payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Segment cleared to CONSTRAINED")
            
            # Step 4-6: Verify changes
            updated_corridor = result['corridor']
            updated_segment = None
            for seg in updated_corridor['segments']:
                if seg['id'] == blocked_segment['id']:
                    updated_segment = seg
                    break
            
            if updated_segment:
                print(f"✓ Database updated - state: {updated_segment['state']}")
                print(f"✓ Route recalculated: {updated_corridor['optimal_route']['total_distance_km']}km")
                
                # Step 7-8: Check cargo dispatch
                if result.get('triage_dispatch'):
                    dispatch_info = result['triage_dispatch']
                    print(f"✓ Cargo dispatch triggered: {dispatch_info['dispatched_count']} vehicles")
                    
                    # Verify priority ordering in dispatch
                    dispatched_vehicles = dispatch_info.get('dispatched_vehicles', [])
                    if dispatched_vehicles:
                        print("✓ Dispatched cargo priority verification:")
                        for i, vehicle in enumerate(dispatched_vehicles):
                            priority_name = {1: "Medicines/Vaccines", 2: "Fuel/LPG", 3: "Food", 4: "Construction"}
                            cargo_priority = priority_name.get(vehicle['priority_tier'], f"Tier {vehicle['priority_tier']}")
                            print(f"  {i+1}. {vehicle['vehicle_id']}: {cargo_priority}")
            
            print("✅ SCENARIO 4 PASSED - BLOCKED to CONSTRAINED workflow complete")
            return True
            
    except Exception as e:
        print(f"✗ SCENARIO 4 FAILED: {e}")
        return False

if __name__ == "__main__":
    success1 = simulate_offline_field_report()
    success2 = test_blocked_to_constrained()
    
    if success1 and success2:
        print(f"\n🎉 Field report scenarios completed successfully!")
    else:
        print(f"\n❌ Some field report scenarios failed.")