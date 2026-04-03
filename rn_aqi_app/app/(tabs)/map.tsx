import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAqiData } from '../../src/hooks/useAqiData';
import { openAqHistoricalService } from '../../src/services/OpenAqHistoricalService';
import { locationService } from '../../src/services/LocationService';
import MapViewer from '../../src/components/MapViewer/MapViewer';

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

    // Auto-refresh every 10 minutes
    const intervalId = setInterval(fetchStations, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <View style={styles.container}>
      {/* We can place our actual map here. The Platform logic is abstracted perfectly now! */}
      <View style={{ height: 350, width: '100%' }}>
        <MapViewer aqiInfo={aqiInfo} />
      </View>

      {/* The rest of the UI continues below */}
      <ScrollView style={{ padding: 15, flex: 1, backgroundColor: '#F5F7FA' }}>
         <TouchableOpacity 
          style={styles.waqiButton}
          onPress={() => WebBrowser.openBrowserAsync('https://waqi.info/#/c/28.613/77.209/10z')}
        >
          <Text style={styles.waqiButtonText}>Open More Details in WAQI Live Map</Text>
        </TouchableOpacity>
        
        {/* Nearby Stations List */}
        <View style={styles.stationsListContainer}>
          <Text style={styles.listTitle}>Nearby OpenAQ Stations</Text>
          {loading ? (
            <Text style={styles.loadingText}>Searching for stations...</Text>
          ) : nearbyStations.length > 0 ? (
            nearbyStations.slice(0, 5).map((station, index) => (
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  waqiButton: {
    backgroundColor: '#00B0FF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
    shadowColor: '#00B0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  waqiButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  stationsListContainer: {
    flex: 1,
    marginTop: 25,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
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
