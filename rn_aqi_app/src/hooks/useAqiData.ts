import { useState, useEffect } from 'react';
import { AQIReading, getAQILevel, AQILevel, getHealthRecommendation } from '../models/AqiReading';
import { dataCollectionManager } from '../logic/DataCollectionManager';
import { bleAdapter, DeviceConnectionState } from '../logic/BleAdapter';

export const useAqiData = () => {
  const [latestReading, setLatestReading] = useState<AQIReading | null>(null);
  const [connectionState, setConnectionState] = useState<DeviceConnectionState>(DeviceConnectionState.DISCONNECTED);

  useEffect(() => {
    const readingSub = dataCollectionManager.latestReading$.subscribe(setLatestReading);
    const connectionSub = bleAdapter.connectionState$.subscribe(setConnectionState);

    return () => {
      readingSub.unsubscribe();
      connectionSub.unsubscribe();
    };
  }, []);

  const aqiInfo = latestReading 
    ? getAQILevel(latestReading.pm25)
    : { level: 'Connecting...' as AQILevel, color: '#9E9E9E' };

  const healthRecommendation = getHealthRecommendation(aqiInfo.level);

  return {
    latestReading,
    connectionState,
    aqiInfo,
    healthRecommendation,
  };
};
