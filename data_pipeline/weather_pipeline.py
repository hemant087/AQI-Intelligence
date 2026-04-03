"""
AQI Intelligence — Weather & Boundary Layer Pipeline
=====================================================
Fetches meteorological + air quality forecast data from Open-Meteo (100% free,
no API key required) for 6 key Delhi NCR zones.

Stores in Supabase `weather_readings` table:
  - Historical data (past 90 days) on first run
  - Current readings + 5-day hourly forecast every hour

Run once for historical backfill:
  python weather_pipeline.py --backfill

Run continuously (every hour):
  python weather_pipeline.py
"""

from __future__ import annotations

import os
import sys
import time
import argparse
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL    = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY    = os.getenv("SUPABASE_ANON_KEY", "")
APP_SECRET      = os.getenv("APP_WRITE_SECRET", "aqi_intel_2026_secure_write")

# Force UTF-8 on Windows
if sys.stdout.encoding != "utf-8":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,on_conflict=zone_name,recorded_at,data_type",
}

# ── Delhi NCR Zones ───────────────────────────────────────────────────────────
NCR_ZONES = [
    {"name": "Delhi Central",  "lat": 28.6139, "lon": 77.2090},
    {"name": "Noida",          "lat": 28.5355, "lon": 77.3910},
    {"name": "Gurugram",       "lat": 28.4595, "lon": 77.0266},
    {"name": "Faridabad",      "lat": 28.4089, "lon": 77.3178},
    {"name": "Ghaziabad",      "lat": 28.6692, "lon": 77.4538},
    {"name": "Greater Noida",  "lat": 28.4744, "lon": 77.5040},
]

OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_AQ_URL      = "https://air-quality-api.open-meteo.com/v1/air-quality"


def log(msg: str):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


# ── API Fetchers ──────────────────────────────────────────────────────────────

def fetch_weather(lat: float, lon: float, past_days: int = 1, forecast_days: int = 5) -> dict:
    """Fetch weather data from Open-Meteo (no API key needed)."""
    params = {
        "latitude":      lat,
        "longitude":     lon,
        "current":       "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,visibility,cloud_cover,uv_index",
        "hourly":        "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,visibility,cloud_cover",
        "timezone":      "Asia/Kolkata",
        "past_days":     past_days,
        "forecast_days": forecast_days,
        "wind_speed_unit": "kmh",
    }
    resp = requests.get(OPEN_METEO_WEATHER_URL, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_air_quality(lat: float, lon: float, past_days: int = 1, forecast_days: int = 5) -> dict:
    """Fetch AQ forecast from Open-Meteo (no API key needed)."""
    params = {
        "latitude":      lat,
        "longitude":     lon,
        "current":       "pm2_5,pm10,us_aqi,dust,boundary_layer_height",
        "hourly":        "pm2_5,pm10,us_aqi,dust,boundary_layer_height",
        "timezone":      "Asia/Kolkata",
        "past_days":     past_days,
        "forecast_days": forecast_days,
    }
    resp = requests.get(OPEN_METEO_AQ_URL, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


# ── Data Processor ────────────────────────────────────────────────────────────

def build_rows(zone: dict, weather_data: dict, aq_data: dict) -> list[dict]:
    """Merge weather + AQ hourly arrays into Supabase rows."""
    rows = []

    w_hourly  = weather_data.get("hourly", {})
    aq_hourly = aq_data.get("hourly", {})

    w_times  = w_hourly.get("time", [])
    aq_times = aq_hourly.get("time", [])

    # Build AQ lookup by timestamp for fast merge
    aq_lookup = {}
    for i, t in enumerate(aq_times):
        aq_lookup[t] = {
            "pm25":  (aq_hourly.get("pm2_5")   or [None])[i],
            "pm10":  (aq_hourly.get("pm10")    or [None])[i],
            "aqi":   (aq_hourly.get("us_aqi")  or [None])[i],
            "dust":  (aq_hourly.get("dust")    or [None])[i],
            "blh":   (aq_hourly.get("boundary_layer_height") or [None])[i],
        }

    now_iso = datetime.now(timezone.utc).isoformat()

    for i, t in enumerate(w_times):
        # Determine if this is historical, current, or forecast
        try:
            row_dt   = datetime.fromisoformat(t)
            now_dt   = datetime.now(row_dt.tzinfo or timezone.utc)
            diff_hrs = (row_dt - now_dt).total_seconds() / 3600
            if diff_hrs < -1:
                dtype = "historical"
            elif diff_hrs <= 1:
                dtype = "current"
            else:
                dtype = "forecast"
        except Exception:
            dtype = "historical"

        aq = aq_lookup.get(t, {})

        rows.append({
            "zone_name":             zone["name"],
            "latitude":              zone["lat"],
            "longitude":             zone["lon"],
            "recorded_at":           t + ":00+05:30",  # IST timezone
            "fetched_at":            now_iso,
            "temperature":           (w_hourly.get("temperature_2m") or [None])[i],
            "humidity":              (w_hourly.get("relative_humidity_2m") or [None])[i],
            "wind_speed":            (w_hourly.get("wind_speed_10m") or [None])[i],
            "wind_direction":        (w_hourly.get("wind_direction_10m") or [None])[i],
            "precipitation":         (w_hourly.get("precipitation") or [None])[i],
            "visibility":            (w_hourly.get("visibility") or [None])[i],
            "cloud_cover":           (w_hourly.get("cloud_cover") or [None])[i],
            "pm25_forecast":         aq.get("pm25"),
            "pm10_forecast":         aq.get("pm10"),
            "us_aqi_forecast":       aq.get("aqi"),
            "dust":                  aq.get("dust"),
            "boundary_layer_height": aq.get("blh"),
            "data_type":             dtype,
            "app_secret":            APP_SECRET,
        })

    return rows


def upsert_weather_rows(rows: list[dict]):
    """Batch upsert into Supabase weather_readings."""
    if not rows:
        return
    url = f"{SUPABASE_URL}/rest/v1/weather_readings"
    BATCH = 200
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        resp  = requests.post(url, headers=SUPABASE_HEADERS, json=chunk, timeout=30)
        if resp.ok:
            log(f"  ✅ Upserted {len(chunk)} weather rows")
        else:
            log(f"  ❌ Supabase error: {resp.status_code} {resp.text[:200]}")


# ── Main Sync ─────────────────────────────────────────────────────────────────

def sync_zone(zone: dict, past_days: int):
    log(f"📡 Fetching: {zone['name']} ({zone['lat']}, {zone['lon']}) | past_days={past_days}")
    try:
        weather_data = fetch_weather(zone["lat"], zone["lon"], past_days=past_days)
        aq_data      = fetch_air_quality(zone["lat"], zone["lon"], past_days=past_days)
        rows         = build_rows(zone, weather_data, aq_data)
        log(f"  → {len(rows)} hourly rows assembled")
        upsert_weather_rows(rows)
        time.sleep(0.5)  # polite rate limiting
    except Exception as e:
        log(f"  ❌ Failed for {zone['name']}: {e}")


def run_all_zones(past_days: int):
    log(f"=== Weather sync for {len(NCR_ZONES)} NCR zones (past_days={past_days}) ===")
    for zone in NCR_ZONES:
        sync_zone(zone, past_days=past_days)
    log("✅ All zones synced!\n")


def main():
    parser = argparse.ArgumentParser(description="AQI Intelligence Weather Pipeline")
    parser.add_argument(
        "--backfill",
        action="store_true",
        help="Fetch 90 days of historical data (run once on setup)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single sync cycle and exit (useful for cron jobs)",
    )
    args = parser.parse_args()

    if args.backfill:
        log("🔙 BACKFILL MODE — fetching 90 days of historical data...")
        run_all_zones(past_days=90)
        log("✅ Historical backfill complete!")
        return

    if args.once:
        run_all_zones(past_days=1)
        return

    # Continuous mode — sync every hour
    log("🚀 Weather pipeline starting (hourly sync mode)...")
    while True:
        run_all_zones(past_days=2)
        log("⏳ Waiting 1 hour for next sync...")
        time.sleep(3600)


if __name__ == "__main__":
    main()
