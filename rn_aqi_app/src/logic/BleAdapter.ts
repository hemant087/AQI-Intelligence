import { BleManager, Device, State } from "react-native-ble-plx";
import { Platform, PermissionsAndroid } from "react-native";
import { AQIReading } from "../models/AqiReading";
import { Subject, Observable } from "rxjs";
import { IAqiAdapter, DeviceConnectionState } from "./IAqiAdapter";

export class BleAdapter implements IAqiAdapter {
  id = "ble";
  name = "Bluetooth (BLE)";
  private manager: BleManager | null = null;
  private connectedDevice: any = null;
  private connectionStateSubject = new Subject<DeviceConnectionState>();
  private readingsSubject = new Subject<AQIReading>();

  constructor() {
    if (Platform.OS !== "web") {
      this.manager = new BleManager();
    }
  }

  get connectionState$(): Observable<DeviceConnectionState> {
    return this.connectionStateSubject.asObservable();
  }

  get readings$(): Observable<AQIReading> {
    return this.readingsSubject.asObservable();
  }

  async requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS === "android" && (Platform.Version as number) >= 31) {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      return (
        granted["android.permission.BLUETOOTH_SCAN"] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted["android.permission.BLUETOOTH_CONNECT"] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  }

  async startScan(onDeviceFound: (device: Device) => void) {
    if (!this.manager) return;

    // Request Android 12+ Bluetooth permissions
    const bleGranted = await this.requestBluetoothPermissions();
    if (!bleGranted) {
      console.warn("Bluetooth permissions not granted - cannot scan.");
      return;
    }

    // Explicit permission check for Android/iOS location
    const { locationService } = await import("../services/LocationService");
    const granted = await locationService.requestPermissions();
    if (!granted) {
      console.warn(
        "Location permissions not granted - BLE scanning will likely fail.",
      );
      return;
    }

    const state = await this.manager.state();
    if (state !== State.PoweredOn) {
      console.warn("Bluetooth is not powered on");
      return;
    }

    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Scan error", error);
        return;
      }
      if (device) {
        onDeviceFound(device);
      }
    });
  }

  stopScan() {
    this.manager?.stopDeviceScan();
  }

  async connect(device?: any): Promise<boolean> {
    try {
      this.connectionStateSubject.next(DeviceConnectionState.CONNECTING);

      this.connectedDevice = await device.connect();
      await this.connectedDevice.discoverAllServicesAndCharacteristics();

      this.connectionStateSubject.next(DeviceConnectionState.CONNECTED);
      this.setupNotifications();

      return true;
    } catch (e) {
      console.error("Connection failed", e);
      this.connectionStateSubject.next(DeviceConnectionState.ERROR);
      return false;
    }
  }

  private async setupNotifications() {
    if (!this.connectedDevice) return;

    // Example UUIDs - in a real app these would be specific to the AQI hardware
    const SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
    const CHAR_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

    try {
      if (!this.connectedDevice) return;
      this.connectedDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        CHAR_UUID,
        (error: any, characteristic: any) => {
          if (error) {
            console.error("Monitor error", error);
            return;
          }
          if (characteristic?.value) {
            this.processData(characteristic.value);
          }
        },
      );
    } catch (e) {
      console.error("Failed to setup notifications", e);
    }
  }

  private processData(base64Data: string) {
    // Decode base64 and parse AQI values
    // This depends on the sensor's specific data format
    const pm25 = 42; // Placeholder for decoded value

    const reading: AQIReading = {
      id: Date.now().toString(),
      deviceId: this.connectedDevice?.id || "unknown",
      timestamp: new Date().toISOString(),
      pm25,
      sourceType: "bluetooth",
    };

    this.readingsSubject.next(reading);
  }

  async disconnect() {
    if (this.connectedDevice) {
      await this.connectedDevice.cancelConnection();
      this.connectedDevice = null;
    }
    this.connectionStateSubject.next(DeviceConnectionState.DISCONNECTED);
  }
}

export const bleAdapter = new BleAdapter();
