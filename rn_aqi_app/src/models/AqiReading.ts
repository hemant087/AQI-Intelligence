export type SourceType = 'bluetooth' | 'api' | 'manual';

export interface AQIReading {
  id: string;
  deviceId: string;
  timestamp: string; // ISO-8601
  pm25: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  so2?: number;
  co?: number;
  sourceType: SourceType;
  latitude?: number;
  longitude?: number;
  contextTag?: string; // 'indoor' | 'outdoor' | 'unknown'
  stationMetadata?: {
    manufacturer?: string;
    model?: string;
    owner?: string;
  };
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

/**
 * Calculates the exact US AQI score (0-500) from a raw PM2.5 concentration (µg/m³).
 * Uses the standard US EPA linear interpolation formula.
 */
export const calculateAQI = (pm25: number): number => {
  if (pm25 < 0) return 0;
  if (pm25 <= 12.0) return Math.round(((50 - 0) / (12.0 - 0.0)) * (pm25 - 0.0) + 0);
  if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51);
  if (pm25 <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101);
  if (pm25 <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151);
  if (pm25 <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201);
  if (pm25 <= 350.4) return Math.round(((400 - 301) / (350.4 - 250.5)) * (pm25 - 250.5) + 301);
  if (pm25 <= 500.4) return Math.round(((500 - 401) / (500.4 - 350.5)) * (pm25 - 350.5) + 401);
  return 500;
};
