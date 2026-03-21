import 'dart:async';
import 'dart:math';
import 'package:uuid/uuid.dart';
import '../models/aqi_reading.dart';
import 'device_adapter.dart';

class DemoSimulatorAdapter extends DeviceAdapter {
  DeviceConnectionState _connectionState = DeviceConnectionState.disconnected;
  final _connectionStateController = StreamController<DeviceConnectionState>.broadcast();
  final _readingsController = StreamController<AQIReading>.broadcast();
  Timer? _timer;
  final Random _random = Random();

  double _basePm25 = 45.0;
  double _baseTemp = 25.0;

  DemoSimulatorAdapter() : super(
    adapterId: 'demo_sim_01',
    adapterName: 'Live Demo Simulator',
  );

  @override
  DeviceConnectionState get connectionState => _connectionState;

  @override
  Stream<DeviceConnectionState> get connectionStateStream => _connectionStateController.stream;

  @override
  Stream<AQIReading> get readingsStream => _readingsController.stream;

  @override
  Future<bool> connect() async {
    _connectionState = DeviceConnectionState.connected;
    _connectionStateController.add(_connectionState);
    
    // Emit a reading every 3 seconds to make the UI look highly dynamic
    _timer = Timer.periodic(const Duration(seconds: 3), (timer) {
      // Fluctuate values slightly
      _basePm25 += (_random.nextDouble() * 4) - 2; // +/- 2
      _baseTemp += (_random.nextDouble() * 1) - 0.5; // +/- 0.5
      
      if (_basePm25 < 0) _basePm25 = 5.0;
      
      final reading = AQIReading(
        id: const Uuid().v4(),
        deviceId: adapterId,
        sourceName: 'Real-Time Simulator',
        timestamp: DateTime.now(),
        pm25: _basePm25,
        temperature: _baseTemp,
        humidity: 50.0 + (_random.nextDouble() * 10 - 5),
        latitude: 28.6139 + (_random.nextDouble() * 0.01 - 0.005), // slightly moving
        longitude: 77.2090 + (_random.nextDouble() * 0.01 - 0.005),
        sourceType: 'simulator',
      );
      
      _readingsController.add(reading);
    });
    
    return true;
  }

  @override
  Future<void> disconnect() async {
    _timer?.cancel();
    _connectionState = DeviceConnectionState.disconnected;
    _connectionStateController.add(_connectionState);
  }
}
