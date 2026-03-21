import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { dataCollectionManager } from '../../src/logic/DataCollectionManager';
import { bleAdapter } from '../../src/logic/BleAdapter';

type Device = any; // Type alias for web safety

export default function DeviceManagerScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<Device[]>([]);

  const startScan = async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);
    
    await dataCollectionManager.startBleScan((device: Device) => {
      setDiscoveredDevices(prev => {
        if (prev.find(d => d.id === device.id)) return prev;
        return [...prev, device];
      });
    });

    // Stop scan after 10 seconds
    setTimeout(() => {
      stopScan();
    }, 10000);
  };

  const stopScan = () => {
    dataCollectionManager.stopBleScan();
    setIsScanning(false);
  };

  const connectToDevice = async (device: Device) => {
    stopScan();
    const success = await bleAdapter.connect(device);
    if (success) {
      alert(`Connected to ${device.name || 'Unknown Device'}`);
    } else {
      alert('Failed to connect');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Manage Devices</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Trackers</Text>
          <View style={styles.deviceCard}>
            <MaterialCommunityIcons name="bluetooth" size={30} color="#00B0FF" />
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>Personal BLE Air Monitor</Text>
              <Text style={styles.deviceStatus}>Connected & Logging</Text>
            </View>
            <TouchableOpacity>
              <MaterialCommunityIcons name="cog" size={24} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.scanSection}>
          <TouchableOpacity 
            style={[styles.scanButton, isScanning && styles.scanButtonDisabled]} 
            onPress={isScanning ? stopScan : startScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="white" />
            ) : (
              <MaterialCommunityIcons name="magnify" size={24} color="white" />
            )}
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Scanning...' : 'Pair New Device'}
            </Text>
          </TouchableOpacity>
        </View>

        {isScanning && (
          <FlatList
            data={discoveredDevices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.scanResultItem} onPress={() => connectToDevice(item)}>
                <MaterialCommunityIcons name="bluetooth-audio" size={20} color="#666" />
                <Text style={styles.scanResultName}>{item.name || 'Unknown Device'}</Text>
                <Text style={styles.scanResultId}>{item.id}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Looking for devices...</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 15,
  },
  deviceCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 15,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceStatus: {
    fontSize: 13,
    color: '#4CAF50',
  },
  scanSection: {
    marginVertical: 20,
  },
  scanButton: {
    backgroundColor: '#00B0FF',
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonDisabled: {
    backgroundColor: '#B3E5FC',
  },
  scanButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  scanResultItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanResultName: {
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  scanResultId: {
    fontSize: 10,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
});
