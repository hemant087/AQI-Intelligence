import React from 'react';
import { View, Text } from 'react-native';

const MapView = ({ children, style }) => (
  <View style={[{ backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }, style]}>
    <Text>Map View Mock (Native Only)</Text>
  </View>
);

export const Marker = ({ children }) => <View>{children}</View>;
export const PROVIDER_GOOGLE = 'google';
export default MapView;
