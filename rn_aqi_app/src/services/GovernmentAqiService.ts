import { Platform } from 'react-native';
import { GovernmentStation } from '../models/GovernmentStation';

// Public token for AQICN (World Air Quality Index Project)
const API_TOKEN = 'a962dcada5e955c8f62ab391ab993bab339675f2'; // Note: In a real app, this should be a secure key.
const BASE_URL = 'https://api.waqi.info';

const NCR_STATION_IDS: Record<string, number[]> = {
  'Delhi': [8677, 8678, 1453, 1454, 3031], // Anand Vihar, Shadipur, ITO, etc.
  'Noida': [8181, 8180], // Sector 62, Sector 125
  'Gurgaon': [8182, 10832], // Vikas Sadan, Sector 51
};

export class GovernmentAqiService {
  /**
   * Fetch stations for a given city
   */
  async fetchStationsByCity(city: string): Promise<GovernmentStation[]> {
    if (Platform.OS === 'web') {
      // Return high-quality mock data for web preview
      return this.getMockStations(city);
    }

    try {
      const query = `${city}, India`;
      const response = await fetch(`${BASE_URL}/search/?token=${API_TOKEN}&keyword=${encodeURIComponent(query)}`);
      const json = await response.json();

      let results = json.status === 'ok' ? json.data : [];
      
      // If search returns nothing or irrelevant results, fallback to known UIDs
      if (results.length === 0 || !results.some((r: any) => r.station.name.toLowerCase().includes(city.toLowerCase()))) {
        const uids = NCR_STATION_IDS[city] || [];
        const fallbackResults = await Promise.all(uids.map(uid => this.fetchStationByUid(uid, city)));
        return fallbackResults.filter(s => s !== null) as GovernmentStation[];
      }

      return results
        .filter((item: any) => {
          const name = item.station.name.toLowerCase();
          const cityLower = city.toLowerCase();
          return name.includes(cityLower) || 
                 (cityLower === 'noida' && (name.includes('noida') || name.includes('uttar pradesh'))) ||
                 (cityLower === 'gurgaon' && (name.includes('gurugram') || name.includes('haryana')));
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
    if (Platform.OS === 'web') {
      return {
        uid: 999,
        name: 'Civil Lines, Delhi - CPCB',
        aqi: 288,
        time: new Date().toISOString(),
        stationName: 'Civil Lines, Delhi',
        latitude: 28.6139,
        longitude: 77.2090,
        city: 'Nearby',
        pollutants: { pm25: 238, pm10: 250 }
      };
    }
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

  private getMockStations(city: string): GovernmentStation[] {
    const mocks: Record<string, any[]> = {
      'Delhi': [
        { uid: 1, name: 'Anand Vihar, Delhi - DPCC', aqi: 342, time: '14:00' },
        { uid: 2, name: 'ITO, Delhi - CPCB', aqi: 285, time: '14:00' },
        { uid: 3, name: 'RK Puram, Delhi - DPCC', aqi: 310, time: '14:00' }
      ],
      'Noida': [
        { uid: 4, name: 'Sector 62, Noida - IMD', aqi: 295, time: '14:00' },
        { uid: 5, name: 'Sector 125, Noida - UPPCB', aqi: 270, time: '14:00' }
      ],
      'Gurgaon': [
        { uid: 6, name: 'Vikas Sadan, Gurugram - HSPCB', aqi: 320, time: '14:00' },
        { uid: 7, name: 'Sector 51, Gurugram - HSPCB', aqi: 305, time: '14:00' }
      ]
    };

    return (mocks[city] || []).map(m => ({
      ...m,
      stationName: m.name,
      latitude: 28.6139,
      longitude: 77.2090,
      city: city,
      pollutants: { pm25: m.aqi - 50, pm10: m.aqi + 20 }
    }));
  }
}

export const governmentAqiService = new GovernmentAqiService();
