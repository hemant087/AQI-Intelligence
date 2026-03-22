import { Platform } from 'react-native';
import { GovernmentStation } from '../models/GovernmentStation';

// Public token for AQICN (World Air Quality Index Project)
const API_TOKEN = process.env.EXPO_PUBLIC_WAQI_TOKEN;
const BASE_URL = 'https://api.waqi.info';

const NCR_STATION_IDS: Record<string, number[]> = {
  'Delhi': [8677, 8678, 1453, 1454, 3031, 3032, 3033, 8679, 8680, 8681, 1455, 1456, 1457, 1458, 1459, 1460], // Expanded list
  'Noida': [8181, 8180], // Sector 62, Sector 125
  'Gurgaon': [8182, 10832], // Vikas Sadan, Sector 51
};

const NCR_CITIES = ['Delhi', 'Noida', 'Gurgaon', 'Ghaziabad', 'Faridabad', 'Greater Noida'];

export class GovernmentAqiService {
  /**
   * Fetch ALL stations across the entire Delhi NCR region
   */
  async fetchAllNcrStations(): Promise<GovernmentStation[]> {
    try {
      const results = await Promise.all(
        NCR_CITIES.map(city => this.fetchStationsByCity(city))
      );
      // Flatten and remove duplicates by UID
      const flat = results.flat();
      const unique = Array.from(new Map(flat.map(s => [s.uid, s])).values());
      return unique;
    } catch (e) {
      console.error('Failed to fetch consolidated NCR stations', e);
      return [];
    }
  }

  /**
   * Fetch stations for a given city
   */
  async fetchStationsByCity(city: string): Promise<GovernmentStation[]> {
    try {
      const query = `${city}, India`;
      const response = await fetch(`${BASE_URL}/search/?token=${API_TOKEN}&keyword=${encodeURIComponent(query)}`);
      const json = await response.json();

      let results = json.status === 'ok' ? json.data : [];
      
      // Fallback search keywords for broader match
      if (results.length === 0) {
        const altQuery = city === 'Gurgaon' ? 'Gurugram' : city;
        const altRes = await fetch(`${BASE_URL}/search/?token=${API_TOKEN}&keyword=${encodeURIComponent(altQuery)}`);
        const altJson = await altRes.json();
        results = altJson.status === 'ok' ? altJson.data : [];
      }

      return results
        .filter((item: any) => {
          const name = item.station.name.toLowerCase();
          const cityLower = city.toLowerCase();
          return name.includes(cityLower) || 
                 (cityLower === 'noida' && name.includes('uttar pradesh')) ||
                 (cityLower === 'gurgaon' && name.includes('haryana')) ||
                 (cityLower === 'faridabad' && name.includes('haryana'));
        })
        .map((item: any) => ({
          uid: item.uid,
          name: item.station.name,
          aqi: parseInt(item.aqi) || 0,
          time: item.station.time || new Date().toISOString(),
          stationName: item.station.name,
          latitude: item.station.geo[0],
          longitude: item.station.geo[1],
          city: city,
          pollutants: {}
        }));
    } catch (e) {
      console.error(`Failed to fetch AQI for ${city}`, e);
      return [];
    }
  }

  /**
   * Fetch the nearest station based on IP or GPS
   */
  async fetchNearestStation(): Promise<GovernmentStation | null> {
    try {
      const response = await fetch(`${BASE_URL}/feed/here/?token=${API_TOKEN}`);
      const json = await response.json();
      if (json.status !== 'ok') return null;
      
      const data = json.data;
      return {
        uid: data.idx,
        name: data.city.name,
        aqi: data.aqi,
        time: data.time?.s || new Date().toISOString(),
        stationName: data.city.name,
        latitude: data.city.geo[0],
        longitude: data.city.geo[1],
        city: 'Nearby',
        pollutants: {
          pm25: data.iaqi?.pm25?.v,
          pm10: data.iaqi?.pm10?.v
        }
      };
    } catch (e) {
      return null;
    }
  }

  private async fetchStationByUid(uid: number, city: string): Promise<GovernmentStation | null> {
    try {
      const response = await fetch(`${BASE_URL}/feed/@${uid}/?token=${API_TOKEN}`);
      const json = await response.json();
      if (json.status !== 'ok') return null;
      const data = json.data;
      return {
        uid: uid,
        name: data.city.name,
        aqi: data.aqi,
        time: data.time?.s || new Date().toISOString(),
        stationName: data.city.name,
        latitude: data.city.geo[0],
        longitude: data.city.geo[1],
        city: city,
        pollutants: {
          pm25: data.iaqi?.pm25?.v,
          pm10: data.iaqi?.pm10?.v
        }
      };
    } catch (e) {
      return null;
    }
  }
}

export const governmentAqiService = new GovernmentAqiService();
