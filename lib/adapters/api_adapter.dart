import 'dart:async';
import 'package:dio/dio.dart';
import '../models/aqi_reading.dart';
import 'device_adapter.dart';

class ApiAdapter extends DeviceAdapter {
  final String deviceToken;
  final String endpointUrl;
  final Dio _dio = Dio();
  
  DeviceConnectionState _connectionState = DeviceConnectionState.disconnected;
  final _connectionStateController = StreamController<DeviceConnectionState>.broadcast();
  final _readingsController = StreamController<AQIReading>.broadcast();
  Timer? _pollingTimer;

  ApiAdapter({
    required String adapterId,
    required String adapterName,
    required this.deviceToken,
    required this.endpointUrl,
  }) : super(adapterId: adapterId, adapterName: adapterName);

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
    _updateState(DeviceConnectionState.connecting);
    try {
      // Simulate validation request
      final response = await _dio.get('$endpointUrl/ping', options: Options(
        headers: {'Authorization': 'Bearer $deviceToken'}
      ));
      if (response.statusCode == 200) {
        _updateState(DeviceConnectionState.connected);
        _startPolling();
        return true;
      } else {
        _updateState(DeviceConnectionState.error);
        return false;
      }
    } catch (e) {
      // Fallback for demo: assume failure but allow scaffolding progress
      _updateState(DeviceConnectionState.error);
      return false;
    }
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(minutes: 5), (timer) async {
       try {
         final response = await _dio.get('$endpointUrl/latest', options: Options(
           headers: {'Authorization': 'Bearer $deviceToken'}
         ));
         if (response.data != null) {
           _readingsController.add(AQIReading.fromMap(response.data));
         }
       } catch (e) {
         // Handle or log polling error quietly
       }
    });
  }

  @override
  Future<void> disconnect() async {
    _pollingTimer?.cancel();
    _updateState(DeviceConnectionState.disconnected);
  }
}
