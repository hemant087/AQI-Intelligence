import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SectionList, SafeAreaView, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// GovernmentAqiService (WAQI) commented out — using OpenAQ exclusively
// import { governmentAqiService } from '../../src/services/GovernmentAqiService';
import { openAqHistoricalService } from '../../src/services/OpenAqHistoricalService';
import { getAllStations } from '../../src/services/SupabaseService';
import { getAQILevel } from '../../src/models/AqiReading';

// Delhi NCR bounding box
const NCR_BBOX = { minLat: 28.3, minLon: 76.8, maxLat: 28.9, maxLon: 77.5 };

// Normalise an OpenAQ location into a display-friendly shape
function normaliseStation(loc: any, index: number) {
  return {
    uid: loc.id ?? index,
    name: loc.name || 'Unknown Station',
    city: loc.locality || loc.country?.name || 'NCR',
    sensors: loc.sensors?.length ?? 0,
    owner: loc.owners?.[0]?.ownerName ?? loc.providers?.[0]?.name ?? 'OpenAQ',
    latitude: loc.coordinates?.latitude,
    longitude: loc.coordinates?.longitude,
    isMonitor: loc.isMonitor ?? false,
  };
}

export default function StationsScreen() {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [webFallback, setWebFallback] = useState(false);

  const loadStations = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);

    if (Platform.OS === 'web') {
      // Web: OpenAQ blocks CORS from browsers — load all stations from Supabase cloud cache
      // (pipeline stores all NCR stations under city='Delhi NCR')
      setWebFallback(true);
      const all = await getAllStations(200);
      if (all.length > 0) {
        setStations(all.map(s => ({
          uid:     s.uid,
          name:    s.stationName || s.name,
          city:    s.city,
          sensors: s.pollutants ? Object.values(s.pollutants).filter(v => v != null).length : 0,
          owner:   'OpenAQ (cached)',
          pm25:    s.pollutants?.pm25 ?? null,
          aqi:     s.aqi,
        })));
      }
    } else {
      // 📱 Native: fetch live from OpenAQ v3 bbox (no CORS restriction)
      setWebFallback(false);
      const raw = await openAqHistoricalService.fetchLocationsByBBox(
        NCR_BBOX.minLat, NCR_BBOX.minLon, NCR_BBOX.maxLat, NCR_BBOX.maxLon
      );
      const mapped = raw.map(normaliseStation);
      if (mapped.length > 0) setStations(mapped);
    }

    // ── WAQI stations: commented out ─────────────────────────────────────
    // const freshData = await governmentAqiService.fetchAllNcrStations();

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadStations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStations(true);
  };


  const sections = [
    {
      title: 'Delhi Core',
      data: stations.filter(s => s.name.toLowerCase().includes('delhi') || s.city === 'Delhi')
    },
    {
      title: 'NCR Town Stations',
      data: stations.filter(s => !s.name.toLowerCase().includes('delhi') && s.city !== 'Delhi')
    }
  ].filter(section => section.data.length > 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Delhi NCR Monitors</Text>
        <Text style={styles.subtitle}>
          {sections.map(s => `${s.data.length} in ${s.title}`).join(' • ')}
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uid.toString()}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderSectionHeader={({ section: { title } }: { section: { title: string } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
              <View style={styles.sectionLine} />
            </View>
          )}
          renderItem={({ item }: { item: any }) => {
            const hasPm25 = item.pm25 != null && item.pm25 > 0;
            const badgeValue = hasPm25 ? Math.round(item.pm25) : item.sensors;
            const badgeLabel = hasPm25 ? 'PM2.5' : 'SNSR';
            const badgeColor = hasPm25
              ? (item.pm25 < 12 ? '#4CAF50' : item.pm25 < 35 ? '#FFC107' : item.pm25 < 55 ? '#FF9800' : '#F44336')
              : '#00B0FF';
            return (
              <View style={styles.stationCard}>
                <View style={[styles.statusLine, { backgroundColor: badgeColor }]} />
                <View style={styles.cardBody}>
                  <View style={styles.stationMain}>
                    <Text style={styles.stationName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.updateTime}>{item.city} • {item.owner}</Text>
                  </View>
                  <View style={[styles.aqiBadge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.aqiValue}>{badgeValue ?? '—'}</Text>
                    <Text style={styles.aqiLabel}>{badgeLabel}</Text>
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
