import { BehaviorSubject, Observable } from "rxjs";
import { AQIReading } from "../models/AqiReading";
import { IAqiAdapter, DeviceConnectionState } from "./IAqiAdapter";
import { supabaseService } from "../services/SupabaseService";
import NcrStationsRaw from '../constants/NcrStations.json';

interface NcrStation {
  uid: number;
  station_name: string;
  latitude: number;
  longitude: number;
  sensorMap?: Record<string, string>;
}

const NcrStations: NcrStation[] = NcrStationsRaw as unknown as NcrStation[];

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function findNearestLocalStation(lat: number, lon: number): NcrStation | null {
  let nearestStation: NcrStation | null = null;
  let minDistance = Infinity;

  for (const station of NcrStations) {
    if (station.latitude && station.longitude) {
      const distance = getDistanceFromLatLonInKm(lat, lon, station.latitude, station.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    }
  }

  return minDistance <= 25 ? nearestStation : null;
}

export class CloudApiAdapter implements IAqiAdapter {
  id = "cloud";
  name = "Cloud REST APIs";

  private connectionStateSubject = new BehaviorSubject<DeviceConnectionState>(
    DeviceConnectionState.DISCONNECTED,
  );
  private readingsSubject = new BehaviorSubject<AQIReading | null>(null);
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  get connectionState$(): Observable<DeviceConnectionState> {
    return this.connectionStateSubject.asObservable();
  }

  get readings$(): Observable<AQIReading | null> {
    return this.readingsSubject.asObservable();
  }

  async connect(coords?: { lat: number; lon: number }): Promise<boolean> {
    this.connectionStateSubject.next(DeviceConnectionState.CONNECTING);

    if (coords) {
      this.fetchFromApis(coords.lat, coords.lon);

      // Poll every 15 minutes
      this.pollingInterval = setInterval(
        () => {
          this.fetchFromApis(coords.lat, coords.lon);
        },
        15 * 60 * 1000,
      );
    }

    this.connectionStateSubject.next(DeviceConnectionState.CONNECTED);
    return true;
  }

  private async fetchFromApis(lat: number, lon: number) {
    const OPENAQ_KEY = process.env.EXPO_PUBLIC_OPENAQ_API_KEY;
    const OPENAQ_BASE = 'https://api.openaq.org/v3';

    try {
      // ── PRIMARY: OpenAQ v3 (Native only, as web has CORS) ─────────────────
      try {
        const nearestLocal = findNearestLocalStation(lat, lon);

        if (nearestLocal) {
          const locationId = nearestLocal.uid;
            
          const openAqLatestRes = await fetch(
            `${OPENAQ_BASE}/locations/${locationId}/latest`,
            { headers: { 'X-API-Key': OPENAQ_KEY || '' } }
          );

          if (openAqLatestRes.ok) {
            const latestData = await openAqLatestRes.json();
            if (latestData.results && latestData.results.length > 0) {
              const measurements = latestData.results;
              const sensorMap = nearestLocal.sensorMap || {};
              const getVal = (param: string) => {
                const match = measurements.find((m: any) => {
                  const sId = m.sensorsId ? String(m.sensorsId) : "";
                  const pName = sensorMap[sId];
                  return pName === param;
                });
                return match?.value ?? undefined;
              };

              const reading: AQIReading = {
                id: `openaq_v3_${locationId}_${Date.now()}`,
                deviceId: locationId.toString(),
                timestamp: new Date().toISOString(),
                pm25: getVal("pm25") || 0,
                pm10: getVal("pm10"),
                o3: getVal("o3"),
                no2: getVal("no2"),
                so2: getVal("so2"),
                co: getVal("co"),
                sourceType: "api",
                latitude: nearestLocal.latitude,
                longitude: nearestLocal.longitude,
                stationMetadata: {
                  owner: nearestLocal.station_name
                }
              };
              this.readingsSubject.next(reading);
              return;
            }
          }
        }
      } catch (openAqErr) {
        console.warn("[CloudAdapter] OpenAQ fetch failed (CORS), falling back to Supabase...");
      }

      // ── SECONDARY: Supabase Query (Web-friendly fallback) ────────────────
      try {
        const nearest = await supabaseService.findNearestStation(lat, lon);
        if (nearest && (nearest.pollutants?.pm25 !== null && nearest.pollutants?.pm25 !== undefined)) {
          const reading: AQIReading = {
            id: `supabase_${nearest.uid}_${Date.now()}`,
            deviceId: nearest.uid.toString(),
            timestamp: nearest.time || new Date().toISOString(),
            pm25: nearest.pollutants.pm25,
            pm10: nearest.pollutants.pm10,
            sourceType: "api",
            latitude: nearest.latitude,
            longitude: nearest.longitude,
            stationMetadata: {
              owner: `${nearest.name} (Cloud Cache)`
            }
          };
          this.readingsSubject.next(reading);
        }
      } catch (dbErr) {
        console.error("[CloudAdapter] Supabase fallback failed:", dbErr);
      }

    } catch (e) {
      console.error("Critical failure in CloudApiAdapter", e);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.connectionStateSubject.next(DeviceConnectionState.DISCONNECTED);
  }
}

export const cloudApiAdapter = new CloudApiAdapter();
