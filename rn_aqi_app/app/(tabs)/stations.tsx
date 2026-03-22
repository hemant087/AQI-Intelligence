import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SectionList, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { governmentAqiService } from '../../src/services/GovernmentAqiService';
import { localStorageService } from '../../src/services/LocalStorageService';
import { GovernmentStation } from '../../src/models/GovernmentStation';
import { getAQILevel } from '../../src/models/AqiReading';

export default function StationsScreen() {
  const [stations, setStations] = useState<GovernmentStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStations = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    // First load from local DB
    const cached = await localStorageService.getStationsByCity('NCR'); // Use generic 'NCR' tag
    if (cached.length > 0 && !isRefresh) {
      setStations(cached);
    }

    // Then fetch from API across ALL NCR
    const freshData = await governmentAqiService.fetchAllNcrStations();
    if (freshData.length > 0) {
      setStations(freshData);
      // Cache the results
      for (const s of freshData) {
        await localStorageService.insertGovernmentStation({ ...s, city: 'NCR' });
      }
    }
    
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
          renderItem={({ item }: { item: GovernmentStation }) => {
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
