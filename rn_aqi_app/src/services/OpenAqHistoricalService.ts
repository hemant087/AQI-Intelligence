import { AQIReading } from '../models/AqiReading';

export interface HistoricalDataPoint {
  timestamp: string;
  value: number;
}

export class OpenAqHistoricalService {
  private OPENAQ_KEY = process.env.EXPO_PUBLIC_OPENAQ_API_KEY;
  private OPENAQ_BASE = 'https://api.openaq.org/v3';

  /**
   * Fetch hourly averages for a specific location and parameter
   */
  async fetchHourlyTrends(locationId: string, parameterName: string = 'pm25'): Promise<HistoricalDataPoint[]> {
    try {
      // 1. Get the location details to find the sensor ID for the parameter
      // This fetch might fail on web due to CORS
      const locRes = await fetch(`${this.OPENAQ_BASE}/locations/${locationId}`, {
        headers: { 'X-API-Key': this.OPENAQ_KEY || '' }
      });
      
      if (!locRes.ok) return [];
      const locData = await locRes.json();
      
      const sensor = locData.results[0]?.sensors?.find((s: any) => s.parameter.name === parameterName);
      if (!sensor) return [];
      
      const sensorId = sensor.id;

      // 2. Get hourly measurements for the last 24 hours
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const measurementsRes = await fetch(
        `${this.OPENAQ_BASE}/sensors/${sensorId}/measurements/hourly?date_from=${yesterday.toISOString()}&limit=24`,
        { headers: { 'X-API-Key': this.OPENAQ_KEY || '' } }
      );

      if (!measurementsRes.ok) return [];
      const data = await measurementsRes.json();

      return data.results.map((r: any) => ({
        timestamp: r.period.datetimeFrom.datetime,
        value: r.value
      })).reverse(); // Oldest to newest
    } catch (e) {
      if (require('react-native').Platform.OS === 'web') {
        console.warn('OpenAQ Historical fetch failed (CORS), using mock trends for web');
        return Array.from({ length: 24 }).map((_, i) => ({
          timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
          value: 30 + Math.random() * 40
        }));
      }
      console.error('Failed to fetch historical trends', e);
      return [];
    }
  }

  async fetchLocationsByBBox(minLat: number, minLon: number, maxLat: number, maxLon: number): Promise<any[]> {
    try {
      const res = await fetch(
        `${this.OPENAQ_BASE}/locations?bbox=${minLon},${minLat},${maxLon},${maxLat}&limit=100`,
        { headers: { 'X-API-Key': this.OPENAQ_KEY || '' } }
      );
      
      if (!res.ok) return [];
      const data = await res.json();
      return data.results;
    } catch (e) {
      console.error('Failed to fetch locations in bbox', e);
      return [];
    }
  }
}

export const openAqHistoricalService = new OpenAqHistoricalService();
