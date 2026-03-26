"""
AQI Intelligence — OpenAQ v3 REST API → Supabase Pipeline
==========================================================
Python 3.8+ compatible. Uses requests instead of the official SDK
(which requires Python >=3.10).

Fetches from OpenAQ v3 API:
  - All monitoring stations in Delhi NCR (bbox)
  - Latest PM2.5 / PM10 / O3 / NO2 / SO2 / CO measurements
  - Hourly historical trends

Writes to Supabase:
  - government_stations
  - readings
  - historical_measurements

Usage:
  python pipeline.py              # full sync
  python pipeline.py --stations   # station metadata only
  python pipeline.py --readings   # latest readings only
  python pipeline.py --history    # 24h historical only
"""

import os
import sys
import uuid
import time
import argparse
from datetime import datetime, timezone
import requests
from dotenv import load_dotenv
from supabase import create_client

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

# ── Clients ───────────────────────────────────────────────────────────────────
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def log(msg):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")

# ── OpenAQ REST helpers ───────────────────────────────────────────────────────

def openaq_get(path, params=None):
    """GET from OpenAQ v3, raise on error."""
    url = f"{OPENAQ_BASE}/{path.lstrip('/')}"
    resp = requests.get(url, headers=HEADERS, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_all_pages(path, base_params, limit=1000):
    """Iterate all pages of an OpenAQ list endpoint."""
    results = []
    page = 1
    while True:
        params = {**base_params, "limit": limit, "page": page}
        data = openaq_get(path, params)
        batch = data.get("results", [])
        results.extend(batch)
        if len(batch) < limit:
            break
        page += 1
    return results

# ── Supabase helpers ──────────────────────────────────────────────────────────

def batch_upsert(table, rows, conflict_col):
    if not rows:
        log(f"  ⚠️  No rows to upsert → {table}")
        return
    BATCH = 500
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        supabase.table(table).upsert(chunk, on_conflict=conflict_col).execute()
    log(f"  ✅ Upserted {len(rows)} rows → {table}")

# ── 1. Sync Stations ─────────────────────────────────────────────────────────

def sync_stations():
    log("📡 Fetching OpenAQ stations in Delhi NCR bbox...")

    # OpenAQ v3 bbox: minLon,minLat,maxLon,maxLat
    bbox = f"{NCR_MIN_LON},{NCR_MIN_LAT},{NCR_MAX_LON},{NCR_MAX_LAT}"
    locations = fetch_all_pages("locations", {"bbox": bbox})
    log(f"  Found {len(locations)} stations")

    rows = []
    for loc in locations:
        coords = loc.get("coordinates") or {}
        owners = loc.get("owners") or []
        sensors = loc.get("sensors") or []

        # Find specific pollutant sensors
        def sensor_val(pname):
            for s in sensors:
                p = s.get("parameter") or {}
                if p.get("name") == pname:
                    latest = s.get("latest") or {}
                    return latest.get("value")
            return None

        rows.append({
            "uid":          loc["id"],
            "name":         loc.get("name") or f"Station {loc['id']}",
            "station_name": loc.get("name") or f"Station {loc['id']}",
            "aqi":          0,
            "station_time": (loc.get("datetimeLast") or {}).get("utc") or datetime.now(timezone.utc).isoformat(),
            "city":         loc.get("locality") or "Delhi NCR",
            "latitude":     coords.get("latitude"),
            "longitude":    coords.get("longitude"),
            "pm25":         sensor_val("pm25"),
            "pm10":         sensor_val("pm10"),
            "o3":           sensor_val("o3"),
            "no2":          sensor_val("no2"),
            "so2":          sensor_val("so2"),
            "co":           sensor_val("co"),
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "app_secret":   APP_SECRET,
        })

    batch_upsert("government_stations", rows, "uid")
    return locations

# ── 2. Sync Latest Readings ──────────────────────────────────────────────────

def sync_latest_readings(locations):
    log(f"📊 Fetching latest measurements for {len(locations)} stations...")

    rows = []
    for loc in locations:
        loc_id = loc["id"]
        try:
            data = openaq_get(f"locations/{loc_id}/latest")
            measurements = data.get("results", [])

            pollutants = {}
            for m in measurements:
                p = m.get("parameter") or {}
                pname = p.get("name") if isinstance(p, dict) else p
                val = m.get("value")
                if pname and val is not None:
                    pollutants[pname] = val

            coords = loc.get("coordinates") or {}
            rows.append({
                "id":          str(uuid.uuid4()),
                "device_id":   str(loc_id),
                "timestamp":   datetime.now(timezone.utc).isoformat(),
                "pm25":        pollutants.get("pm25") or 0,
                "pm10":        pollutants.get("pm10"),
                "o3":          pollutants.get("o3"),
                "no2":         pollutants.get("no2"),
                "so2":         pollutants.get("so2"),
                "co":          pollutants.get("co"),
                "source_type": "api",
                "latitude":    coords.get("latitude"),
                "longitude":   coords.get("longitude"),
                "context_tag": "outdoor",
                "app_secret":  APP_SECRET,
            })
        except Exception as e:
            log(f"  ⚠️  Skipped location {loc_id}: {e}")

    batch_upsert("readings", rows, "id")

# ── 3. Sync Historical Measurements ─────────────────────────────────────────

def sync_historical(locations, parameter="pm25", hours=24):
    log(f"📈 Fetching {hours}h historical {parameter.upper()} data...")

    rows = []
    for loc in locations:
        sensors = loc.get("sensors") or []
        sensor_id = None
        for s in sensors:
            p = s.get("parameter") or {}
            if (p.get("name") if isinstance(p, dict) else p) == parameter:
                sensor_id = s.get("id")
                break
        if not sensor_id:
            continue

        try:
            data = openaq_get(
                f"sensors/{sensor_id}/measurements",
                {"period_name": "hour", "limit": hours}
            )
            for m in data.get("results", []):
                period = m.get("period") or {}
                dt_from = (period.get("datetimeFrom") or {}).get("utc") or datetime.now(timezone.utc).isoformat()
                rows.append({
                    "sensor_id":   str(sensor_id),
                    "location_id": str(loc["id"]),
                    "parameter":   parameter,
                    "value":       m.get("value") or 0,
                    "measured_at": dt_from,
                    "app_secret":  APP_SECRET,
                })
        except Exception as e:
            log(f"  ⚠️  Skipped history for sensor {sensor_id}: {e}")

    batch_upsert("historical_measurements", rows, "sensor_id,measured_at,parameter")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="AQI Intelligence → Supabase Pipeline")
    parser.add_argument("--stations", action="store_true", help="Sync stations only")
    parser.add_argument("--readings", action="store_true", help="Sync readings only")
    parser.add_argument("--history",  action="store_true", help="Sync historical data only")
    args = parser.parse_args()

    run_all = not (args.stations or args.readings or args.history)

    log("🚀 AQI Intelligence Data Pipeline starting...")
    log(f"   Supabase : {SUPABASE_URL}")
    log(f"   BBox     : ({NCR_MIN_LAT},{NCR_MIN_LON}) → ({NCR_MAX_LAT},{NCR_MAX_LON})")

    if args.stations or run_all:
        locations = sync_stations()
    else:
        log("📡 Loading location list (no upsert)...")
        bbox = f"{NCR_MIN_LON},{NCR_MIN_LAT},{NCR_MAX_LON},{NCR_MAX_LAT}"
        locations = fetch_all_pages("locations", {"bbox": bbox})

    if args.readings or run_all:
        sync_latest_readings(locations)

    if args.history or run_all:
        sync_historical(locations, parameter="pm25", hours=24)

    log("✅ Pipeline complete!")


if __name__ == "__main__":
    main()
