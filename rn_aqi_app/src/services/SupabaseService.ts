/**
 * SupabaseService.ts
 * Cloud database service — mirrors the LocalStorageService API
 * but persists all data directly to Supabase (PostgreSQL in the cloud).
 *
 * Project: AQI (ap-northeast-2)
 * URL:     https://yqbejwczxmhgccsqupxa.supabase.co
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NewsArticle } from '../models/NewsArticle';
import { AQIReading } from '../models/AqiReading';
import { GovernmentStation } from '../models/GovernmentStation';
import { HistoricalDataPoint } from './OpenAqHistoricalService';

// ─── Supabase config ────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Write secret — must match the value in the DB function valid_app_secret()
// This prevents anonymous third parties from writing to the DB.
const APP_WRITE_SECRET = 'aqi_intel_2026_secure_write';

// ─── Client (singleton) ─────────────────────────────────────────────────────
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
      );
    }
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

// ─── Helper ─────────────────────────────────────────────────────────────────
function logError(operation: string, error: any) {
  console.error(`[Supabase] ${operation} failed:`, error?.message ?? error);
}

// ============================================================
// AQI READINGS
// ============================================================

/**
 * Upsert a single AQI reading to the cloud.
 */
export async function upsertReading(reading: AQIReading): Promise<void> {
  const { error } = await getClient()
    .from('readings')
    .upsert(
      {
        id: reading.id,
        device_id: reading.deviceId,
        timestamp: reading.timestamp,
        pm25: reading.pm25,
        pm10: reading.pm10 ?? null,
        o3: reading.o3 ?? null,
        no2: reading.no2 ?? null,
        so2: reading.so2 ?? null,
        co: reading.co ?? null,
        source_type: reading.sourceType,
        latitude: reading.latitude ?? null,
        longitude: reading.longitude ?? null,
        context_tag: reading.contextTag ?? null,
        manufacturer: reading.stationMetadata?.manufacturer ?? null,
        model: reading.stationMetadata?.model ?? null,
        owner: reading.stationMetadata?.owner ?? null,
        app_secret: APP_WRITE_SECRET,
      },
      { onConflict: 'id' }
    );
  if (error) logError('upsertReading', error);
}

/**
 * Bulk upsert AQI readings.
 */
export async function upsertReadings(readings: AQIReading[]): Promise<void> {
  if (!readings.length) return;
  const rows = readings.map((r) => ({
    id: r.id,
    device_id: r.deviceId,
    timestamp: r.timestamp,
    pm25: r.pm25,
    pm10: r.pm10 ?? null,
    o3: r.o3 ?? null,
    no2: r.no2 ?? null,
    so2: r.so2 ?? null,
    co: r.co ?? null,
    source_type: r.sourceType,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    context_tag: r.contextTag ?? null,
    manufacturer: r.stationMetadata?.manufacturer ?? null,
    model: r.stationMetadata?.model ?? null,
    owner: r.stationMetadata?.owner ?? null,
    app_secret: APP_WRITE_SECRET,
  }));
  const { error } = await getClient()
    .from('readings')
    .upsert(rows, { onConflict: 'id' });
  if (error) logError('upsertReadings', error);
}

/**
 * Fetch recent readings (newest first).
 */
export async function getRecentReadings(limit = 100): Promise<AQIReading[]> {
  const { data, error } = await getClient()
    .from('readings')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (error) { logError('getRecentReadings', error); return []; }
  return (data ?? []).map(mapRowToReading);
}

function mapRowToReading(row: any): AQIReading {
  return {
    id: row.id,
    deviceId: row.device_id,
    timestamp: row.timestamp,
    pm25: row.pm25,
    pm10: row.pm10,
    o3: row.o3,
    no2: row.no2,
    so2: row.so2,
    co: row.co,
    sourceType: row.source_type,
    latitude: row.latitude,
    longitude: row.longitude,
    contextTag: row.context_tag,
    stationMetadata: {
      manufacturer: row.manufacturer,
      model: row.model,
      owner: row.owner,
    },
  };
}

// ============================================================
// GOVERNMENT STATIONS (WAQI)
// ============================================================

/**
 * Upsert a government/WAQI monitoring station + its latest reading.
 */
export async function upsertGovernmentStation(
  station: GovernmentStation
): Promise<void> {
  const { error } = await getClient()
    .from('government_stations')
    .upsert(
      {
        uid: station.uid,
        name: station.name,
        station_name: station.stationName,
        aqi: station.aqi,
        station_time: station.time || new Date().toISOString(),
        city: station.city,
        latitude: station.latitude ?? null,
        longitude: station.longitude ?? null,
        pm25: station.pollutants?.pm25 ?? null,
        pm10: station.pollutants?.pm10 ?? null,
        o3: station.pollutants?.o3 ?? null,
        no2: station.pollutants?.no2 ?? null,
        so2: station.pollutants?.so2 ?? null,
        co: station.pollutants?.co ?? null,
        last_updated: new Date().toISOString(),
        app_secret: APP_WRITE_SECRET,
      },
      { onConflict: 'uid' }
    );
  if (error) logError('upsertGovernmentStation', error);
}

/**
 * Bulk upsert government stations.
 */
export async function upsertGovernmentStations(
  stations: GovernmentStation[]
): Promise<void> {
  if (!stations.length) return;
  const rows = stations.map((s) => ({
    uid: s.uid,
    name: s.name,
    station_name: s.stationName,
    aqi: s.aqi,
    station_time: s.time || new Date().toISOString(),
    city: s.city,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    pm25: s.pollutants?.pm25 ?? null,
    pm10: s.pollutants?.pm10 ?? null,
    o3: s.pollutants?.o3 ?? null,
    no2: s.pollutants?.no2 ?? null,
    so2: s.pollutants?.so2 ?? null,
    co: s.pollutants?.co ?? null,
    last_updated: new Date().toISOString(),
    app_secret: APP_WRITE_SECRET,
  }));
  const { error } = await getClient()
    .from('government_stations')
    .upsert(rows, { onConflict: 'uid' });
  if (error) logError('upsertGovernmentStations', error);
}

/**
 * Get all stations for a city.
 */
export async function getStationsByCity(city: string): Promise<GovernmentStation[]> {
  const { data, error } = await getClient()
    .from('government_stations')
    .select('*')
    .eq('city', city)
    .order('aqi', { ascending: false });
  if (error) { logError('getStationsByCity', error); return []; }
  return (data ?? []).map(mapRowToStation);
}

/**
 * Get ALL stations (used on web where city='Delhi NCR' for pipeline-seeded data).
 */
export async function getAllStations(limit = 200): Promise<GovernmentStation[]> {
  const { data, error } = await getClient()
    .from('government_stations')
    .select('*')
    .order('station_name', { ascending: true })
    .limit(limit);
  if (error) { logError('getAllStations', error); return []; }
  return (data ?? []).map(mapRowToStation);
}

/**
 * Find the nearest station from the cloud cache.
 */
export async function findNearestStation(lat: number, lon: number): Promise<GovernmentStation | null> {
  const all = await getAllStations(500);
  if (!all.length) return null;

  // Simple Euclidean distance for the sort
  const sorted = all.sort((a, b) => {
    const dA = Math.sqrt(Math.pow(a.latitude - lat, 2) + Math.pow(a.longitude - lon, 2));
    const dB = Math.sqrt(Math.pow(b.latitude - lat, 2) + Math.pow(b.longitude - lon, 2));
    return dA - dB;
  });

  return sorted[0] || null;
}

function mapRowToStation(row: any): GovernmentStation {
  return {
    uid: row.uid,
    name: row.station_name || row.name || 'Unknown Station',
    stationName: row.station_name || row.name || 'Unknown Station',
    aqi: row.aqi,
    time: row.station_time,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    pollutants: {
      pm25: row.pm25,
      pm10: row.pm10,
      o3: row.o3,
      no2: row.no2,
      so2: row.so2,
      co: row.co,
    },
  };
}

// ============================================================
// NEWS ARTICLES
// ============================================================

/**
 * Upsert a single news article.
 */
export async function upsertNewsArticle(article: NewsArticle): Promise<void> {
  const { error } = await getClient()
    .from('news_articles')
    .upsert(
      {
        id: article.id,
        title: article.title,
        description: article.description ?? null,
        content: article.content ?? null,
        url: article.url,
        image_url: article.imageUrl ?? null,
        source: article.source,
        published_at: article.publishedAt,
        fetched_at: new Date().toISOString(),
        app_secret: APP_WRITE_SECRET,
      },
      { onConflict: 'id' }
    );
  if (error) logError('upsertNewsArticle', error);
}

/**
 * Bulk upsert news articles.
 */
export async function upsertNewsArticles(
  articles: NewsArticle[]
): Promise<void> {
  if (!articles.length) return;
  const rows = articles.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description ?? null,
    content: a.content ?? null,
    url: a.url,
    image_url: a.imageUrl ?? null,
    source: a.source,
    published_at: a.publishedAt,
    fetched_at: new Date().toISOString(),
    app_secret: APP_WRITE_SECRET,
  }));
  const { error } = await getClient()
    .from('news_articles')
    .upsert(rows, { onConflict: 'id' });
  if (error) logError('upsertNewsArticles', error);
}

/**
 * Get all news articles (newest first).
 */
export async function getAllNews(limit = 200): Promise<NewsArticle[]> {
  const { data, error } = await getClient()
    .from('news_articles')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) { logError('getAllNews', error); return []; }
  return (data ?? []).map((row: any): NewsArticle => ({
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    url: row.url,
    imageUrl: row.image_url,
    source: row.source,
    publishedAt: row.published_at,
  }));
}

// ============================================================
// HISTORICAL MEASUREMENTS (OpenAQ)
// ============================================================

/**
 * Upsert historical sensor measurements.
 */
export async function upsertHistoricalMeasurements(
  sensorId: string,
  locationId: string,
  parameter: string,
  points: HistoricalDataPoint[]
): Promise<void> {
  if (!points.length) return;
  const rows = points.map((p) => ({
    sensor_id: sensorId,
    location_id: locationId,
    parameter,
    value: p.value,
    measured_at: p.timestamp,
    app_secret: APP_WRITE_SECRET,
  }));
  const { error } = await getClient()
    .from('historical_measurements')
    .upsert(rows, { onConflict: 'sensor_id,measured_at,parameter', ignoreDuplicates: true });
  if (error) logError('upsertHistoricalMeasurements', error);
}

/**
 * Get historical measurements for a sensor/parameter.
 */
export async function getHistoricalMeasurements(
  sensorId: string,
  parameter = 'pm25',
  limit = 24
): Promise<HistoricalDataPoint[]> {
  const { data, error } = await getClient()
    .from('historical_measurements')
    .select('measured_at, value')
    .eq('sensor_id', sensorId)
    .eq('parameter', parameter)
    .order('measured_at', { ascending: true })
    .limit(limit);
  if (error) { logError('getHistoricalMeasurements', error); return []; }
  return (data ?? []).map((r: any) => ({
    timestamp: r.measured_at,
    value: r.value,
  }));
}

// ============================================================
// EXPORT
// ============================================================
export const supabaseService = {
  // Readings
  upsertReading,
  upsertReadings,
  getRecentReadings,
  // Government Stations
  upsertGovernmentStation,
  upsertGovernmentStations,
  getStationsByCity,
  getAllStations,
  findNearestStation,
  // News
  upsertNewsArticle,
  upsertNewsArticles,
  getAllNews,
  // Historical
  upsertHistoricalMeasurements,
  getHistoricalMeasurements,
  // Raw client (for custom queries)
  getClient,
};
