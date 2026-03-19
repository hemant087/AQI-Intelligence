import 'package:geolocator/geolocator.dart';

class LocationService {
  Future<Position?> getCurrentPosition({bool precise = true}) async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return null;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      // Permissions are denied forever, handle appropriately. 
      return null;
    }

    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: precise ? LocationAccuracy.high : LocationAccuracy.low,
      );
    } catch (e) {
      // Fallback to last known position if current is unavailable
      return await Geolocator.getLastKnownPosition();
    }
  }

  /// Determines context based on horizontal accuracy.
  /// If GPS accuracy is poor (e.g. > 50 meters), we assume indoor environment.
  String determineContextTag(Position position) {
    if (position.accuracy > 50) return 'indoor';
    return 'outdoor';
  }
}
