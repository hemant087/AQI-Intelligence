"""
web_search.py — Real-time web intelligence for AQI Intelligence RAG
====================================================================
Uses DuckDuckGo (free, no API key) to fetch fresh web snippets about
current Delhi NCR air quality events, then summarizes them.

Install:
  pip install duckduckgo-search

Usage:
  from web_search import fetch_web_intelligence
  brief = fetch_web_intelligence(aqi=187, events=["dust storm", "PM10"])
"""

from __future__ import annotations

import time
from datetime import datetime, timezone

try:
    from duckduckgo_search import DDGS
    DDGS_AVAILABLE = True
except ImportError:
    DDGS_AVAILABLE = False


# ── Search Query Builder ──────────────────────────────────────────────────────

def build_queries(aqi: int | None = None, events: list[str] | None = None) -> list[str]:
    """Auto-generate targeted search queries from current AQI context."""
    today = datetime.now(timezone.utc).strftime("%B %Y")
    queries = []

    # Always search for current Delhi AQI news
    queries.append(f"Delhi NCR air quality AQI today {today}")

    # Add event-specific queries if we know what's driving pollution
    if events:
        for event in events[:2]:   # Limit to top 2 events
            queries.append(f"Delhi {event} air quality {today}")

    # AQI-level based queries
    if aqi and aqi >= 200:
        queries.append("Delhi air quality Hazardous health advisory India")
    elif aqi and aqi >= 150:
        queries.append("Delhi NCR pollution unhealthy level causes today")

    # Always look for solutions/actions
    queries.append("how to reduce air pollution Delhi NCR quick actions")

    return queries[:4]  # Max 4 queries to stay fast


# ── Web Fetcher ───────────────────────────────────────────────────────────────

def fetch_snippets(query: str, max_results: int = 4) -> list[dict]:
    """Fetch web snippets via DuckDuckGo (no key needed)."""
    if not DDGS_AVAILABLE:
        return []
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(
                query,
                region="in-en",          # India - English results
                safesearch="off",
                timelimit="w",           # Past week only (fresh results)
                max_results=max_results,
            ))
            return results
    except Exception as e:
        return []


def fetch_web_intelligence(
    aqi: int | None = None,
    events: list[str] | None = None,
    max_snippets: int = 8,
) -> str:
    """
    Main entry: search the web for current Delhi AQI news and return
    a formatted context block ready for injection into the RAG prompt.
    """
    if not DDGS_AVAILABLE:
        return "[Web search unavailable: run 'pip install duckduckgo-search']"

    queries   = build_queries(aqi, events)
    all_items = []
    seen_urls = set()

    for query in queries:
        snippets = fetch_snippets(query, max_results=3)
        for s in snippets:
            url = s.get("href", "")
            if url not in seen_urls and s.get("body"):
                seen_urls.add(url)
                all_items.append({
                    "title":   s.get("title", "").strip(),
                    "snippet": s.get("body", "").strip()[:300],
                    "url":     url,
                    "query":   query,
                })
        time.sleep(0.3)   # polite delay between searches
        if len(all_items) >= max_snippets:
            break

    if not all_items:
        return "[No web results found — check internet connection]"

    # Format as a readable context block
    lines = [
        f"=== LIVE WEB INTELLIGENCE ({len(all_items)} sources, fetched now) ===",
        f"Queries used: {' | '.join(queries)}",
        "",
    ]
    for i, item in enumerate(all_items[:max_snippets], 1):
        lines.append(f"[Web {i}] {item['title']}")
        lines.append(f"  {item['snippet']}")
        lines.append("")

    return "\n".join(lines)


# ── Quick Brief Generator (standalone) ───────────────────────────────────────

def generate_quick_brief(web_context: str, ollama_url: str, model: str) -> str:
    """Ask the local LLM to compress web intelligence into a 5-line brief."""
    import requests, json

    system = (
        "You are a news summarizer. Given web search results about Delhi NCR air quality, "
        "produce a QUICK BRIEF of exactly 5 bullet points. "
        "Each bullet must be one short sentence (max 15 words). "
        "Focus on: what's causing pollution, health risk, and one action. "
        "Do NOT repeat the same point twice. Be direct and specific."
    )

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": f"Web results:\n{web_context}\n\nWrite the 5-bullet Quick Brief now:"},
        ],
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 200,
            "num_ctx":     2048,
            "num_gpu":     -1,
        }
    }

    try:
        resp = requests.post(f"{ollama_url}/api/chat", json=payload, timeout=60)
        if resp.ok:
            return resp.json().get("message", {}).get("content", "")
        return f"[Brief generation failed: {resp.status_code}]"
    except Exception as e:
        return f"[Brief generation error: {e}]"


if __name__ == "__main__":
    # Quick test
    print("Searching web for Delhi AQI news...\n")
    context = fetch_web_intelligence(aqi=150, events=["dust storm", "traffic"])
    print(context)
