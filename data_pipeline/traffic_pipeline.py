"""
AQI Intelligence — Traffic Pipeline (Multi-Provider)
=====================================================
Monitors real-time traffic congestion at 15 key Delhi NCR corridors.

Provider priority:
  1. Mappls (MapmyIndia) ← BEST for Delhi NCR (Indian govt-backed, lane-level accuracy)
  2. TomTom               ← Global standard (2,500 free calls/day, no credit card)
  3. HERE                 ← Most generous free tier (250,000 calls/month)
  4. Mock data            ← Realistic fallback when no key is set

Sign up (all free):
  • Mappls:  https://apis.mappls.com  (best India accuracy)
  • TomTom:  https://developer.tomtom.com
  • HERE:    https://developer.here.com

Add one of these to data_pipeline/.env:
  MAPPLS_API_KEY=your_key_here    ← recommended for Delhi NCR
  TOMTOM_API_KEY=your_key_here    ← fallback
  HERE_API_KEY=your_key_here      ← fallback

Run:
  python traffic_pipeline.py           # continuous 15-min sync
  python traffic_pipeline.py --once    # single fetch and exit
"""

from __future__ import annotations

import os
import sys
import time
import random
import argparse
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

if sys.stdout.encoding != "utf-8":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ── Config ─────────────────────────────────────────────────────────────────────
MAPPLS_API_KEY  = os.getenv("MAPPLS_API_KEY", "")
TOMTOM_API_KEY  = os.getenv("TOMTOM_API_KEY", "")
HERE_API_KEY    = os.getenv("HERE_API_KEY", "")
SUPABASE_URL    = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY    = os.getenv("SUPABASE_ANON_KEY", "")
APP_SECRET      = os.getenv("APP_WRITE_SECRET", "aqi_intel_2026_secure_write")

# API endpoints
MAPPLS_TOKEN_URL   = "https://outpost.mappls.com/api/security/oauth/token"
MAPPLS_TRAFFIC_URL = "https://apis.mappls.com/advancedmaps/v1/{key}/traffic_count"
TOMTOM_FLOW_URL    = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
HERE_FLOW_URL      = "https://data.traffic.hereapi.com/v7/flow"

SUPABASE_HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates,on_conflict=corridor_name,recorded_at",
}

# ── Delhi NCR Key Traffic Corridors ────────────────────────────────────────────
# lanes = total carriageway lanes, capacity = PCU/hr/lane (Indian HCM values)
CORRIDORS = [
    # National Highways
    {"name": "NH-48 Delhi-Gurugram Toll",     "lat": 28.5011, "lon": 77.0853, "lanes": 8, "road_type": "expressway",  "capacity_per_lane": 2200},
    {"name": "NH-48 Rajiv Chowk Gurugram",    "lat": 28.5164, "lon": 77.0509, "lanes": 6, "road_type": "expressway",  "capacity_per_lane": 2200},

    # Ring Road (Major Arterial)
    {"name": "Ring Road ITO",                  "lat": 28.6281, "lon": 77.2407, "lanes": 6, "road_type": "arterial",    "capacity_per_lane": 1800},
    {"name": "Ring Road Dhaula Kuan",          "lat": 28.5916, "lon": 77.1598, "lanes": 6, "road_type": "arterial",    "capacity_per_lane": 1800},

    # DND / NH-9
    {"name": "DND Flyway Noida Entry",         "lat": 28.5522, "lon": 77.3200, "lanes": 4, "road_type": "expressway",  "capacity_per_lane": 2000},
    {"name": "Mayur Vihar Noida Toll",         "lat": 28.6050, "lon": 77.3060, "lanes": 4, "road_type": "highway",     "capacity_per_lane": 1800},

    # NH-19 Faridabad
    {"name": "Badarpur Border NH-19",          "lat": 28.5052, "lon": 77.2958, "lanes": 6, "road_type": "highway",     "capacity_per_lane": 1800},
    {"name": "NHPC Chowk Faridabad",           "lat": 28.4600, "lon": 77.3120, "lanes": 4, "road_type": "arterial",    "capacity_per_lane": 1600},

    # Outer Ring Road
    {"name": "Outer Ring Road Naraina",        "lat": 28.6381, "lon": 77.1349, "lanes": 6, "road_type": "arterial",    "capacity_per_lane": 1800},
    {"name": "Outer Ring Road Munirka",        "lat": 28.5502, "lon": 77.1760, "lanes": 6, "road_type": "arterial",    "capacity_per_lane": 1800},

    # Ghaziabad / NH-9
    {"name": "Ghaziabad Border NH-9",          "lat": 28.6530, "lon": 77.3900, "lanes": 4, "road_type": "highway",     "capacity_per_lane": 1800},

    # Noida–Greater Noida Expressway
    {"name": "Noida-GN Expressway",            "lat": 28.5140, "lon": 77.3930, "lanes": 6, "road_type": "expressway",  "capacity_per_lane": 2000},

    # Gurugram
    {"name": "MG Road Gurugram",               "lat": 28.4790, "lon": 77.0730, "lanes": 4, "road_type": "arterial",    "capacity_per_lane": 1600},

    # Central Delhi
    {"name": "Connaught Place Parliament St",  "lat": 28.6279, "lon": 77.2175, "lanes": 4, "road_type": "arterial",    "capacity_per_lane": 1400},

    # Sohna Road (heavy trucks → high NOx)
    {"name": "Sohna Road Gurugram",            "lat": 28.4200, "lon": 77.0460, "lanes": 4, "road_type": "highway",     "capacity_per_lane": 1600},
]


def log(msg: str):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def congestion_level(pct: float | None) -> str:
    if pct is None:  return "Unknown"
    if pct <= 10:    return "Free"
    if pct <= 30:    return "Light"
    if pct <= 55:    return "Moderate"
    if pct <= 75:    return "Heavy"
    return "Standstill"


def estimate_vehicles(corridor: dict, curr_speed: float | None, free_speed: float | None) -> int | None:
    """
    Estimate vehicle count (PCU/hour) using BPR (Bureau of Public Roads) flow model.
    PCU = Passenger Car Unit — standard measure for mixed Indian traffic.

    At free flow: volume ≈ capacity (all lanes moving at max speed)
    At jam:       volume → 0 (vehicles standing still)
    Peak flow occurs at ~critical speed (u_f / 2)

    Formula (Greenshields linear model):
      volume = capacity × 4 × (u/u_f) × (1 - u/u_f)
    We cap at capacity × lanes to avoid unrealistic values.
    """
    if curr_speed is None or free_speed is None or free_speed <= 0:
        return None
    lanes    = corridor.get("lanes", 4)
    capacity = corridor.get("capacity_per_lane", 1800)  # PCU/hr/lane
    ratio    = curr_speed / free_speed                   # 0 (jam) → 1 (free flow)
    # Greenshields: q = k_j × u_f/4 × (1 - (1 - 2u/u_f)^2) simplified:
    flow_per_lane = capacity * 4 * ratio * (1 - ratio)  # peaks at ratio=0.5
    total_pcu_hr  = int(min(flow_per_lane * lanes, capacity * lanes))
    return max(0, total_pcu_hr)


def active_provider() -> str:
    if MAPPLS_API_KEY: return "Mappls"
    if TOMTOM_API_KEY: return "TomTom"
    if HERE_API_KEY:   return "HERE"
    return "Mock"


# ── Provider: TomTom ───────────────────────────────────────────────────────────

def fetch_tomtom(lat: float, lon: float) -> dict | None:
    try:
        resp = requests.get(TOMTOM_FLOW_URL, params={
            "point": f"{lat},{lon}", "unit": "KMPH", "key": TOMTOM_API_KEY,
        }, timeout=15)
        if resp.ok:
            return resp.json().get("flowSegmentData", {})
    except Exception as e:
        log(f"  TomTom error: {e}")
    return None


# ── Provider: HERE ─────────────────────────────────────────────────────────────

def fetch_here(lat: float, lon: float) -> dict | None:
    try:
        resp = requests.get(HERE_FLOW_URL, params={
            "in":      f"circle:{lat},{lon};r=200",
            "apikey":  HERE_API_KEY,
        }, timeout=15)
        if resp.ok:
            results = resp.json().get("results", [])
            if results:
                seg = results[0].get("currentFlow", {})
                ff  = results[0].get("freeFlow", {})
                return {
                    "currentSpeed":       seg.get("speed"),
                    "freeFlowSpeed":      ff.get("speed"),
                    "currentTravelTime":  seg.get("jamFactor"),  # approx
                    "freeFlowTravelTime": None,
                    "confidence":         seg.get("confidence"),
                    "roadClosure":        False,
                }
    except Exception as e:
        log(f"  HERE error: {e}")
    return None


# ── Provider: Mappls (MapmyIndia) ──────────────────────────────────────────────

_mappls_token: str | None = None
_mappls_token_expiry: float = 0.0

def get_mappls_token() -> str | None:
    """Get OAuth token for Mappls API (refreshed automatically)."""
    global _mappls_token, _mappls_token_expiry
    if _mappls_token and time.time() < _mappls_token_expiry:
        return _mappls_token
    try:
        resp = requests.post(MAPPLS_TOKEN_URL, data={
            "grant_type":    "client_credentials",
            "client_id":     MAPPLS_API_KEY,
            "client_secret": os.getenv("MAPPLS_CLIENT_SECRET", MAPPLS_API_KEY),
        }, timeout=15)
        if resp.ok:
            data = resp.json()
            _mappls_token        = data.get("access_token")
            _mappls_token_expiry = time.time() + data.get("expires_in", 3600) - 60
            return _mappls_token
    except Exception as e:
        log(f"  Mappls token error: {e}")
    return None


def fetch_mappls(lat: float, lon: float) -> dict | None:
    """
    Fetch traffic density from Mappls (MapmyIndia).
    Note: Mappls traffic flow uses their proprietary road segment API.
    This uses the Realtime Traffic Count endpoint.
    Docs: https://about.mappls.com/api/advanced-maps/doc/traffic-api
    """
    token = get_mappls_token()
    if not token:
        return None
    try:
        resp = requests.get(
            f"https://apis.mappls.com/advancedmaps/v1/traffic/flow",
            headers={"Authorization": f"Bearer {token}"},
            params={"lat": lat, "lng": lon, "radius": 200},
            timeout=15,
        )
        if resp.ok:
            data = resp.json()
            # Mappls returns trafficLevel: 0-5 (0=free, 5=standstill)
            level_map = {0: 0, 1: 15, 2: 30, 3: 50, 4: 70, 5: 90}
            level = data.get("trafficLevel", 0)
            pct   = level_map.get(level, 0)
            speed = data.get("currentSpeed")
            return {
                "currentSpeed":       speed,
                "freeFlowSpeed":      data.get("freeFlowSpeed"),
                "currentTravelTime":  None,
                "freeFlowTravelTime": None,
                "confidence":         0.9,
                "roadClosure":        data.get("closure", False),
                "_congestion_pct_override": pct,   # use Mappls level directly
            }
    except Exception as e:
        log(f"  Mappls error: {e}")
    return None


# ── Row Builder ────────────────────────────────────────────────────────────────

def build_row(corridor: dict, flow: dict) -> dict:
    curr_speed = flow.get("currentSpeed")
    free_speed = flow.get("freeFlowSpeed")

    # Allow provider to override congestion pct directly (Mappls)
    if "_congestion_pct_override" in flow:
        congestion_pct = flow["_congestion_pct_override"]
    elif curr_speed and free_speed and free_speed > 0:
        congestion_pct = round(max(0.0, min(100.0, (1 - curr_speed / free_speed) * 100)), 1)
    else:
        congestion_pct = None

    return {
        "corridor_name":         corridor["name"],
        "latitude":              corridor["lat"],
        "longitude":             corridor["lon"],
        "recorded_at":           datetime.now(timezone.utc).isoformat(),
        "current_speed":         curr_speed,
        "free_flow_speed":       free_speed,
        "current_travel_time":   flow.get("currentTravelTime"),
        "free_flow_travel_time": flow.get("freeFlowTravelTime"),
        "confidence":            flow.get("confidence"),
        "road_closure":          flow.get("roadClosure", False),
        "congestion_pct":        congestion_pct,
        "congestion_level":      congestion_level(congestion_pct),
        "vehicles_per_hour":     estimate_vehicles(corridor, curr_speed, free_speed),
        "lanes":                 corridor.get("lanes", 4),
        "road_type":             corridor.get("road_type", "arterial"),
        "app_secret":            APP_SECRET,
    }


# ── Mock Data (realistic Delhi NCR patterns) ───────────────────────────────────

def mock_traffic_rows() -> list[dict]:
    hour = datetime.now().hour
    is_morning_rush = 7 <= hour <= 10
    is_evening_rush = 17 <= hour <= 21
    is_peak = is_morning_rush or is_evening_rush

    rows = []
    for c in CORRIDORS:
        # NH-48 and Ring Road are worst during peak hours
        is_hotspot = any(k in c["name"] for k in ["NH-48", "Ring Road", "DND", "Badarpur"])
        if is_peak and is_hotspot:
            pct = random.randint(65, 92)
        elif is_peak:
            pct = random.randint(40, 65)
        else:
            pct = random.randint(8, 30)

        free_speed = random.uniform(60, 75)
        curr_speed = free_speed * (1 - pct / 100)

        rows.append({
            "corridor_name":         c["name"],
            "latitude":              c["lat"],
            "longitude":             c["lon"],
            "recorded_at":           datetime.now(timezone.utc).isoformat(),
            "current_speed":         round(curr_speed, 1),
            "free_flow_speed":       round(free_speed, 1),
            "current_travel_time":   None,
            "free_flow_travel_time": None,
            "confidence":            0.7,
            "road_closure":          False,
            "congestion_pct":        float(pct),
            "congestion_level":      congestion_level(float(pct)),
            "vehicles_per_hour":     estimate_vehicles(c, curr_speed, free_speed),
            "lanes":                 c.get("lanes", 4),
            "road_type":             c.get("road_type", "arterial"),
            "app_secret":            APP_SECRET,
        })
    return rows


# ── Supabase Upsert ────────────────────────────────────────────────────────────

def upsert_traffic_rows(rows: list[dict]):
    if not rows:
        return
    url  = f"{SUPABASE_URL}/rest/v1/traffic_readings"
    resp = requests.post(url, headers=SUPABASE_HEADERS, json=rows, timeout=30)
    if resp.ok:
        log(f"  ✅ Upserted {len(rows)} traffic rows via {active_provider()}")
    else:
        log(f"  ❌ Supabase error: {resp.status_code} {resp.text[:200]}")


# ── Main Sync ──────────────────────────────────────────────────────────────────

def sync_once():
    provider = active_provider()
    log(f"🚗 Traffic sync | Provider: {provider} | {len(CORRIDORS)} NCR corridors")

    if provider == "Mock":
        log("⚠️  No API key — using realistic mock data (Delhi rush-hour patterns)")
        log("   Get free Mappls key: https://apis.mappls.com  (best for Delhi NCR)")
        rows = mock_traffic_rows()
    else:
        fetcher = {"Mappls": fetch_mappls, "TomTom": fetch_tomtom, "HERE": fetch_here}[provider]
        rows = []
        for c in CORRIDORS:
            flow = fetcher(c["lat"], c["lon"])
            if flow:
                row = build_row(c, flow)
                rows.append(row)
                pcu = row.get('vehicles_per_hour') or 0
                log(f"  → {c['name']}: {row['congestion_level']} ({row['congestion_pct']}% congested | {row['current_speed']} km/h) → ~{pcu} PCU/hr")
            time.sleep(0.4)

    upsert_traffic_rows(rows)
    log(f"✅ Done — {len(rows)} corridors updated\n")


def main():
    parser = argparse.ArgumentParser(description="AQI Intelligence Traffic Pipeline")
    parser.add_argument("--once", action="store_true", help="Sync once and exit")
    args = parser.parse_args()

    if args.once:
        sync_once()
        return

    log("🔁 Traffic pipeline running (every 15 minutes)...")
    while True:
        sync_once()
        log("⏳ Next sync in 15 minutes...")
        time.sleep(900)


if __name__ == "__main__":
    main()
