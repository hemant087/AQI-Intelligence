import * as Location from 'expo-location';

export class LocationService {
  async requestPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async getCurrentPosition(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;
      
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (e) {
      console.error('Failed to get position', e);
      return null;
    }
  }

  determineContextTag(location: Location.LocationObject): string {
    // Basic heuristic: check speed, accuracy, and altitude
    // For now, simpler implementation:
    // This could also check indoor geofencing etc.
    return 'outdoor'; 
  }
}

export const locationService = new LocationService();
