import { useState, useEffect } from 'react';
import { AQIReading, getAQILevel, AQILevel, getHealthRecommendation, calculateAQI } from '../models/AqiReading';
import { dataCollectionManager } from '../logic/DataCollectionManager';
import { bleAdapter } from '../logic/BleAdapter';
import { DeviceConnectionState } from '../logic/IAqiAdapter';

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

  const aqiScore = latestReading ? calculateAQI(latestReading.pm25) : null;

  const healthRecommendation = getHealthRecommendation(aqiInfo.level);

  return {
    latestReading,
    connectionState,
    aqiScore,
    aqiInfo,
    healthRecommendation,
  };
};
