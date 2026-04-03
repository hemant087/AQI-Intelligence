import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, SafeAreaView, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// GovernmentAqiService (WAQI) commented out — using OpenAQ exclusively
// import { governmentAqiService } from '../../src/services/GovernmentAqiService';
import { openAqHistoricalService } from '../../src/services/OpenAqHistoricalService';
import { getAllStations } from '../../src/services/SupabaseService';
import { getAQILevel } from '../../src/models/AqiReading';

// Delhi NCR bounding box
const NCR_BBOX = { minLat: 28.3, minLon: 76.8, maxLat: 28.9, maxLon: 77.5 };

function normaliseStation(loc: any, index: number) {
  // Attempt to extract live readings from the sensors array
  let extractedPm25 = null;
  let extractedAqi = null;

  if (loc.sensors && Array.isArray(loc.sensors)) {
    const pm25Sensor = loc.sensors.find((s: any) => 
      s.parameter?.name?.toLowerCase() === 'pm25' || 
      s.parameter?.displayName?.toLowerCase() === 'pm2.5' ||
      s.parameter === 'pm25'
    );
    const aqiSensor = loc.sensors.find((s: any) => 
      s.parameter?.name?.toLowerCase() === 'aqi' || 
      s.parameter === 'aqi'
    );

    extractedPm25 = pm25Sensor?.latest?.value ?? pm25Sensor?.value ?? null;
    extractedAqi = aqiSensor?.latest?.value ?? aqiSensor?.value ?? null;
  }

  return {
    uid: loc.id ?? index,
    name: loc.name || 'Unknown Station',
    city: loc.locality || loc.country?.name || 'NCR',
    sensors: loc.sensors?.length ?? 0,
    owner: loc.owners?.[0]?.ownerName ?? loc.providers?.[0]?.name ?? 'OpenAQ',
    latitude: loc.coordinates?.latitude,
    longitude: loc.coordinates?.longitude,
    isMonitor: loc.isMonitor ?? false,
    pm25: extractedPm25,
    aqi: extractedAqi,
  };
}

export default function StationsScreen() {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [webFallback, setWebFallback] = useState(false);

  const loadStations = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);

    try {
      // Unified Data Pipeline for both Web and Native!
      // The Supabase cloud cache holds real-time records updated by our background pipeline
      // which properly computes AQI and solves the OpenAQ v3 CORS/measurement limitations.
      const all = await getAllStations(200);
      
      if (all.length > 0) {
        setStations(all.map(s => ({
          uid:     s.uid,
          name:    s.stationName || s.name,
          city:    s.city,
          sensors: s.pollutants ? Object.values(s.pollutants).filter(v => v != null).length : 0,
          owner:   'OpenAQ Monitor',
          time:    s.time,
          pm25:    s.pollutants?.pm25 ?? null,
          aqi:     s.aqi,
        })));
      }
      setWebFallback(false); // No longer a "fallback", it's the main data source 
    } catch (e) {
      console.error('Failed to load stations', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStations();
    
    // Auto-refresh every 10 minutes
    const intervalId = setInterval(() => {
      loadStations(true);
    }, 10 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStations(true);
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Delhi NCR Monitors</Text>
        <Text style={styles.subtitle}>
          {stations.length} Active Stations
        </Text>
      </View>

      {/* Web CORS info banner */}
      {webFallback && (
        <View style={styles.webBanner}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#1565C0" />
          <Text style={styles.webBannerText}>
            {'  '}Web view: showing cached data from Supabase. Use Expo Go for live stations.
          </Text>
        </View>
      )}

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
          renderItem={({ item }: { item: any }) => {
            const aqiValue = item.aqi != null && item.aqi > 0 ? item.aqi : null;
            const aqiLabel = 'AQI';
            
            // Default grey if no data, else evaluate color based on the computed US AQI
            let badgeColor = '#9E9E9E'; 
            if (aqiValue != null) {
               badgeColor = getAQILevel(aqiValue).color || '#4CAF50';
            }

            const timeLabel = item.time ? new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time';

            return (
              <View style={styles.stationCard}>
                <View style={[styles.statusLine, { backgroundColor: badgeColor }]} />
                <View style={styles.cardBody}>
                  <View style={styles.stationMain}>
                    <Text style={styles.stationName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.updateTime}>UID: {item.uid} • {timeLabel}</Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <View style={[styles.aqiBadge, { backgroundColor: badgeColor, marginRight: 8 }]}>
                      <Text style={styles.aqiValue}>{aqiValue ?? '—'}</Text>
                      <Text style={styles.aqiLabel}>{aqiLabel}</Text>
                    </View>
                    <View style={[styles.aqiBadge, { backgroundColor: '#00B0FF' }]}>
                      <Text style={styles.aqiValue}>{item.sensors ?? 0}</Text>
                      <Text style={styles.aqiLabel}>SNSR</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="cloud-off-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No data available for NCR</Text>
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
  webBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  webBannerText: {
    fontSize: 12,
    color: '#1565C0',
    flexShrink: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: -15,
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
    paddingTop: 8,
  },
  sectionHeader: {
    backgroundColor: '#F5F7FA',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00B0FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#00B0FF',
    opacity: 0.2,
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
