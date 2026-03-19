import 'dart:async';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../models/aqi_reading.dart';
import 'device_adapter.dart';

class BluetoothAdapter extends DeviceAdapter {
  final BluetoothDevice device;
  DeviceConnectionState _connectionState = DeviceConnectionState.disconnected;
  final _connectionStateController = StreamController<DeviceConnectionState>.broadcast();
  final _readingsController = StreamController<AQIReading>.broadcast();
  StreamSubscription? _connectionSub;
  StreamSubscription? _characteristicSub;

  BluetoothAdapter({required this.device})
      : super(
          adapterId: device.remoteId.str,
          adapterName: device.platformName.isEmpty ? 'Unknown BLE Device' : device.platformName,
        );

  @override
  DeviceConnectionState get connectionState => _connectionState;

  @override
  Stream<DeviceConnectionState> get connectionStateStream => _connectionStateController.stream;

  @override
  Stream<AQIReading> get readingsStream => _readingsController.stream;

  void _updateState(DeviceConnectionState state) {
    _connectionState = state;
    _connectionStateController.add(state);
  }

  @override
  Future<bool> connect() async {
    try {
      _updateState(DeviceConnectionState.connecting);
      await device.connect(autoConnect: false);
      
      _connectionSub = device.connectionState.listen((BluetoothConnectionState state) {
        if (state == BluetoothConnectionState.disconnected) {
           _updateState(DeviceConnectionState.disconnected);
        } else if (state == BluetoothConnectionState.connected) {
           _updateState(DeviceConnectionState.connected);
        }
      });
      
      _updateState(DeviceConnectionState.connected);
      _startListening();
      return true;
    } catch (e) {
      _updateState(DeviceConnectionState.error);
      return false;
    }
  }

  Future<void> _startListening() async {
    // Scaffold: In a real app, discover services, find AQI Characteristic, setNotifyValue(true).
    // Here we simulate an incoming 1-minute interval reading.
    Timer.periodic(const Duration(minutes: 1), (timer) {
       if (_connectionState == DeviceConnectionState.connected) {
           _readingsController.add(AQIReading(
             id: DateTime.now().millisecondsSinceEpoch.toString(),
             deviceId: adapterId,
             timestamp: DateTime.now().toUtc(),
             pm25: 45.0 + (DateTime.now().second % 10), // Simulated mock data
             pm10: 80.0,
             sourceType: 'bluetooth',
           ));
       } else {
         timer.cancel();
       }
    });
  }

  @override
  Future<void> disconnect() async {
    await _characteristicSub?.cancel();
    await _connectionSub?.cancel();
    await device.disconnect();
    _updateState(DeviceConnectionState.disconnected);
  }
}
