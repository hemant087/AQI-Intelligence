import React from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAqiData } from '../../src/hooks/useAqiData';

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
});
