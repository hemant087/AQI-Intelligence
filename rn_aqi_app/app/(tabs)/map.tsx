import React from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAqiData } from '../../src/hooks/useAqiData';
import { openAqHistoricalService } from '../../src/services/OpenAqHistoricalService';
import { locationService } from '../../src/services/LocationService';

// Conditional imports to avoid web crashes
let MapView: any = View;
let Marker: any = View;
let PROVIDER_GOOGLE: any = 'google';

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

export default function MapScreen() {
  const { aqiInfo } = useAqiData();
  const [nearbyStations, setNearbyStations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchStations = async () => {
      setLoading(true);
      const loc = await locationService.getCurrentPosition();
      if (loc) {
        // Fetch in a 10km-ish box (approx 0.1 degree)
        const lat = loc.coords.latitude;
        const lon = loc.coords.longitude;
        const stations = await openAqHistoricalService.fetchLocationsByBBox(
          lat - 0.05, lon - 0.05, lat + 0.05, lon + 0.05
        );
        setNearbyStations(stations);
      }
      setLoading(false);
    };
    fetchStations();
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, styles.webPlaceholder]}>
        <Text style={styles.overlayTitle}>Map View (Native Only)</Text>
        <Text style={styles.overlaySubtitle}>Use a physical device or emulator to see the live pollution map.</Text>
      </View>
    );
  }

  // Initial region centered on New Delhi
  const initialRegion = {
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // TEMPORARY FIX: Return a placeholder instead of MapView to prevent the 
  // "API Key not found" IllegalStateException hard crash on Android.
  return (
    <View style={[styles.container, styles.webPlaceholder]}>
      <Text style={styles.overlayTitle}>Google Maps Disabled</Text>
      <Text style={[styles.overlaySubtitle, { marginBottom: 20, textAlign: 'center' }]}>
        Waiting for API Key. In the meantime, you can securely view the live open-source map!
      </Text>

      <TouchableOpacity 
        style={styles.waqiButton}
        onPress={() => WebBrowser.openBrowserAsync('https://waqi.info/#/c/28.613/77.209/10z')}
      >
        <Text style={styles.waqiButtonText}>Open Live WAQI Map</Text>
      </TouchableOpacity>
      
      {/* Nearby Stations List */}
      <View style={styles.stationsListContainer}>
        <Text style={styles.listTitle}>Nearby OpenAQ Stations</Text>
        {loading ? (
          <Text style={styles.loadingText}>Searching for stations...</Text>
        ) : nearbyStations.length > 0 ? (
          nearbyStations.slice(0, 15).map((station, index) => (
            <View key={index} style={styles.stationItem}>
              <View style={styles.stationInfo}>
                <Text style={styles.stationNameText} numberOfLines={1}>{station.name}</Text>
                <Text style={styles.stationMetaText}>{station.sensors?.length || 0} Sensors • {station.manufacturer || 'Unknown'}</Text>
              </View>
              <View style={[styles.stationTag, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.stationTagText}>Live</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.loadingText}>No OpenAQ stations found nearby.</Text>
        )}
      </View>
      
      {/* 
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
      >
        <Marker
          coordinate={{ latitude: 28.6139, longitude: 77.2090 }}
          title="CP Station"
          description={`AQI: ${aqiInfo.level}`}
        >
          <View style={[styles.marker, { backgroundColor: aqiInfo.color }]}>
            <Text style={styles.markerText}>42</Text>
          </View>
        </Marker>
      </MapView>
      */}
      
      <View style={[styles.overlay, {top: 150}]}>
        <Text style={styles.overlayTitle}>Live Pollution Map</Text>
        <Text style={styles.overlaySubtitle}>Delhi NCR Region</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 40,
  },
  map: {
    flex: 1,
  },
  marker: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  overlaySubtitle: {
    fontSize: 12,
    color: '#666',
  },
  waqiButton: {
    backgroundColor: '#00B0FF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#00B0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  waqiButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stationsListContainer: {
    width: '100%',
    marginTop: 30,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  loadingText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 10,
  },
  stationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stationInfo: {
    flex: 1,
    marginRight: 10,
  },
  stationNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  stationMetaText: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  stationTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stationTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
