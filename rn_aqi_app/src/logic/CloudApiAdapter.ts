import { BehaviorSubject, Observable } from "rxjs";
import { AQIReading } from "../models/AqiReading";
import { IAqiAdapter, DeviceConnectionState } from "./IAqiAdapter";

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
      // 1. Primary: Try OpenAQ v3 (might fail on web due to CORS)
      try {
        const openAqLocRes = await fetch(
          `${OPENAQ_BASE}/locations?coordinates=${lat},${lon}&radius=25000&limit=1`,
          {
            headers: {
              'X-API-Key': OPENAQ_KEY || '',
            },
          }
        );

        if (openAqLocRes.ok) {
          const locData = await openAqLocRes.json();
          if (locData.results && locData.results.length > 0) {
            const location = locData.results[0];
            const locationId = location.id;
            const manufacturer = location.manufacturers?.[0]?.manufacturerName;
            const model = location.manufacturers?.[0]?.modelName;
            const owner = location.owners?.[0]?.ownerName;
            
            const openAqLatestRes = await fetch(
              `${OPENAQ_BASE}/locations/${locationId}/latest`,
              {
                headers: {
                  'X-API-Key': OPENAQ_KEY || '',
                },
              }
            );

            if (openAqLatestRes.ok) {
              const latestData = await openAqLatestRes.json();
              if (latestData.results && latestData.results.length > 0) {
                const measurements = latestData.results;
                const getVal = (param: string) => measurements.find((m: any) => m.parameter.name === param)?.value;

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
                  latitude: location.coordinates?.latitude,
                  longitude: location.coordinates?.longitude,
                  stationMetadata: { manufacturer, model, owner }
                };
                this.readingsSubject.next(reading);
                return; // Success with OpenAQ
              }
            }
          }
        }
      } catch (openAqErr) {
        // Silently continue to WAQI if OpenAQ fails (likely CORS on web)
        console.warn("OpenAQ fetch skipped or failed:", openAqErr);
      }

      // 2. Fallback: WAQI (World Air Quality Index) - usually works on web
      const waqiRes = await fetch(
        `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${process.env.EXPO_PUBLIC_WAQI_TOKEN}`,
      );
      if (waqiRes.ok) {
        const data = await waqiRes.json();
        if (data.status === "ok") {
          const reading: AQIReading = {
            id: `waqi_${Date.now()}`,
            deviceId: data.data.city.url,
            timestamp: new Date().toISOString(),
            pm25: data.data.iaqi.pm25?.v || 0,
            sourceType: "api",
          };
          this.readingsSubject.next(reading);
        }
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
