import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/aqi_reading.dart';
import '../logic/data_collection_manager.dart';

final dataCollectionProvider = Provider<DataCollectionManager>((ref) {
  final manager = DataCollectionManager();
  ref.onDispose(() => manager.dispose());
  return manager;
});

final latestReadingProvider = StreamProvider<AQIReading>((ref) {
  final manager = ref.watch(dataCollectionProvider);
  return manager.validatedReadingsStream;
});

/// A synthesized overview state to supply the Dashboard widgets
/// A synthesized overview state to supply the Dashboard widgets
final aqiSummaryProvider = Provider<Map<String, dynamic>>((ref) {
  final latestAsync = ref.watch(latestReadingProvider);
  
  if (latestAsync is AsyncData<AQIReading>) {
     final latest = latestAsync.value;
     
     // Basic US AQI mapping approximations
     String level = 'Good';
     if (latest.pm25 > 35.4) level = 'Moderate';
     if (latest.pm25 > 55.4) level = 'Unhealthy (Sens.)';
     if (latest.pm25 > 150.4) level = 'Unhealthy';
     if (latest.pm25 > 250.4) level = 'Hazardous';

     return {
       'current_pm25': latest.pm25.toStringAsFixed(1),
       'level': level,
       'temperature': latest.temperature != null ? '${latest.temperature!.round()}°' : '--°',
       'humidity': latest.humidity != null ? '${latest.humidity!.round()}%' : '--%',
       'source_name': latest.sourceName ?? 'Unknown Sensor',
       'lat': latest.latitude,
       'lng': latest.longitude,
     };
  }

  // Fallback state before devices connect
  return {
    'current_pm25': '--',
    'level': 'Connecting...',
    'temperature': '--°',
    'humidity': '--%',
    'source_name': 'Searching...',
    'lat': null,
    'lng': null,
  };
});

