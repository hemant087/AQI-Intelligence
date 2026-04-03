"""
AQI Intelligence — OpenAQ v3 REST API → Supabase Pipeline
==========================================================
Python 3.8+ compatible. Uses direct REST calls to bypass Supabase SDK 
dependency conflicts (fixes the 'SyncClient' TypeError).

Syncs:
  - Monitoring stations in Delhi NCR (bbox)
  - Latest Air Quality readings
  - Pre-calculates US AQI scores for the dashboard
"""

import os
import sys
import uuid
import time
import argparse
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── Load environment ──────────────────────────────────────────────────────────
load_dotenv()

OPENAQ_API_KEY = os.getenv("OPENAQ_API_KEY", "")
SUPABASE_URL   = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY   = os.getenv("SUPABASE_ANON_KEY", "")
APP_SECRET     = os.getenv("APP_WRITE_SECRET", "aqi_intel_2026_secure_write")

NCR_MIN_LAT = float(os.getenv("NCR_MIN_LAT", "28.3"))
NCR_MAX_LAT = float(os.getenv("NCR_MAX_LAT", "28.9"))
NCR_MIN_LON = float(os.getenv("NCR_MIN_LON", "76.8"))
NCR_MAX_LON = float(os.getenv("NCR_MAX_LON", "77.5"))

OPENAQ_BASE = "https://api.openaq.org/v3"
HEADERS     = {"X-API-Key": OPENAQ_API_KEY, "Accept": "application/json"}

def log(msg):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")

# ── AQI Calculation ──────────────────────────────────────────────────────────

def calculate_us_aqi(pm25):
    """Calculates US EPA AQI (0-500). Ported from dashboard source."""
    if pm25 is None or pm25 < 0: return 0
    if pm25 <= 12.0: return round(((50 - 0) / (12.0 - 0.0)) * (pm25 - 0.0) + 0)
    if pm25 <= 35.4: return round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51)
    if pm25 <= 55.4: return round(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101)
    if pm25 <= 150.4: return round(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151)
    if pm25 <= 250.4: return round(((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201)
    if pm25 <= 350.4: return round(((400 - 301) / (350.4 - 250.5)) * (pm25 - 250.5) + 301)
    if pm25 <= 500.4: return round(((500 - 401) / (500.4 - 350.5)) * (pm25 - 350.5) + 401)
    return 500

# ── API Helpers ──────────────────────────────────────────────────────────────

def openaq_get(path, params=None, max_retries=3):
    url = f"{OPENAQ_BASE}/{path.lstrip('/')}"
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers=HEADERS, params=params, timeout=30)
            if resp.status_code == 429:
                wait_time = (attempt + 1) * 3
                log(f"  Rate limited (429). Waiting {wait_time}s...")
                time.sleep(wait_time); continue
            resp.raise_for_status()
            return resp.json()
        except:
            if attempt == max_retries - 1: raise
            time.sleep(1)
    return None

def fetch_all_pages(path, base_params, limit=1000):
    results = []
    page = 1
    while True:
        params = {**base_params, "limit": limit, "page": page}
        data = openaq_get(path, params)
        batch = data.get("results", [])
        results.extend(batch)
        if len(batch) < limit: break
        page += 1
    return results

def supabase_upsert(table, rows, conflict_col):
    """Upsert into Supabase REST endpoint directly (bypasses SDK bugs)."""
    if not rows: return
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": f"resolution=merge-duplicates,on_conflict={conflict_col}"
    }
    # Security: Ensure secret is present in every row
    for r in rows: r["app_secret"] = APP_SECRET
    
    BATCH_SIZE = 100
    for i in range(0, len(rows), BATCH_SIZE):
        chunk = rows[i:i + BATCH_SIZE]
        resp = requests.post(url, headers=headers, json=chunk, timeout=30)
        if not resp.ok:
            log(f"  ❌ Supabase Error ({table}): {resp.status_code} {resp.text}")
        else:
            log(f"  ✅ Upserted {len(chunk)} rows → {table}")

# ── Core Sync Logic ──────────────────────────────────────────────────────────

def sync_stations():
    log("📡 Synchronizing monitoring station metadata...")
    bbox = f"{NCR_MIN_LON},{NCR_MIN_LAT},{NCR_MAX_LON},{NCR_MAX_LAT}"
    locations = fetch_all_pages("locations", {"bbox": bbox})
    log(f"  Fetched {len(locations)} locations.")

    rows = []
    for loc in locations:
        coords = loc.get("coordinates") or {}
        sensors = loc.get("sensors") or []

        def get_p(name):
            for s in sensors:
                p = s.get("parameter") or {}
                # Handle v3 param objects or strings
                p_got = p.get("name") if isinstance(p, dict) else str(p)
                if p_got == name:
                    return (s.get("latest") or {}).get("value")
            return None

        pm25 = get_p("pm25")
        aqi  = calculate_us_aqi(pm25) if pm25 is not None else 0
        
        lat = coords.get("latitude")
        city_name = loc.get("locality") or "Delhi NCR"
        if city_name == "Delhi NCR":
            city_name = "Delhi Core" if (lat or 0) > 28.5 else "NCR Town Stations"

        rows.append({
            "uid":          loc["id"],
            "station_name": loc.get("name") or f"Station {loc['id']}",
            "aqi":          aqi,
            "city":         city_name,
            "latitude":     lat,
            "longitude":    coords.get("longitude"),
            "pm25":         pm25,
            "pm10":         get_p("pm10"),
            "o3":           get_p("o3"),
            "no2":          get_p("no2"),
            "so2":          get_p("so2"),
            "co":           get_p("co"),
            "station_time": (loc.get("datetimeLast") or {}).get("utc") or datetime.now(timezone.utc).isoformat(),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        })

    # We do not upsert here anymore; we wait for sync_latest_data to fill the live metrics.
    return rows, locations

def sync_latest_data(rows, locations):
    log(f"📊 Syncing latest data for {len(locations)} stations...")
    
    reading_rows = []
    
    for row, loc in zip(rows, locations):
        loc_id = loc["id"]
        # Build local sensor map for this location using the metadata
        sensors = loc.get("sensors") or []
        s_map = {}
        for s in sensors:
            p = s.get("parameter") or {}
            p_got = p.get("name") if isinstance(p, dict) else str(p)
            if p_got:
                s_map[s.get("id")] = p_got

        try:
            # v3 /locations/{id}/latest
            data = openaq_get(f"locations/{loc_id}/latest")
            results = data.get("results", [])
            
            pollutants = {}
            for res in results:
                # In /latest, each result is mapped to sensorsId
                s_id = res.get("sensorsId")
                pname = s_map.get(s_id)
                val = res.get("value")
                if pname and val is not None:
                    pollutants[pname] = val
            
            pm25 = pollutants.get("pm25")
            aqi = calculate_us_aqi(pm25) if pm25 is not None else 0

            # Update the row object IN PLACE
            row["aqi"] = aqi
            row["pm25"] = pm25
            row["pm10"] = pollutants.get("pm10")
            row["o3"] = pollutants.get("o3")
            row["no2"] = pollutants.get("no2")
            row["so2"] = pollutants.get("so2")
            row["co"] = pollutants.get("co")
            row["last_updated"] = datetime.now(timezone.utc).isoformat()

            # Add to readings table
            if pm25 is not None:
                 reading_rows.append({
                     "id": str(uuid.uuid4()),
                     "device_id": str(loc_id),
                     "timestamp": datetime.now(timezone.utc).isoformat(),
                     "pm25": pm25,
                     "source_type": "api"
                 })
            
            # Rate limit protection
            time.sleep(0.25)
                     
        except Exception as e:
            log(f"  ⚠️  Skipped {loc_id}: {e}")

    # Final updates
    supabase_upsert("government_stations", rows, "uid")
    supabase_upsert("readings", reading_rows, "id")

def main():
    log("🚀 Pipeline V5 starting continuous sync mode (10-min intervals)...")
    while True:
        try:
            log("--- Starting new sync cycle ---")
            rows, locations = sync_stations()
            if locations:
                sync_latest_data(rows, locations)
            log("✅ Sync cycle finished. AQI data is up to date.")
        except Exception as e:
            log(f"❌ Critical error during pipeline iteration: {e}")
        
        log("⏳ Waiting 10 minutes for the next sync...")
        time.sleep(600)  # Sleep for 10 minutes (600 seconds)

if __name__ == "__main__":
    main()
