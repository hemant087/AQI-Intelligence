import { BehaviorSubject, Observable } from 'rxjs';
import { AQIReading } from '../models/AqiReading';
import { bleAdapter, DeviceConnectionState } from './BleAdapter';
import { locationService } from '../services/LocationService';
import { localStorageService } from '../services/LocalStorageService';

import { demoSimulator } from './DemoSimulator';

export class DataCollectionManager {
  private latestReadingSubject = new BehaviorSubject<AQIReading | null>(null);

  constructor() {
    this.init();
  }

  private init() {
    // Listen to BLE readings
    bleAdapter.readings$.subscribe(async (reading) => {
      await this.processReading(reading);
    });

    // Listen to Demo Simulator
    demoSimulator.readings$.subscribe(async (reading) => {
      if (reading) await this.processReading(reading);
    });

    // Start simulator automatically for demo purposes
    demoSimulator.start();
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
      contextTag: location ? locationService.determineContextTag(location) : 'unknown',
    };

    // 3. Storage
    await localStorageService.insertReading(enrichedReading);

    // 4. Update UI
    this.latestReadingSubject.next(enrichedReading);
  }

  async startBleScan(onDeviceFound: any) {
    await bleAdapter.startScan(onDeviceFound);
  }

  stopBleScan() {
    bleAdapter.stopScan();
  }
}

export const dataCollectionManager = new DataCollectionManager();
