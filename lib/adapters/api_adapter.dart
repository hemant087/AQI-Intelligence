import 'dart:async';
import 'package:dio/dio.dart';
import '../models/aqi_reading.dart';
import 'device_adapter.dart';

abstract class BaseApiAdapter extends DeviceAdapter {
  final String apiKey;
  final Dio dio = Dio();

  DeviceConnectionState _connectionState = DeviceConnectionState.disconnected;
  final _connectionStateController = StreamController<DeviceConnectionState>.broadcast();
  final _readingsController = StreamController<AQIReading>.broadcast();
  Timer? _pollingTimer;

  BaseApiAdapter({
    required super.adapterId,
    required super.adapterName,
    required this.apiKey,
  });

  @override
  DeviceConnectionState get connectionState => _connectionState;

  @override
  Stream<DeviceConnectionState> get connectionStateStream => _connectionStateController.stream;

  @override
  Stream<AQIReading> get readingsStream => _readingsController.stream;

  void updateState(DeviceConnectionState state) {
    _connectionState = state;
    _connectionStateController.add(state);
  }

  void emitReading(AQIReading reading) {
    _readingsController.add(reading);
  }

  @override
  Future<bool> connect() async {
    updateState(DeviceConnectionState.connecting);
    final success = await validateApi();
    if (success) {
      updateState(DeviceConnectionState.connected);
      _startPolling();
      return true;
    } else {
      updateState(DeviceConnectionState.error);
      return false;
    }
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(minutes: 15), (timer) async {
      await fetchLatest();
    });
    // Initial fetch
    fetchLatest();
  }

  Future<bool> validateApi();
  Future<void> fetchLatest();

  @override
  Future<void> disconnect() async {
    _pollingTimer?.cancel();
    updateState(DeviceConnectionState.disconnected);
  }
}
