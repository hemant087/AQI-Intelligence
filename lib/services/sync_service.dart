import 'dart:async';
// import 'package:dio/dio.dart';
// import '../models/aqi_reading.dart';
import 'local_storage_service.dart';

class SyncService {
  // final Dio _dio = Dio();
  // final String _apiUrl = "https://api.university.aqi/ingest"; // Mock Endpoint
  Timer? _syncTimer;

  /// Starts a periodic background sync of all pending records
  void startSyncTimer() {
    _syncTimer = Timer.periodic(const Duration(minutes: 5), (timer) {
      syncPendingData();
    });
  }

  void stopSyncTimer() {
    _syncTimer?.cancel();
  }

  /// Manually triggers a sync right now
  Future<void> syncPendingData() async {
    try {
      final pendingReadings = await LocalStorageService.instance.getPendingReadings();
      if (pendingReadings.isEmpty) return;

      // final dataPayload = pendingReadings.map((r) => r.toMap()).toList();

      /* 
      // Real implementation would look like this:
      final response = await _dio.post(
        _apiUrl,
        data: {'readings': dataPayload},
        options: Options(
          headers: {'Authorization': 'Bearer user_session_token'}
        ),
      );
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        for (var reading in pendingReadings) {
          await LocalStorageService.instance.updateSyncStatus(reading.id, 'synced');
        }
      }
      */
      
      // Simulate network request and success for scaffolding purposes
      await Future.delayed(const Duration(seconds: 2));
      for (var reading in pendingReadings) {
        await LocalStorageService.instance.updateSyncStatus(reading.id, 'synced');
      }

    } catch (e) {
      // Fail silently and retry on the next interval
    }
  }
}
