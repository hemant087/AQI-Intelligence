export interface GovernmentStation {
  uid: number;
  name: string;
  aqi: number;
  time: string;
  stationName: string;
  latitude: number;
  longitude: number;
  city: string; // Delhi, Noida, Gurgaon
  pollutants: {
    pm25?: number;
    pm10?: number;
    o3?: number;
    no2?: number;
    so2?: number;
    co?: number;
  };
}

export interface CityAqiSummary {
  city: string;
  avgAqi: number;
  stationCount: number;
  lastUpdated: string;
}
