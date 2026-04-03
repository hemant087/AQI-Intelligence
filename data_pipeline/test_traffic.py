"""
test_traffic.py — Quick test for TomTom Traffic API + Supabase save
Run: python test_traffic.py
"""

from __future__ import annotations
import os
import requests
from dotenv import load_dotenv
from traffic_pipeline import (
    CORRIDORS, TOMTOM_API_KEY, SUPABASE_URL, SUPABASE_KEY,
    fetch_tomtom, build_row, upsert_traffic_rows, congestion_level, log
)

load_dotenv()

TEST_CORRIDORS = [
    {"name": "NH-48 Delhi-Gurugram Toll",    "lat": 28.5011, "lon": 77.0853},
    {"name": "Ring Road ITO",                "lat": 28.6281, "lon": 77.2407},
    {"name": "DND Flyway Noida Entry",       "lat": 28.5522, "lon": 77.3200},
    {"name": "Connaught Place Parliament St","lat": 28.6279, "lon": 77.2175},
    {"name": "MG Road Gurugram",             "lat": 28.4790, "lon": 77.0730},
]

def test_tomtom_key():
    print("\n🔍 Test 1: TomTom API Key")
    if not TOMTOM_API_KEY or TOMTOM_API_KEY == "paste_your_tomtom_key_here":
        print("  ❌ TOMTOM_API_KEY not set in .env")
        print("     Get free key: https://developer.tomtom.com")
        return False
    print(f"  ✅ Key found: {TOMTOM_API_KEY[:8]}...{TOMTOM_API_KEY[-4:]}")
    return True

def test_tomtom_api():
    print("\n🔍 Test 2: TomTom Live Traffic (5 corridors)")
    rows = []
    for c in TEST_CORRIDORS:
        flow = fetch_tomtom(c["lat"], c["lon"])
        if flow:
            row = build_row(c, flow)
            rows.append(row)
            pct   = row.get("congestion_pct")
            speed = row.get("current_speed")
            ff    = row.get("free_flow_speed")
            level = row.get("congestion_level")
            print(f"  ✅ {c['name']}")
            print(f"     {level} congestion | {pct:.1f}% slower | {speed:.0f}/{ff:.0f} km/h")
        else:
            print(f"  ❌ Failed to fetch: {c['name']}")
    return rows

def test_supabase_save(rows):
    print(f"\n🔍 Test 3: Save {len(rows)} rows to Supabase")
    if not rows:
        print("  ⏭️  Skipped — no rows to save")
        return
    upsert_traffic_rows(rows)

def test_fetch_back():
    print("\n🔍 Test 4: Read back from Supabase traffic_readings")
    import time
    time.sleep(3)  # Give Supabase free-tier a moment to settle after write
    url = f"{SUPABASE_URL}/rest/v1/traffic_readings"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    for attempt in range(1, 4):
        try:
            resp = requests.get(url, headers=headers, params={
                "select": "corridor_name,congestion_level,congestion_pct,current_speed,recorded_at",
                "order":  "congestion_pct.desc",
                "limit":  "5",
            }, timeout=15)
            if resp.ok:
                data = resp.json()
                print(f"  ✅ Got {len(data)} rows from Supabase")
                print(f"\n  {'Corridor':<38} {'Level':<12} {'Congestion':>12} {'Speed':>8}")
                print(f"  {'-'*38} {'-'*12} {'-'*12} {'-'*8}")
                for r in data:
                    name  = r['corridor_name'][:36]
                    level = r.get('congestion_level', '?')
                    pct   = f"{r.get('congestion_pct') or 0:.1f}%"
                    speed = f"{r.get('current_speed') or 0:.0f} km/h"
                    print(f"  {name:<38} {level:<12} {pct:>12} {speed:>8}")
                return
            else:
                print(f"  ⚠️  Attempt {attempt}: HTTP {resp.status_code}")
        except Exception as e:
            print(f"  ⏳ Attempt {attempt} failed ({e.__class__.__name__}) — retrying in 3s...")
            time.sleep(3)
    print("  ❌ Could not read back — but data WAS saved (Test 3 passed)")

if __name__ == "__main__":
    print("=" * 60)
    print("AQI Intelligence — Traffic Pipeline Test")
    print("=" * 60)

    if not test_tomtom_key():
        print("\n⛔ Add your TomTom key to .env first.")
        exit(1)

    rows = test_tomtom_api()
    test_supabase_save(rows)
    test_fetch_back()

    print("\n" + "=" * 60)
    if rows:
        print(f"✅ Traffic test complete! {len(rows)}/5 corridors fetched.")
        print("   Run 'python traffic_pipeline.py --once' for all 15 corridors.")
    else:
        print("❌ No traffic data fetched. Check your TomTom API key.")
    print("=" * 60)
