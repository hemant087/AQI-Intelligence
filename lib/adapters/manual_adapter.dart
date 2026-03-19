import 'dart:async';
import '../models/aqi_reading.dart';
import 'device_adapter.dart';

class ManualAdapter extends DeviceAdapter {
  final _connectionStateController = StreamController<DeviceConnectionState>.broadcast();
  final _readingsController = StreamController<AQIReading>.broadcast();

  ManualAdapter() : super(adapterId: 'manual-entry', adapterName: 'Manual Entry');

  @override
  DeviceConnectionState get connectionState => DeviceConnectionState.connected;

  @override
  Stream<DeviceConnectionState> get connectionStateStream => _connectionStateController.stream;

  @override
  Stream<AQIReading> get readingsStream => _readingsController.stream;

  @override
  Future<bool> connect() async {
    _connectionStateController.add(DeviceConnectionState.connected);
    return true;
  }

  @override
  Future<void> disconnect() async {
    _connectionStateController.add(DeviceConnectionState.disconnected);
  }

  void submitReading(AQIReading reading) {
    if (reading.sourceType == 'manual') {
      _readingsController.add(reading);
    }
  }
}
