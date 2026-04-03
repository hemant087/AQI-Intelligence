"""
test_rag.py — Resilient sanity tests for the RAG pipeline
Run: python test_rag.py
"""

import time
import requests as req
from rag_query import (
    fetch_stations,
    fetch_news,
    fetch_recent_readings,
    build_context,
    check_ollama,
    query_aqi_assistant,
)

PASS = 0
FAIL = 0

def ok(msg):
    global PASS
    PASS += 1
    print(f"  ✅ {msg}")

def warn(msg):
    print(f"  ⚠️  {msg}")

def fail(msg):
    global FAIL
    FAIL += 1
    print(f"  ❌ {msg}")


def retry_fetch(fn, label, retries=3, delay=3):
    """Retry a fetch function on timeout/connection errors (Supabase free tier cold-start)."""
    for attempt in range(1, retries + 1):
        try:
            return fn()
        except (req.exceptions.ConnectTimeout, req.exceptions.ConnectionError) as e:
            if attempt < retries:
                print(f"  ⏳ Attempt {attempt} timed out — Supabase warming up, retrying in {delay}s...")
                time.sleep(delay)
            else:
                raise


# ─────────────────────────────────────────────────────────────────────────────

def test_stations():
    print("\n🔍 Test 1: Supabase — Fetch Stations")
    try:
        stations = retry_fetch(
            lambda: fetch_stations(user_lat=28.6315, user_lon=77.2167, limit=5),
            "stations"
        )
        if stations:
            ok(f"Got {len(stations)} stations")
            ok(f"Nearest: {stations[0].get('station_name')} | AQI: {stations[0].get('aqi')}")
        else:
            warn("No stations returned — is the data pipeline running?")
    except Exception as e:
        fail(f"Stations fetch failed: {e}")


def test_news():
    print("\n🔍 Test 2: Supabase — Fetch News")
    try:
        news = retry_fetch(
            lambda: fetch_news(limit=3),
            "news"
        )
        ok(f"Got {len(news)} news articles")
        if news:
            ok(f"Latest: {news[0].get('title', '')[:80]}")
        else:
            warn("news_articles table is empty — run NewsService to populate it")
    except Exception as e:
        fail(f"News fetch failed: {e}")


def test_readings():
    print("\n🔍 Test 3: Supabase — Fetch Readings")
    try:
        readings = retry_fetch(
            lambda: fetch_recent_readings(limit=3),
            "readings"
        )
        ok(f"Got {len(readings)} recent readings")
        if readings:
            r = readings[0]
            pm25 = f"PM2.5: {r['pm25']:.1f}µg/m³" if r.get("pm25") else "no PM2.5"
            ok(f"Latest: {pm25} at {r.get('timestamp','')[:16]} UTC")
    except Exception as e:
        fail(f"Readings fetch failed: {e}")


def test_context():
    print("\n🔍 Test 4: Context Assembly")
    try:
        context = build_context(
            user_lat=28.6315,
            user_lon=77.2167,
            user_profile={"Age": "25", "Health": "Healthy"}
        )
        if len(context) > 100:
            ok(f"Context assembled ({len(context)} chars)")
        else:
            fail("Context too short — data fetch may have failed")

        print("\n--- CONTEXT PREVIEW (first 600 chars) ---")
        print(context[:600])
        print("--- END PREVIEW ---")
    except Exception as e:
        fail(f"Context assembly failed: {e}")


def test_ollama():
    print("\n🔍 Test 5: Ollama — Local LLM")
    running = check_ollama()
    if running:
        ok("Ollama is running and llama3.1:8b is available!")
    else:
        warn("Ollama not running or model not installed. Steps to fix:")
        print("       1. Download: https://ollama.com/download")
        print("       2. In terminal: ollama pull llama3.1:8b")
        print("       3. Ollama starts automatically in the background")


def test_full_rag():
    print("\n🔍 Test 6: Full RAG Query (end-to-end)")
    if not check_ollama():
        warn("Skipped — Ollama not running (install it first)")
        return
    try:
        query_aqi_assistant(
            question="Is the air quality safe for outdoor exercise today in Delhi?",
            user_lat=28.6315,
            user_lon=77.2167,
            user_profile={"Age": "25", "Health": "Healthy", "Activity": "Morning jog"},
        )
        ok("Full RAG query completed successfully")
    except Exception as e:
        fail(f"RAG query failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("AQI Intelligence — RAG Pipeline Tests")
    print("=" * 60)
    print("Note: Supabase free tier may need a few seconds to warm up.")
    print("      Timeouts will auto-retry up to 3 times.\n")

    test_stations()
    test_news()
    test_readings()
    test_context()
    test_ollama()
    test_full_rag()

    print("\n" + "=" * 60)
    print(f"Results: {PASS} passed  |  {FAIL} failed")
    print("=" * 60)
    if FAIL == 0:
        print("🎉 All tests passed! RAG pipeline is ready.")
    else:
        print("⚠️  Some tests failed. Check output above for details.")
