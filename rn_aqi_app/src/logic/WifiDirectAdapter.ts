import { BehaviorSubject, Observable } from "rxjs";
import { AQIReading } from "../models/AqiReading";
import { IAqiAdapter, DeviceConnectionState } from "./IAqiAdapter";

export class WifiDirectAdapter implements IAqiAdapter {
  id = "wifi";
  name = "Wi-Fi Direct (Local Hotspot)";

  private connectionStateSubject = new BehaviorSubject<DeviceConnectionState>(
    DeviceConnectionState.DISCONNECTED,
  );
  private readingsSubject = new BehaviorSubject<AQIReading | null>(null);

  get connectionState$(): Observable<DeviceConnectionState> {
    return this.connectionStateSubject.asObservable();
  }

  get readings$(): Observable<AQIReading | null> {
    return this.readingsSubject.asObservable();
  }

  async connect(localIp?: string): Promise<boolean> {
    this.connectionStateSubject.next(DeviceConnectionState.CONNECTING);

    // TODO: Ask user to connect their phone Wi-Fi to the sensor's hotspot.
    // Make a local HTTP request or establish a local WebSocket connection
    // const res = await fetch(`http://${localIp || '192.168.4.1'}/data`);

    this.connectionStateSubject.next(DeviceConnectionState.CONNECTED);
    return true;
  }

  async disconnect(): Promise<void> {
    this.connectionStateSubject.next(DeviceConnectionState.DISCONNECTED);
  }
}

export const wifiDirectAdapter = new WifiDirectAdapter();
