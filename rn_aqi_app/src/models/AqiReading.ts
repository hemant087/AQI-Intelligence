export type SourceType = 'bluetooth' | 'api' | 'manual';

export interface AQIReading {
  id: string;
  deviceId: string;
  timestamp: string; // ISO-8601
  pm25: number;
  pm10?: number;
  sourceType: SourceType;
  latitude?: number;
  longitude?: number;
  contextTag?: string; // 'indoor' | 'outdoor' | 'unknown'
}

export type AQILevel = 'Good' | 'Moderate' | 'Unhealthy (Sens.)' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous' | 'Connecting...';

export const getAQILevel = (pm25: number): { level: AQILevel; color: string } => {
  if (pm25 === -1) return { level: 'Connecting...', color: '#9E9E9E' };
  if (pm25 <= 12.0) return { level: 'Good', color: '#4CAF50' };
  if (pm25 <= 35.4) return { level: 'Moderate', color: '#FFEB3B' };
  if (pm25 <= 55.4) return { level: 'Unhealthy (Sens.)', color: '#FF9800' };
  if (pm25 <= 150.4) return { level: 'Unhealthy', color: '#F44336' };
  if (pm25 <= 250.4) return { level: 'Very Unhealthy', color: '#9C27B0' };
  return { level: 'Hazardous', color: '#7E0023' };
};

export const getHealthRecommendation = (level: AQILevel): string => {
  switch (level) {
    case 'Good':
      return 'Air quality is satisfactory, and air pollution poses little or no risk.';
    case 'Moderate':
      return 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.';
    case 'Unhealthy (Sens.)':
      return 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.';
    case 'Unhealthy':
      return 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.';
    case 'Very Unhealthy':
      return 'Health alert: The risk of health effects is increased for everyone.';
    case 'Hazardous':
      return 'Health warning of emergency conditions: everyone is more likely to be affected.';
    default:
      return 'Retrieving real-time data...';
  }
};
