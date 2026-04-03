"""
AQI Intelligence — RAG Pipeline (Phase 1)
==========================================
Local LLM via Ollama (llama3.1:8b) + Supabase context retrieval.

Architecture:
  User query
    → fetch real-time AQI context from Supabase
    → fetch recent news from Supabase
    → assemble structured prompt
    → send to Ollama (local, free, no API key needed)
    → return AI guidance

Requirements:
  pip install requests python-dotenv

Ollama setup (run once):
  1. Download Ollama: https://ollama.com/download
  2. In terminal: ollama pull llama3.1:8b
  3. Ollama runs automatically at http://localhost:11434
"""

from __future__ import annotations

import os
import json
import math
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv
from web_search import fetch_web_intelligence, generate_quick_brief, DDGS_AVAILABLE

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL     = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
OLLAMA_BASE_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL     = os.getenv("OLLAMA_MODEL", "qwen2:1.5b")   # swap to llama3.1:8b when RAM freed

SUPABASE_HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
}

# ── AQI Label Helper ──────────────────────────────────────────────────────────

def aqi_label(aqi: int) -> str:
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Moderate"
    if aqi <= 150:  return "Unhealthy for Sensitive Groups"
    if aqi <= 200:  return "Unhealthy"
    if aqi <= 300:  return "Very Unhealthy"
    return "Hazardous"


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


# ── Supabase Data Fetchers ────────────────────────────────────────────────────

def fetch_stations(user_lat: float = None, user_lon: float = None, limit: int = 10) -> list[dict]:
    """Fetch stations from Supabase, sorted by proximity if lat/lon provided."""
    url = f"{SUPABASE_URL}/rest/v1/government_stations"
    params = {"select": "*", "limit": 200, "order": "aqi.desc"}
    resp = requests.get(url, headers=SUPABASE_HEADERS, params=params, timeout=15)
    resp.raise_for_status()
    stations = resp.json()

    if user_lat is not None and user_lon is not None:
        for s in stations:
            if s.get("latitude") and s.get("longitude"):
                s["_dist_km"] = haversine_km(user_lat, user_lon, s["latitude"], s["longitude"])
            else:
                s["_dist_km"] = 9999
        stations.sort(key=lambda x: x["_dist_km"])

    return stations[:limit]


def fetch_news(limit: int = 10) -> list[dict]:
    """Fetch latest environmental news with full descriptions from Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/news_articles"
    params = {
        "select": "title,description,source,published_at,url",
        "limit": limit,
        "order": "published_at.desc",
    }
    resp = requests.get(url, headers=SUPABASE_HEADERS, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def fetch_recent_readings(limit: int = 5) -> list[dict]:
    """Fetch most recent personal/crowdsourced AQI readings."""
    url = f"{SUPABASE_URL}/rest/v1/readings"
    params = {
        "select": "timestamp,pm25,pm10,source_type,latitude,longitude",
        "limit": limit,
        "order": "timestamp.desc",
    }
    resp = requests.get(url, headers=SUPABASE_HEADERS, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def fetch_weather_context(zone_name: str = "Delhi Central") -> dict | None:
    """Fetch latest weather + AQ forecast from Supabase weather_readings."""
    url = f"{SUPABASE_URL}/rest/v1/weather_readings"
    params = {
        "select": "zone_name,recorded_at,temperature,humidity,wind_speed,wind_direction,"
                  "precipitation,visibility,cloud_cover,pm25_forecast,pm10_forecast,"
                  "us_aqi_forecast,dust,boundary_layer_height,data_type",
        "zone_name": f"eq.{zone_name}",
        "order": "recorded_at.desc",
        "limit": 12,   # last 12 hours + next few forecast hours
    }
    try:
        resp = requests.get(url, headers=SUPABASE_HEADERS, params=params, timeout=15)
        resp.raise_for_status()
        rows = resp.json()
        return rows if rows else None
    except Exception:
        return None


def wind_direction_label(deg: int | None) -> str:
    if deg is None:
        return "Unknown"
    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
    return dirs[round(deg / 22.5) % 16]


def blh_label(blh: float | None) -> str:
    if blh is None:
        return "Data not available"
    if blh < 500:   return f"{blh:.0f}m — VERY LOW ⚠️ (severe pollution trapping)"
    if blh < 1000:  return f"{blh:.0f}m — Low (moderate trapping)"
    if blh < 2000:  return f"{blh:.0f}m — Moderate (some dispersion)"
    return f"{blh:.0f}m — High ✅ (good pollutant dispersion)"


# ── Context Assembler ─────────────────────────────────────────────────────────

def build_context(
    user_lat: float = None,
    user_lon: float = None,
    user_profile: dict = None,
) -> str:
    """Pull data from Supabase and assemble a rich context string for the LLM."""

    lines = []
    now   = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines.append(f"=== CURRENT TIME ===\n{now}\n")

    # ── Stations ──────────────────────────────────────────────────
    try:
        stations = fetch_stations(user_lat, user_lon, limit=8)
        lines.append("=== NEARBY AIR QUALITY STATIONS (Delhi NCR) ===")
        for s in stations:
            dist   = f"  [{s.get('_dist_km', 0):.1f} km away]" if "_dist_km" in s else ""
            label  = aqi_label(s.get("aqi") or 0)
            pm25   = f"PM2.5: {s['pm25']:.1f}µg/m³" if s.get("pm25") else ""
            pm10   = f"PM10: {s['pm10']:.1f}µg/m³" if s.get("pm10") else ""
            no2    = f"NO2: {s['no2']:.1f}ppb" if s.get("no2") else ""
            o3     = f"O3: {s['o3']:.1f}ppb" if s.get("o3") else ""
            pollutants = " | ".join(filter(None, [pm25, pm10, no2, o3]))
            lines.append(
                f"• {s.get('station_name', 'Unknown')}{dist}\n"
                f"  AQI: {s.get('aqi', 'N/A')} ({label}) | {pollutants}\n"
                f"  City: {s.get('city', 'N/A')} | Last updated: {s.get('last_updated', 'N/A')[:16]}"
            )
        lines.append("")
    except Exception as e:
        lines.append(f"=== STATIONS ===\n[Could not fetch: {e}]\n")

    # ── Weather & Meteorology ─────────────────────────────────────
    try:
        weather_rows = fetch_weather_context("Delhi Central")
        if weather_rows:
            # Find the most recent current/historical row
            current = next((r for r in weather_rows if r.get("data_type") in ("current","historical")), weather_rows[0])
            # Find next 6 forecast rows
            forecast = [r for r in weather_rows if r.get("data_type") == "forecast"][:6]

            lines.append("=== METEOROLOGICAL CONDITIONS ===")
            lines.append(
                f"Temperature: {current.get('temperature') or 'N/A'}°C | "
                f"Humidity: {current.get('humidity') or 'N/A'}% | "
                f"Cloud Cover: {current.get('cloud_cover') or 'N/A'}%"
            )
            lines.append(
                f"Wind: {current.get('wind_speed') or 'N/A'} km/h "
                f"{wind_direction_label(current.get('wind_direction'))} | "
                f"Precipitation: {current.get('precipitation') or 0} mm | "
                f"Visibility: {(current.get('visibility') or 0)/1000:.1f} km"
            )
            lines.append(f"Boundary Layer Height: {blh_label(current.get('boundary_layer_height'))}")
            lines.append(f"Dust Level: {current.get('dust') or 'N/A'} µg/m³")

            if forecast:
                lines.append("\n=== AQI & WEATHER FORECAST (next 6 hours) ===")
                for f in forecast:
                    t   = f.get("recorded_at", "")[:16]
                    aqi = f.get("us_aqi_forecast") or "N/A"
                    blh = f.get("boundary_layer_height")
                    pm25 = f.get("pm25_forecast") or "N/A"
                    wind = f.get("wind_speed") or "N/A"
                    lines.append(
                        f"• {t} IST | AQI: {aqi} | PM2.5: {pm25} µg/m³ | "
                        f"Wind: {wind} km/h | BLH: {blh_label(blh)}"
                    )
            lines.append("")
        else:
            lines.append("=== WEATHER ===\n[Run weather_pipeline.py first to populate weather data]\n")
    except Exception as e:
        lines.append(f"[Weather unavailable: {e}]\n")


    try:
        readings = fetch_recent_readings(limit=3)
        if readings:
            lines.append("=== RECENT CROWDSOURCED READINGS ===")
            for r in readings:
                pm25 = f"PM2.5: {r['pm25']:.1f}µg/m³" if r.get("pm25") else ""
                lines.append(
                    f"• {r.get('source_type','unknown').title()} sensor | {pm25} | {r.get('timestamp','')[:16]} UTC"
                )
            lines.append("")
    except Exception as e:
        lines.append(f"[Readings unavailable: {e}]\n")

    # ── News ──────────────────────────────────────────────────
    try:
        news = fetch_news(limit=10)
        if news:
            lines.append("=== ENVIRONMENTAL NEWS INTELLIGENCE (Last 24-48h) ===")
            lines.append(f"Total articles analysed: {len(news)}")
            lines.append("")
            for idx, n in enumerate(news, 1):
                pub   = n.get("published_at", "")[:10]
                title = n.get("title", "").strip()
                desc  = (n.get("description") or "").strip()
                src   = n.get("source", "Unknown")
                # Use full description — it's the richest free field
                lines.append(
                    f"[Article {idx}] {title}\n"
                    f"  Source: {src} | Date: {pub}\n"
                    f"  Summary: {desc[:400] if desc else 'No description available.'}"
                )
                lines.append("")
        else:
            lines.append("=== NEWS ===\n[No recent news found]\n")
    except Exception as e:
        lines.append(f"[News unavailable: {e}]\n")

    # ── User profile ──────────────────────────────────────────────
    if user_profile:
        lines.append("=== USER PROFILE ===")
        for key, val in user_profile.items():
            lines.append(f"• {key}: {val}")
        lines.append("")

    # ── Location ──────────────────────────────────────────────────
    if user_lat and user_lon:
        lines.append(f"=== USER LOCATION ===\nLat: {user_lat:.4f}, Lon: {user_lon:.4f}\n")

    return "\n".join(lines)


# ── Ollama LLM Call ───────────────────────────────────────────────────────────

def check_ollama() -> bool:
    """Check if Ollama is running and the model is available."""
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        models = [m["name"] for m in resp.json().get("models", [])]
        base   = OLLAMA_MODEL.split(":")[0]
        return any(base in m for m in models)
    except Exception:
        return False


def ask_ollama(context: str, question: str, stream: bool = True) -> str:
    """Send context + question to Ollama using /api/chat (messages format)."""

    system_prompt = (
        "You are AtmoPulse AI — an advanced air quality intelligence system for Delhi NCR.\n\n"
        "When given real-time AQI context and a user question, respond with a FULL STRUCTURED ANALYSIS "
        "using ONLY data from the provided context. Never invent values.\n\n"
        "=== RESPONSE FORMAT ===\n\n"
        "SECTION 1 — AQI STATUS\n"
        "- Nearest station, AQI value, and category (Good/Moderate/Unhealthy/Very Unhealthy/Hazardous)\n"
        "- Key pollutants driving the AQI with exact values from context (PM2.5, PM10, NO2, O3, CO)\n"
        "- Compare 2-3 nearby stations to show local variation\n\n"
        "SECTION 2 — HEALTH RISK SCORE: X/10\n"
        "- Score based on AQI level, sensitive groups, and user activity\n"
        "- Who is most at risk (children, elderly, asthmatic, outdoor workers)\n"
        "- Short-term symptoms to watch for at this AQI level\n\n"
        "SECTION 3 — IMMEDIATE PERSONAL ACTIONS (next 1-2 hours)\n"
        "List 3-4 numbered steps the user should take right now.\n"
        "Include: mask type needed, activity modification, best time window if conditions improve\n\n"
        "SECTION 4 — QUICK ACTIONS TO REDUCE NEARBY AQI\n"
        "What can be done to reduce pollution AT SOURCE in the area:\n"
        "- Individual level: actions drivers, households, residents can take\n"
        "- Community level: actions RWAs, schools, markets can coordinate\n"
        "- Authority level: what Delhi Govt / DPCC / MCDs should prioritize right now\n\n"
        "SECTION 5 — TREND & PREDICTION\n"
        "- Will AQI improve or worsen in next 6 hours? Use news/weather context if available\n"
        "- Key pollution drivers right now (stubble burning, traffic, dust, weather)\n"
        "- Best time window today for outdoor activity\n\n"
        "SECTION 6 — NEWS INTELLIGENCE SUMMARY\n"
        "Analyse ALL news articles in the context and:\n"
        "- Identify the 2-3 dominant pollution events or trends from the news\n"
        "- Link specific news events to current AQI readings (e.g. dust storm → high PM10)\n"
        "- Highlight any government actions, alerts, or advisories mentioned\n"
        "- Note any upcoming events that could worsen or improve AQI\n\n"
        "SECTION 7 — QUICK BRIEF (most important section)\n"
        "Synthesize ALL context (stations + weather + news + web) into exactly 5 bullet points.\n"
        "Each bullet: ONE sentence, max 15 words, action-focused.\n"
        "Format:\n"
        "• [STATUS] ...\n"
        "• [CAUSE] ...\n"
        "• [RISK] ...\n"
        "• [ACTION] ...\n"
        "• [OUTLOOK] ...\n\n"
        "VERDICT: One direct sentence answering the user's specific question.\n\n"
        "=== RULES ===\n"
        "- Use the exact section headers shown above\n"
        "- Use actual AQI numbers and article details from context — not vague descriptions\n"
        "- Write 'Data not available' if a section cannot be answered from context\n"
        "- Total response: 450-600 words"
    )

    # Use /api/chat (messages format) — more reliable across all Ollama versions
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": f"Context data:\n{context}\n\nUser question: {question}"},
        ],
        "stream": stream,
        "options": {
            "temperature": 0.3,
            "num_predict": 1200,  # More tokens for 6-section structured response
            "top_p": 0.9,
            "num_ctx": 4096,     # 4K context — needed for 10 news articles + station data
            "num_gpu": -1,       # offload all layers to GPU via CUDA
        }
    }

    resp = requests.post(
        f"{OLLAMA_BASE_URL}/api/chat",
        json=payload,
        stream=stream,
        timeout=180,   # 3 min — 8B on CPU can be slow on first token
    )

    # Show the actual Ollama error body before raising
    if not resp.ok:
        try:
            err_body = resp.json()
        except Exception:
            err_body = resp.text[:500]
        raise RuntimeError(
            f"Ollama {resp.status_code} error: {err_body}\n"
            f"Tip: run 'ollama list' to confirm model name, "
            f"or 'ollama pull {OLLAMA_MODEL}' to re-download."
        )

    if stream:
        full_response = ""
        print("\n\U0001f916 AtmoPulse AI: ", end="", flush=True)
        for line in resp.iter_lines():
            if line:
                chunk = json.loads(line)
                # /api/chat wraps token in message.content
                token = chunk.get("message", {}).get("content", "")
                print(token, end="", flush=True)
                full_response += token
                if chunk.get("done"):
                    break
        print("\n")
        return full_response
    else:
        return resp.json().get("message", {}).get("content", "")


# ── Main RAG Query Function ───────────────────────────────────────────────────

def query_aqi_assistant(
    question: str,
    user_lat: float = None,
    user_lon: float = None,
    user_profile: dict = None,
    verbose: bool = False,
) -> str:
    """
    Full RAG pipeline:
      1. Fetch context from Supabase (stations + news + readings)
      2. Assemble structured prompt
      3. Query local Ollama LLM
      4. Return AI response
    """

    # Step 1: Check Ollama
    if not check_ollama():
        return (
            "❌ Ollama is not running or llama3.1:8b is not installed.\n"
            "Fix: 1) Download Ollama from https://ollama.com/download\n"
            "     2) Run: ollama pull llama3.1:8b\n"
            "     3) Ollama starts automatically in background."
        )

    # Step 2: Build context from Supabase
    print("📡 Fetching real-time data from Supabase...")
    context = build_context(user_lat, user_lon, user_profile)

    # Step 3: Fetch live web intelligence (DuckDuckGo, no key needed)
    nearest_aqi = None
    events      = []
    try:
        # Extract AQI + likely events from context for targeted queries
        import re
        aqi_match = re.search(r'AQI: (\d+)', context)
        if aqi_match:
            nearest_aqi = int(aqi_match.group(1))
        if "dust" in context.lower():
            events.append("dust storm")
        if "pm10" in context.lower():
            events.append("PM10 pollution")
        if "stubble" in context.lower() or "burning" in context.lower():
            events.append("stubble burning")
    except Exception:
        pass

    web_context = ""
    if DDGS_AVAILABLE:
        print("🌐 Searching web for latest Delhi AQI news...")
        web_context = fetch_web_intelligence(aqi=nearest_aqi, events=events or None)
        context = context + "\n\n" + web_context
    else:
        print("⚠️  Web search not available — run: pip install duckduckgo-search")

    if verbose:
        print("\n" + "="*60)
        print("ASSEMBLED CONTEXT:")
        print("="*60)
        print(context)
        print("="*60 + "\n")

    # Step 3: Query LLM
    print(f"🧠 Querying {OLLAMA_MODEL} locally...")
    response = ask_ollama(context, question, stream=True)
    return response


# ── Interactive CLI ───────────────────────────────────────────────────────────

def interactive_chat():
    """Run an interactive chat session with AtmoPulse AI."""
    print("\n" + "="*60)
    print("🌫️  AtmoPulse AI — AQI Intelligence Assistant")
    print("   Powered by Ollama + Llama 3.1 8B (Local & Free)")
    print("="*60)
    print("Commands: 'quit' to exit | 'verbose' to toggle debug mode\n")

    # Optional: set your location for nearest-station context
    user_lat = 28.6315  # Connaught Place, Delhi (default)
    user_lon = 77.2167

    user_profile = {
        "Location": "Connaught Place, Delhi",
        "Age": "Unknown",
        "Health conditions": "Not specified",
    }

    verbose = False

    print(f"📍 Using default location: Connaught Place, Delhi")
    print("   (Edit user_lat/user_lon in rag_query.py for your location)\n")

    while True:
        try:
            question = input("You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye! 👋")
            break

        if not question:
            continue
        if question.lower() == "quit":
            print("Goodbye! 👋")
            break
        if question.lower() == "verbose":
            verbose = not verbose
            print(f"🔧 Verbose mode: {'ON' if verbose else 'OFF'}")
            continue

        query_aqi_assistant(
            question=question,
            user_lat=user_lat,
            user_lon=user_lon,
            user_profile=user_profile,
            verbose=verbose,
        )


if __name__ == "__main__":
    interactive_chat()
