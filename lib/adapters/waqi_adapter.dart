import 'dart:async';
import 'package:uuid/uuid.dart';
import '../models/aqi_reading.dart';
import 'api_adapter.dart';

class WaqiAdapter extends BaseApiAdapter {
  final double lat;
  final double lng;

  WaqiAdapter({
    required super.apiKey,
    required this.lat,
    required this.lng,
  }) : super(
          adapterId: 'waqi_${lat.toStringAsFixed(2)}_${lng.toStringAsFixed(2)}',
          adapterName: 'WAQI Station',
        );

  @override
  Future<bool> validateApi() async {
    try {
      final response = await dio.get('https://api.waqi.info/feed/geo:$lat;$lng/?token=$apiKey');
      return response.data['status'] == 'ok';
    } catch (e) {
      return false;
    }
  }

  @override
  Future<void> fetchLatest() async {
    try {
      final response = await dio.get('https://api.waqi.info/feed/geo:$lat;$lng/?token=$apiKey');
      if (response.data['status'] == 'ok') {
        final data = response.data['data'];
        final iaqi = data['iaqi'];
        
        final reading = AQIReading(
          id: const Uuid().v4(),
          deviceId: adapterId,
          sourceName: 'WAQI: ${data['city']['name']}',
          timestamp: DateTime.now(),
          pm25: (iaqi['pm25']?['v'] as num?)?.toDouble() ?? 0.0,
          pm10: (iaqi['pm10']?['v'] as num?)?.toDouble(),
          no2: (iaqi['no2']?['v'] as num?)?.toDouble(),
          co: (iaqi['co']?['v'] as num?)?.toDouble(),
          so2: (iaqi['so2']?['v'] as num?)?.toDouble(),
          o3: (iaqi['o3']?['v'] as num?)?.toDouble(),
          temperature: (iaqi['t']?['v'] as num?)?.toDouble(),
          humidity: (iaqi['h']?['v'] as num?)?.toDouble(),
          latitude: (data['city']['geo'][0] as num).toDouble(),
          longitude: (data['city']['geo'][1] as num).toDouble(),
          sourceType: 'api',
        );
        emitReading(reading);
      }
    } catch (e) {
      // Log error
    }
  }
}
