import 'dart:async';
import 'package:geolocator/geolocator.dart';
import '../models/aqi_reading.dart';
import '../adapters/device_adapter.dart';
import '../services/location_service.dart';
import '../services/local_storage_service.dart';

class DataCollectionManager {
  final LocationService _locationService = LocationService();
  final List<DeviceAdapter> _activeAdapters = [];
  final Map<String, StreamSubscription<AQIReading>> _readingSubscriptions = {};

  final _validatedReadingsController = StreamController<AQIReading>.broadcast();
  Stream<AQIReading> get validatedReadingsStream => _validatedReadingsController.stream;

  void addAdapter(DeviceAdapter adapter) {
    if (!_activeAdapters.contains(adapter)) {
      _activeAdapters.add(adapter);
      _readingSubscriptions[adapter.adapterId] = adapter.readingsStream.listen((reading) {
        _processReading(reading);
      });
      // Optionally auto-connect when added
      adapter.connect();
    }
  }

  void removeAdapter(String adapterId) {
    try {
      final adapter = _activeAdapters.firstWhere((a) => a.adapterId == adapterId);
      adapter.disconnect();
      _readingSubscriptions[adapterId]?.cancel();
      _readingSubscriptions.remove(adapterId);
      _activeAdapters.remove(adapter);
    } catch (e) {
      // Adapter disconnected or removed already
    }
  }

  Future<void> _processReading(AQIReading rawReading) async {
    // 1. Core Validation checks
    if (rawReading.pm25 < 0 || rawReading.pm25 > 2000) {
      // Physically impossible value / dropped
      return;
    }
    if (rawReading.pm10 != null && (rawReading.pm10! < 0 || rawReading.pm10! > 3000)) {
       return;
    }

    // 2. Contextualization (Geo tagging)
    Position? pos = await _locationService.getCurrentPosition(precise: true);
    
    AQIReading enrichedReading = rawReading.copyWith(
       latitude: pos?.latitude,
       longitude: pos?.longitude,
       contextTag: pos != null ? _locationService.determineContextTag(pos) : 'unknown'
    );

    // 3. Storage insertion (triggers pending sync state automatically)
    await LocalStorageService.instance.insertReading(enrichedReading);

    // 4. Expose to UI consumers and map views
    _validatedReadingsController.add(enrichedReading);
  }

  void dispose() {
    for (var sub in _readingSubscriptions.values) {
      sub.cancel();
    }
    for (var adapter in _activeAdapters) {
      adapter.disconnect();
    }
    _validatedReadingsController.close();
  }
}
