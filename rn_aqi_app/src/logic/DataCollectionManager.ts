import { BehaviorSubject, Observable, Subscription } from "rxjs";
import { Platform } from "react-native";
import { AQIReading } from "../models/AqiReading";
import { IAqiAdapter, DeviceConnectionState } from "./IAqiAdapter";
import { bleAdapter } from "./BleAdapter";
import { demoSimulator } from "./DemoSimulator";
import { cloudApiAdapter } from "./CloudApiAdapter";
import { wifiDirectAdapter } from "./WifiDirectAdapter";
import { locationService } from "../services/LocationService";
import { localStorageService } from "../services/LocalStorageService";

export class DataCollectionManager {
  private latestReadingSubject = new BehaviorSubject<AQIReading | null>(null);

  // The newly introduced Universal Adapter Registry
  public adapters: IAqiAdapter[] = [
    bleAdapter,
    demoSimulator,
    cloudApiAdapter,
    wifiDirectAdapter,
  ];

  private activeAdapter: IAqiAdapter | null = null;
  private readingSub: Subscription | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Auto-start the Cloud API adapter as the baseline.
    // Use the Location Service to feed it the user's GPS coords.
    this.startCloudFallback();
  }

  public async startCloudFallback() {
    const loc = await locationService.getCurrentPosition();
    if (loc) {
      await this.setActiveAdapter(cloudApiAdapter, {
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
      });
    } else {
      // If no location permissions yet, just use New Delhi coords (India Gate)
      await this.setActiveAdapter(cloudApiAdapter, {
        lat: 28.6129,
        lon: 77.2295,
      });
    }
  }

  public async setActiveAdapter(adapter: IAqiAdapter, connectionArgs?: any) {
    if (this.activeAdapter) {
      await this.activeAdapter.disconnect();
    }
    if (this.readingSub) {
      this.readingSub.unsubscribe();
    }

    this.activeAdapter = adapter;

    this.readingSub = this.activeAdapter.readings$.subscribe(
      async (reading) => {
        if (reading) await this.processReading(reading);
      },
    );

    await this.activeAdapter.connect(connectionArgs);
  }

  get latestReading$(): Observable<AQIReading | null> {
    return this.latestReadingSubject.asObservable();
  }

  private async processReading(rawReading: AQIReading) {
    // 1. Basic Validation
    if (rawReading.pm25 < 0 || rawReading.pm25 > 2000) return;

    // 2. Geotagging
    const location = await locationService.getCurrentPosition();
    const enrichedReading: AQIReading = {
      ...rawReading,
      latitude: location?.coords.latitude,
      longitude: location?.coords.longitude,
      contextTag: location
        ? locationService.determineContextTag(location)
        : "unknown",
    };

    // 3. Storage
    await localStorageService.insertReading(enrichedReading);

    // 4. Update UI
    this.latestReadingSubject.next(enrichedReading);
  }

  async startBleScan(onDeviceFound: any) {
    // Helper specifically for BLE discovery
    await bleAdapter.startScan(onDeviceFound);
  }

  stopBleScan() {
    bleAdapter.stopScan();
  }

  getActiveAdapter(): IAqiAdapter | null {
    return this.activeAdapter;
  }
}

export const dataCollectionManager = new DataCollectionManager();
