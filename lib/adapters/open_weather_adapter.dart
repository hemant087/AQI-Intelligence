import 'dart:async';
import 'package:uuid/uuid.dart';
import '../models/aqi_reading.dart';
import 'api_adapter.dart';

class OpenWeatherAdapter extends BaseApiAdapter {
  final double lat;
  final double lng;

  OpenWeatherAdapter({
    required super.apiKey,
    required this.lat,
    required this.lng,
  }) : super(
          adapterId: 'owm_${lat.toStringAsFixed(2)}_${lng.toStringAsFixed(2)}',
          adapterName: 'OpenWeather Map',
        );

  @override
  Future<bool> validateApi() async {
    try {
      final response = await dio.get(
          'https://api.openweathermap.org/data/2.5/air_pollution?lat=$lat&lon=$lng&appid=$apiKey');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  @override
  Future<void> fetchLatest() async {
    try {
      final response = await dio.get(
          'https://api.openweathermap.org/data/2.5/air_pollution?lat=$lat&lon=$lng&appid=$apiKey');
      if (response.statusCode == 200) {
        final list = response.data['list'] as List;
        if (list.isNotEmpty) {
          final data = list[0];
          final components = data['components'];

          final reading = AQIReading(
            id: const Uuid().v4(),
            deviceId: adapterId,
            sourceName: 'OpenWeatherMap',
            timestamp: DateTime.fromMillisecondsSinceEpoch(data['dt'] * 1000),
            pm25: (components['pm2_5'] as num).toDouble(),
            pm10: (components['pm10'] as num).toDouble(),
            no2: (components['no2'] as num).toDouble(),
            co: (components['co'] as num).toDouble(),
            so2: (components['so2'] as num).toDouble(),
            o3: (components['o3'] as num).toDouble(),
            nh3: (components['nh3'] as num).toDouble(),
            latitude: lat,
            longitude: lng,
            sourceType: 'api',
          );
          emitReading(reading);
        }
      }
    } catch (e) {
      // Log error
    }
  }
}
