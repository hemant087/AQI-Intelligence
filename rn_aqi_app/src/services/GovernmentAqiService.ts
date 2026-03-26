import { Platform } from 'react-native';
import { GovernmentStation } from '../models/GovernmentStation';
import { upsertGovernmentStations } from './SupabaseService';

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
   * NOTE: WAQI API commented out — using OpenAQ exclusively
   */
  async fetchAllNcrStations(): Promise<GovernmentStation[]> {
    // ── WAQI: Commented out — using OpenAQ exclusively ────────────────────
    // try {
    //   const results = await Promise.all(
    //     NCR_CITIES.map(city => this.fetchStationsByCity(city))
    //   );
    //   const flat = results.flat();
    //   const unique = Array.from(new Map(flat.map(s => [s.uid, s])).values());
    //   upsertGovernmentStations(unique).catch(err =>
    //     console.error('[Supabase] Failed to upsert government stations', err)
    //   );
    //   return unique;
    // } catch (e) {
    //   console.error('Failed to fetch consolidated NCR stations', e);
    //   return [];
    // }
    return [];
  }

  /**
   * Fetch stations for a given city
   * NOTE: WAQI API commented out — using OpenAQ exclusively
   */
  async fetchStationsByCity(city: string): Promise<GovernmentStation[]> {
    // ── WAQI: Commented out — using OpenAQ exclusively ────────────────────
    // try {
    //   const query = `${city}, India`;
    //   const response = await fetch(`${BASE_URL}/search/?token=${API_TOKEN}&keyword=${encodeURIComponent(query)}`);
    //   const json = await response.json();
    //   let results = json.status === 'ok' ? json.data : [];
    //   if (results.length === 0) {
    //     const altQuery = city === 'Gurgaon' ? 'Gurugram' : city;
    //     const altRes = await fetch(`${BASE_URL}/search/?token=${API_TOKEN}&keyword=${encodeURIComponent(altQuery)}`);
    //     const altJson = await altRes.json();
    //     results = altJson.status === 'ok' ? altJson.data : [];
    //   }
    //   return results.filter(...).map(...);
    // } catch (e) {
    //   console.error(`Failed to fetch AQI for ${city}`, e);
    //   return [];
    // }
    return [];
  }

  /**
   * Fetch the nearest station based on IP or GPS
   * NOTE: WAQI API commented out — using OpenAQ exclusively
   */
  async fetchNearestStation(): Promise<GovernmentStation | null> {
    // ── WAQI: Commented out — using OpenAQ exclusively ────────────────────
    // try {
    //   const response = await fetch(`${BASE_URL}/feed/here/?token=${API_TOKEN}`);
    //   const json = await response.json();
    //   if (json.status !== 'ok') return null;
    //   const data = json.data;
    //   return {
    //     uid: data.idx,
    //     name: data.city.name,
    //     aqi: data.aqi,
    //     time: data.time?.s || new Date().toISOString(),
    //     stationName: data.city.name,
    //     latitude: data.city.geo[0],
    //     longitude: data.city.geo[1],
    //     city: 'Nearby',
    //     pollutants: { pm25: data.iaqi?.pm25?.v, pm10: data.iaqi?.pm10?.v }
    //   };
    // } catch (e) {
    //   return null;
    // }
    return null;
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
