import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icons not showing up in React environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapViewer({ aqiInfo }: { aqiInfo: any }) {
  const position: [number, number] = [28.6139, 77.2090];
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <View style={styles.mapContainer}>
      <MapContainer 
        center={position} 
        zoom={11} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong style={{ fontSize: '16px' }}>CP Station</strong><br/>
              <span style={{ color: aqiInfo?.color || 'black', fontWeight: 'bold' }}>
                AQI: {aqiInfo?.value || '--'}
              </span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
  }
});
