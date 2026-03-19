import 'dart:async';
import '../models/aqi_reading.dart';

enum DeviceConnectionState { disconnected, connecting, connected, error }

/// The abstract class that all specific device plugins must implement.
abstract class DeviceAdapter {
  final String adapterId;
  final String adapterName;
  
  DeviceAdapter({
    required this.adapterId,
    required this.adapterName,
  });

  /// The current connection state of the device
  DeviceConnectionState get connectionState;

  /// Stream of connection state changes to observe UI updates
  Stream<DeviceConnectionState> get connectionStateStream;

  /// Connect/Initialize the underlying device or service
  Future<bool> connect();

  /// Disconnect/Dispose the underlying device or service
  Future<void> disconnect();

  /// Stream of incoming raw or semi-processed readings
  Stream<AQIReading> get readingsStream;
}
