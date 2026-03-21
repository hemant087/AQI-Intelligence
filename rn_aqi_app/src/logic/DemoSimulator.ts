import { BehaviorSubject, Observable } from 'rxjs';
import { AQIReading } from '../models/AqiReading';
import { DeviceConnectionState } from './BleAdapter';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export class DemoSimulator {
  private readingsSubject = new BehaviorSubject<AQIReading | null>(null);
  private connectionStateSubject = new BehaviorSubject<DeviceConnectionState>(DeviceConnectionState.DISCONNECTED);
  
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private basePm25 = 45.0;

  get readings$(): Observable<AQIReading | null> {
    return this.readingsSubject.asObservable();
  }

  get connectionState$(): Observable<DeviceConnectionState> {
    return this.connectionStateSubject.asObservable();
  }

  start() {
    this.connectionStateSubject.next(DeviceConnectionState.CONNECTED);
    
    this.intervalId = setInterval(() => {
      this.basePm25 += (Math.random() * 4) - 2;
      if (this.basePm25 < 0) this.basePm25 = 5.0;

      const reading: AQIReading = {
        id: uuidv4(),
        deviceId: 'demo_sim_rn',
        timestamp: new Date().toISOString(),
        pm25: this.basePm25,
        pm10: this.basePm25 * 1.5,
        sourceType: 'api',
        latitude: 28.6139 + (Math.random() * 0.01 - 0.005),
        longitude: 77.2090 + (Math.random() * 0.01 - 0.005),
      };

      this.readingsSubject.next(reading);
    }, 3000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.connectionStateSubject.next(DeviceConnectionState.DISCONNECTED);
  }
}

export const demoSimulator = new DemoSimulator();
