import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useAqiData } from '../../src/hooks/useAqiData';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { locationService } from '../../src/services/LocationService';
import { governmentAqiService } from '../../src/services/GovernmentAqiService';
import { getAQILevel } from '../../src/models/AqiReading';
import * as Location from 'expo-location';

export default function DashboardScreen() {
  const { latestReading, aqiScore, aqiInfo, healthRecommendation, connectionState } = useAqiData();
  const [nearestStation, setNearestStation] = useState<any>(null);
  const [liveAddress, setLiveAddress] = useState<string>('Locating...');
  const [userCoords, setUserCoords] = useState<{latitude: number; longitude: number} | null>(null);

  useEffect(() => {
    const initLocation = async () => {
      const hasPerms = await locationService.requestPermissions();
      if (hasPerms) {
        const loc = await locationService.getCurrentPosition();
        if (loc) {
          setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          const addressData = await Location.reverseGeocodeAsync(loc.coords);
          if (addressData && addressData.length > 0) {
            const addr = addressData[0];
            const city = addr.city || addr.district || addr.subregion || 'Unknown City';
            const region = addr.region || addr.country || '';
            setLiveAddress(`${city}, ${region}`.trim());
          } else {
            setLiveAddress('Location found');
          }
        }
      } else {
        setLiveAddress('No GPS access');
      }

      const station = await governmentAqiService.fetchNearestStation();
      if (station) setNearestStation(station);
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
    return `Nearest Monitor : ${dist.toFixed(2)} km`;
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
          <Text style={styles.aqiLabel}>US AQI</Text>
          <Text style={styles.aqiValue}>{aqiScore !== null ? aqiScore : '--'}</Text>
          <View style={[styles.levelBadge, { backgroundColor: aqiInfo.color }]}>
            <Text style={styles.levelText}>{aqiInfo.level}</Text>
          </View>
          <Text style={styles.mainPollutantLabel}>Main Pollutant: PM2.5</Text>
        </View>

        {/* Health Recommendation Card */}
        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <FontAwesome5 name="heartbeat" size={20} color={aqiInfo.color} />
            <Text style={[styles.healthTitle, { color: aqiInfo.color }]}>Health Recommendation</Text>
          </View>
          <Text style={styles.healthBody}>{healthRecommendation}</Text>
        </View>

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
            icon={<FontAwesome5 name="thermometer-half" size={24} color="#555" />}
            label="Temp"
            value="28°C"
          />
          <DetailItem 
            icon={<MaterialCommunityIcons name="water-percent" size={24} color="#555" />}
            label="Humidity"
            value="45%"
          />
        </View>

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
});
