class AQIReading {
  final String id;
  final String deviceId;
  final String? sourceName; // e.g., "WAQI", "OpenWeather", "My Blue Device"
  final DateTime timestamp;
  final double pm25;
  final double? pm10;
  final double? no2;
  final double? co;
  final double? so2;
  final double? o3;
  final double? nh3;
  final double? temperature;
  final double? humidity;
  final double? latitude;
  final double? longitude;
  final String sourceType; // bluetooth, api, manual
  final String? contextTag; // indoor, outdoor, unknown
  final String syncStatus; // pending, synced, failed

  AQIReading({
    required this.id,
    required this.deviceId,
    this.sourceName,
    required this.timestamp,
    required this.pm25,
    this.pm10,
    this.no2,
    this.co,
    this.so2,
    this.o3,
    this.nh3,
    this.temperature,
    this.humidity,
    this.latitude,
    this.longitude,
    required this.sourceType,
    this.contextTag,
    this.syncStatus = 'pending',
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'device_id': deviceId,
      'source_name': sourceName,
      'timestamp': timestamp.toUtc().toIso8601String(),
      'pm25': pm25,
      'pm10': pm10,
      'no2': no2,
      'co': co,
      'so2': so2,
      'o3': o3,
      'nh3': nh3,
      'temperature': temperature,
      'humidity': humidity,
      'latitude': latitude,
      'longitude': longitude,
      'source_type': sourceType,
      'context_tag': contextTag,
      'sync_status': syncStatus,
    };
  }

  factory AQIReading.fromMap(Map<String, dynamic> map) {
    return AQIReading(
      id: map['id'],
      deviceId: map['device_id'],
      sourceName: map['source_name'],
      timestamp: DateTime.parse(map['timestamp']),
      pm25: (map['pm25'] as num).toDouble(),
      pm10: map['pm10'] != null ? (map['pm10'] as num).toDouble() : null,
      no2: map['no2'] != null ? (map['no2'] as num).toDouble() : null,
      co: map['co'] != null ? (map['co'] as num).toDouble() : null,
      so2: map['so2'] != null ? (map['so2'] as num).toDouble() : null,
      o3: map['o3'] != null ? (map['o3'] as num).toDouble() : null,
      nh3: map['nh3'] != null ? (map['nh3'] as num).toDouble() : null,
      temperature: map['temperature'] != null ? (map['temperature'] as num).toDouble() : null,
      humidity: map['humidity'] != null ? (map['humidity'] as num).toDouble() : null,
      latitude: map['latitude'] != null ? (map['latitude'] as num).toDouble() : null,
      longitude: map['longitude'] != null ? (map['longitude'] as num).toDouble() : null,
      sourceType: map['source_type'],
      contextTag: map['context_tag'],
      syncStatus: map['sync_status'] ?? 'pending',
    );
  }

  AQIReading copyWith({
    String? id,
    String? deviceId,
    String? sourceName,
    DateTime? timestamp,
    double? pm25,
    double? pm10,
    double? no2,
    double? co,
    double? so2,
    double? o3,
    double? nh3,
    double? temperature,
    double? humidity,
    double? latitude,
    double? longitude,
    String? sourceType,
    String? contextTag,
    String? syncStatus,
  }) {
    return AQIReading(
      id: id ?? this.id,
      deviceId: deviceId ?? this.deviceId,
      sourceName: sourceName ?? this.sourceName,
      timestamp: timestamp ?? this.timestamp,
      pm25: pm25 ?? this.pm25,
      pm10: pm10 ?? this.pm10,
      no2: no2 ?? this.no2,
      co: co ?? this.co,
      so2: so2 ?? this.so2,
      o3: o3 ?? this.o3,
      nh3: nh3 ?? this.nh3,
      temperature: temperature ?? this.temperature,
      humidity: humidity ?? this.humidity,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      sourceType: sourceType ?? this.sourceType,
      contextTag: contextTag ?? this.contextTag,
      syncStatus: syncStatus ?? this.syncStatus,
    );
  }
}
