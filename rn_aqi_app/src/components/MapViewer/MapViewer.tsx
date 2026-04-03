import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function MapViewer({ aqiInfo }: { aqiInfo: any }) {
  const initialRegion = {
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // Google Maps on Android strictly requires an API key in app.json and will hard crash without it.
  // Apple Maps on iOS does NOT require an API key and works immediately.
  if (Platform.OS === 'android') {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderTitle}>Google Maps Disabled (Android)</Text>
        <Text style={styles.placeholderText}>
          A Google Maps API key is required to render maps on Android. In the meantime, you can view the fully interactive map on Web or iOS!
        </Text>
      </View>
    );
  }

  // Renders standard MapView on all native platforms direct mapping.

  return (
    <MapView
      style={styles.map}
      initialRegion={initialRegion}
    >
      <Marker
        coordinate={{ latitude: 28.6139, longitude: 77.2090 }}
        title="CP Station"
        description={`AQI: ${aqiInfo?.level || 'Unknown'}`}
      >
        <View style={[styles.marker, { backgroundColor: aqiInfo?.color || 'gray' }]}>
          <Text style={styles.markerText}>{aqiInfo?.value || '--'}</Text>
        </View>
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  placeholderContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D9E2EC',
    borderStyle: 'dashed',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334E68',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 13,
    color: '#627D98',
    textAlign: 'center',
    lineHeight: 20,
  }
});
