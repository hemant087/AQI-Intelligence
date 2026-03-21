import { Observable } from "rxjs";
import { AQIReading } from "../models/AqiReading";

export enum DeviceConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

export interface IAqiAdapter {
  /** Unique identifier for the adapter strategy */
  id: string;

  /** Human readable name of the connection type */
  name: string;

  /** Current state of the hardware connection */
  connectionState$: Observable<DeviceConnectionState>;

  /** Stream of incoming AQI readings from the device/source */
  readings$: Observable<AQIReading | null>;

  /** Initiate connection to the device or service */
  connect(connectionArgs?: any): Promise<boolean>;

  /** Terminate the connection */
  disconnect(): Promise<void>;
}
