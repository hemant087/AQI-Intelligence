import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, SafeAreaView, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { useAqiData } from '../../src/hooks/useAqiData';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { locationService } from '../../src/services/LocationService';
import { governmentAqiService } from '../../src/services/GovernmentAqiService';
import { getAQILevel } from '../../src/models/AqiReading';
import * as Location from 'expo-location';
import { AqiTrendChart } from '../../components/AqiTrendChart';
import { openAqHistoricalService, HistoricalDataPoint } from '../../src/services/OpenAqHistoricalService';

import { supabaseService } from '../../src/services/SupabaseService';

export default function DashboardScreen() {
  const { latestReading, aqiScore, aqiInfo, healthRecommendation, connectionState } = useAqiData();
  const [nearestStation, setNearestStation] = useState<any>(null);
  const [liveAddress, setLiveAddress] = useState<string>('Locating...');
  const [userCoords, setUserCoords] = useState<{latitude: number; longitude: number} | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);

  useEffect(() => {
    if (latestReading?.deviceId && latestReading.sourceType === 'api') {
      // For official stations, we use the deviceId as locationId
      openAqHistoricalService.fetchHourlyTrends(latestReading.deviceId)
        .then(setHistoricalData);
    }
  }, [latestReading?.deviceId]);

  useEffect(() => {
    const initLocation = async () => {
      const hasPerms = await locationService.requestPermissions();
      if (hasPerms) {
        const loc = await locationService.getCurrentPosition();
        if (loc) {
          const userLat = loc.coords.latitude;
          const userLon = loc.coords.longitude;
          setUserCoords({ latitude: userLat, longitude: userLon });
          
          // Reverse geocode to get city
          Location.reverseGeocodeAsync(loc.coords).then(addr => {
            if (addr?.[0]) {
              const region = addr[0].district || addr[0].city || addr[0].subregion || 'Delhi';
              setLiveAddress(`${addr[0].name || ''} ${addr[0].street || ''}, ${region}`);
            }
          });

          // Fetch Nearest Station from Cloud (Supabase) or OpenAQ (Native)
          if (Platform.OS === 'web') {
             const near = await supabaseService.findNearestStation(userLat, userLon);
             if (near) setNearestStation(near);
          } else {
             const allStations = await openAqHistoricalService.fetchLocationsByBBox(
               userLat - 0.1, userLon - 0.1, userLat + 0.1, userLon + 0.1
             );
             if (allStations && allStations.length > 0) {
               // Sort by distance
               const sorted = allStations.sort((a: any, b: any) => {
                 const dA = locationService.calculateDistance(userLat, userLon, a.coordinates.latitude, a.coordinates.longitude);
                 const dB = locationService.calculateDistance(userLat, userLon, b.coordinates.latitude, b.coordinates.longitude);
                 return dA - dB;
               });
               const best = sorted[0];
               setNearestStation({
                 uid: best.id,
                 name: best.name,
                 aqi: best.sensors?.[0]?.latest?.value || 0,
                 latitude: best.coordinates.latitude,
                 longitude: best.coordinates.longitude,
               });
             }
          }
        }
      }
    };
    initLocation();
  }, []);

  const getDistanceText = () => {
    if (!userCoords || !nearestStation?.latitude || !nearestStation?.longitude) return '';
    const dist = locationService.calculateDistance(
      userCoords.latitude, 
      userCoords.longitude, 
      nearestStation.latitude, 
      nearestStation.longitude
    );
    return `Monitor Dist: ${dist.toFixed(2)} km`;
  };

  const getLightColor = (color: string) => `${color}20`; // 12% opacity hex

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: aqiInfo.color }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Info */}
      <View style={styles.header}>
        <View>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker-radius" size={20} color="white" />
            <Text style={styles.locationTitle}>New Delhi, India</Text>
          </View>
          <Text style={styles.lastUpdated}>Updated: {latestReading ? new Date(latestReading.timestamp).toLocaleTimeString() : 'Connecting...'}</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton}>
          <MaterialCommunityIcons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main AQI Card */}
        <View style={styles.mainCard}>
          <Text style={styles.aqiLabel}>
            {latestReading?.sourceType === 'bluetooth' ? 'PERSONAL DEVICE AQI' : 'NEARBY MONITORING STATION'}
          </Text>
          <Text style={styles.aqiValue}>{aqiScore !== null ? aqiScore : '--'}</Text>
          <View style={[styles.levelBadge, { backgroundColor: aqiInfo.color }]}>
            <Text style={styles.levelText}>{aqiInfo.level}</Text>
          </View>
          <Text style={styles.mainPollutantLabel}>
            Main Pollutant: PM2.5 {latestReading?.sourceType === 'api' ? `(${latestReading.stationMetadata?.owner || 'OpenAQ'})` : ''}
          </Text>
        </View>

        {/* Health Recommendation Card */}
        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <FontAwesome5 name="heartbeat" size={20} color={aqiInfo.color} />
            <Text style={[styles.healthTitle, { color: aqiInfo.color }]}>Health Recommendation</Text>
          </View>
          <Text style={styles.healthBody}>{healthRecommendation}</Text>
        </View>

        {/* 24H Trend Chart */}
        <AqiTrendChart data={historicalData} color={aqiInfo.color} />

        {/* Split Cards: Live Location & Nearest Station */}
        <View style={styles.splitCardsRow}>
          
          {/* Live Location Card (Left) */}
          <View style={[styles.secondaryCard, styles.splitCard]}>
            <View style={styles.secondaryHeader}>
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#00B0FF" />
              <Text style={styles.secondaryTitle}>Live Address</Text>
            </View>
            <View style={styles.secondaryBodyColumn}>
              <Text style={styles.stationName} numberOfLines={2}>{liveAddress}</Text>
              <Text style={styles.stationTime}>{getDistanceText() || 'GPS Active'}</Text>
            </View>
          </View>

          {/* Nearest Official Station Card (Right) */}
          {nearestStation && (
            <View style={[styles.secondaryCard, styles.splitCard]}>
              <View style={styles.secondaryHeader}>
                <MaterialCommunityIcons name="office-building" size={18} color="#666" />
                <Text style={styles.secondaryTitle}>Official Monitor</Text>
              </View>
              <View style={[styles.secondaryBody, {marginTop: 4}]}>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={[styles.stationName, {fontSize: 13}]} numberOfLines={2}>{nearestStation.name}</Text>
                </View>
                <View style={[styles.stationAqi, { backgroundColor: getAQILevel(nearestStation.aqi).color }]}>
                  <Text style={styles.stationAqiValue}>{nearestStation.aqi}</Text>
                </View>
              </View>
            </View>
          )}

        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <DetailItem 
            icon={<MaterialCommunityIcons name="blur" size={24} color="#555" />}
            label="PM2.5"
            value={latestReading ? `${latestReading.pm25.toFixed(1)} µg/m³` : '--'}
          />
          <DetailItem 
            icon={<MaterialCommunityIcons name="molecule" size={24} color="#555" />}
            label="PM10"
            value={latestReading?.pm10 ? `${latestReading.pm10.toFixed(1)} µg/m³` : '--'}
          />
          <DetailItem 
            icon={<MaterialCommunityIcons name="weather-hazy" size={24} color="#555" />}
            label="O3"
            value={latestReading?.o3 ? `${latestReading.o3.toFixed(2)} ppm` : '--'}
          />
          <DetailItem 
            icon={<MaterialCommunityIcons name="blur-linear" size={24} color="#555" />}
            label="NO2"
            value={latestReading?.no2 ? `${latestReading.no2.toFixed(3)} ppm` : '--'}
          />
          <DetailItem 
            icon={<MaterialCommunityIcons name="blur-radial" size={24} color="#555" />}
            label="SO2"
            value={latestReading?.so2 ? `${latestReading.so2.toFixed(3)} ppm` : '--'}
          />
          <DetailItem 
            icon={<MaterialCommunityIcons name="car-back" size={24} color="#555" />}
            label="CO"
            value={latestReading?.co ? `${latestReading.co.toFixed(2)} ppm` : '--'}
          />
        </View>

        {/* Station Metadata Card */}
        {latestReading?.stationMetadata && (
          <View style={styles.metadataCard}>
            <View style={styles.metadataHeader}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#666" />
              <Text style={styles.metadataTitle}>Station Information</Text>
            </View>
            <View style={styles.metadataContent}>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Manufacturer:</Text>
                <Text style={styles.metadataValue}>{latestReading.stationMetadata.manufacturer || 'Unknown'}</Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Model:</Text>
                <Text style={styles.metadataValue}>{latestReading.stationMetadata.model || 'Unknown'}</Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Provider:</Text>
                <Text style={styles.metadataValue}>{latestReading.stationMetadata.owner || 'OpenAQ'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Connection Status */}
        <View style={styles.statusFooter}>
          <View style={[styles.statusDot, { backgroundColor: connectionState === 'connected' ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>
            Monitor: {connectionState === 'connected' ? 'Connected' : 'Scanner ready'}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function DetailItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <View style={styles.detailItem}>
      {icon}
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  lastUpdated: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  refreshButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  scrollContent: {
    padding: 20,
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flexGrow: 1,
    marginTop: 10,
  },
  mainCard: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  aqiLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  aqiValue: {
    fontSize: 100,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 110,
  },
  levelBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  levelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  mainPollutantLabel: {
    color: '#888',
    fontSize: 14,
  },
  healthCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  healthBody: {
    color: '#444',
    lineHeight: 22,
    fontSize: 15,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  detailText: {
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  splitCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginBottom: 20,
  },
  secondaryCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  splitCard: {
    width: '48%',
  },
  secondaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  secondaryBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryBodyColumn: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginTop: 8,
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    maxWidth: 200,
  },
  stationTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  stationAqi: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationAqiValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  metadataCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  metadataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  metadataTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  metadataContent: {
    flexDirection: 'column',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metadataLabel: {
    fontSize: 13,
    color: '#888',
  },
  metadataValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
});
