import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { AQIReading } from '../models/AqiReading';

const DB_NAME = 'aqi_database.db';

export class LocalStorageService {
  private db: any;

  constructor() {
    if (Platform.OS !== 'web') {
      try {
        this.db = SQLite.openDatabaseSync(DB_NAME);
        this.init();
      } catch (e) {
        console.error('Failed to open SQLite', e);
      }
    }
  }

  private init() {
    if (Platform.OS === 'web') return;
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS readings (
        id TEXT PRIMARY KEY NOT NULL,
        deviceId TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        pm25 REAL NOT NULL,
        pm10 REAL,
        o3 REAL,
        no2 REAL,
        so2 REAL,
        co REAL,
        sourceType TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        contextTag TEXT,
        manufacturer TEXT,
        model TEXT,
        owner TEXT
      );
      CREATE TABLE IF NOT EXISTS government_stations (
        uid INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        aqi INTEGER NOT NULL,
        time TEXT NOT NULL,
        city TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        lastUpdated TEXT NOT NULL
      );
    `);
  }

  async insertGovernmentStation(station: any): Promise<void> {
    if (Platform.OS === 'web') return;
    this.db.runAsync(
      `INSERT OR REPLACE INTO government_stations (uid, name, aqi, time, city, latitude, longitude, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [station.uid, station.name, station.aqi, station.time, station.city, station.latitude, station.longitude, new Date().toISOString()]
    );
  }

  async getStationsByCity(city: string): Promise<any[]> {
    if (Platform.OS === 'web') return [];
    return this.db.getAllAsync(`SELECT * FROM government_stations WHERE city = ? ORDER BY aqi DESC`, [city]);
  }
  async insertReading(reading: AQIReading): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Web Mock: Saving reading', reading);
      return;
    }
    this.db.runAsync(
      `INSERT OR REPLACE INTO readings (id, deviceId, timestamp, pm25, pm10, o3, no2, so2, co, sourceType, latitude, longitude, contextTag, manufacturer, model, owner)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        reading.id,
        reading.deviceId,
        reading.timestamp,
        reading.pm25,
        reading.pm10 || null,
        reading.o3 || null,
        reading.no2 || null,
        reading.so2 || null,
        reading.co || null,
        reading.sourceType,
        reading.latitude || null,
        reading.longitude || null,
        reading.contextTag || null,
        reading.stationMetadata?.manufacturer || null,
        reading.stationMetadata?.model || null,
        reading.stationMetadata?.owner || null,
      ]
    );
  }

  async getRecentReadings(limit: number = 100): Promise<AQIReading[]> {
    if (Platform.OS === 'web') return [];
    const result = await this.db.getAllAsync(
      `SELECT * FROM readings ORDER BY timestamp DESC LIMIT ?`,
      [limit]
    );
    return result as AQIReading[];
  }

  async clearOldReadings(days: number = 7): Promise<void> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    await this.db.runAsync(`DELETE FROM readings WHERE timestamp < ?`, [date.toISOString()]);
  }
}

export const localStorageService = new LocalStorageService();
