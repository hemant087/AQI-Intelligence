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
    try {
      // 1. Primary: Try OpenAQ (which contains CPCB India core data)
      // Note: In production, you should add your OpenAQ API key to the headers
      const openAqRes = await fetch(
        `https://api.openaq.org/v2/latest?coordinates=${lat},${lon}&radius=5000`,
      );

      if (openAqRes.ok) {
        const data = await openAqRes.json();
        if (data.results && data.results.length > 0) {
          // Parse OpenAQ
          const pm25Measurement = data.results[0].measurements.find(
            (m: any) => m.parameter === "pm25",
          );
          const reading: AQIReading = {
            id: `openaq_${Date.now()}`,
            deviceId:
              data.results[0].locationId?.toString() || "openaq_station",
            timestamp: new Date().toISOString(),
            pm25: pm25Measurement ? pm25Measurement.value : 0,
            sourceType: "api",
          };
          this.readingsSubject.next(reading);
          return;
        }
      }

      // 2. Fallback: WAQI (World Air Quality Index)
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
      console.error("Failed to fetch from Cloud APIs", e);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.connectionStateSubject.next(DeviceConnectionState.DISCONNECTED);
  }
}

export const cloudApiAdapter = new CloudApiAdapter();
