import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { governmentAqiService } from '../../src/services/GovernmentAqiService';
import { localStorageService } from '../../src/services/LocalStorageService';
import { GovernmentStation } from '../../src/models/GovernmentStation';
import { getAQILevel } from '../../src/models/AqiReading';

const CITIES = ['Delhi', 'Noida', 'Gurgaon'];

export default function StationsScreen() {
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [stations, setStations] = useState<GovernmentStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStations = async (city: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    // First load from local DB
    const cached = await localStorageService.getStationsByCity(city);
    if (cached.length > 0 && !isRefresh) {
      setStations(cached);
    }

    // Then fetch from API
    const freshData = await governmentAqiService.fetchStationsByCity(city);
    if (freshData.length > 0) {
      setStations(freshData);
      // Cache the results
      for (const s of freshData) {
        await localStorageService.insertGovernmentStation(s);
      }
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadStations(selectedCity);
  }, [selectedCity]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStations(selectedCity, true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Official Monitors</Text>
        <View style={styles.cityPicker}>
          {CITIES.map(city => (
            <TouchableOpacity 
              key={city} 
              onPress={() => setSelectedCity(city)}
              style={[styles.cityButton, selectedCity === city && styles.activeCityButton]}
            >
              <Text style={[styles.cityButtonText, selectedCity === city && styles.activeCityText]}>{city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && stations.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00B0FF" />
        </View>
      ) : (
        <FlatList
          data={stations}
          keyExtractor={(item) => item.uid.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const levelInfo = getAQILevel(item.aqi);
            return (
              <View style={styles.stationCard}>
                <View style={[styles.statusLine, { backgroundColor: levelInfo.color }]} />
                <View style={styles.cardBody}>
                  <View style={styles.stationMain}>
                    <Text style={styles.stationName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.updateTime}>Last updated: {item.time}</Text>
                  </View>
                  <View style={[styles.aqiBadge, { backgroundColor: levelInfo.color }]}>
                    <Text style={styles.aqiValue}>{item.aqi}</Text>
                    <Text style={styles.aqiLabel}>AQI</Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="cloud-off-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No data available for {selectedCity}</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  cityPicker: {
    flexDirection: 'row',
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    padding: 4,
  },
  cityButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeCityButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeCityText: {
    color: '#00B0FF',
  },
  listContent: {
    padding: 16,
  },
  stationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusLine: {
    width: 6,
  },
  cardBody: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationMain: {
    flex: 1,
    marginRight: 10,
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  updateTime: {
    fontSize: 12,
    color: '#999',
  },
  aqiBadge: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aqiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  aqiLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    marginTop: 10,
    color: '#999',
    fontSize: 16,
  },
});
