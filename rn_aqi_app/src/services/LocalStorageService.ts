import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { NewsArticle } from '../models/NewsArticle';
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
    
    // Create base tables
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS readings (
        id TEXT PRIMARY KEY NOT NULL,
        deviceId TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        pm25 REAL NOT NULL
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
      CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        url TEXT NOT NULL,
        imageUrl TEXT,
        source TEXT,
        publishedAt TEXT NOT NULL,
        fetchedAt TEXT NOT NULL
      );
    `);

    // Safely migrate existing databases securely by adding new columns one by one
    // if the table was created in an older version of the app.
    const columnsToAdd = [
      'pm10 REAL', 'o3 REAL', 'no2 REAL', 'so2 REAL', 'co REAL',
      'sourceType TEXT DEFAULT "unknown"', 'latitude REAL', 'longitude REAL',
      'contextTag TEXT', 'manufacturer TEXT', 'model TEXT', 'owner TEXT'
    ];

    for (const column of columnsToAdd) {
      try {
        this.db.execSync(`ALTER TABLE readings ADD COLUMN ${column};`);
      } catch (e) {
        // If it throws, the column probably already exists, which is totally fine.
      }
    }
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

  async insertNewsArticle(article: NewsArticle): Promise<void> {
    if (Platform.OS === 'web') return;
    this.db.runAsync(
      `INSERT OR REPLACE INTO news (id, title, description, content, url, imageUrl, source, publishedAt, fetchedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        article.id,
        article.title,
        article.description || null,
        article.content || null,
        article.url,
        article.imageUrl || null,
        article.source,
        article.publishedAt,
        new Date().toISOString()
      ]
    );
  }

  async getAllNews(): Promise<NewsArticle[]> {
    if (Platform.OS === 'web') return [];
    return this.db.getAllAsync(`SELECT * FROM news ORDER BY publishedAt DESC`);
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

  async getAllReadings(): Promise<AQIReading[]> {
    if (Platform.OS === 'web') return [];
    return this.db.getAllAsync(`SELECT * FROM readings ORDER BY timestamp DESC`);
  }

  async getAllStations(): Promise<any[]> {
    if (Platform.OS === 'web') return [];
    return this.db.getAllAsync(`SELECT * FROM government_stations`);
  }

  async exportDatabaseToJson(): Promise<string> {
    const news = await this.getAllNews();
    const readings = await this.getAllReadings();
    const stations = await this.getAllStations();

    const result = {
      exportDate: new Date().toISOString(),
      counts: {
        news: news.length,
        readings: readings.length,
        stations: stations.length,
      },
      data: {
        news,
        readings,
        stations
      }
    };

    return JSON.stringify(result, null, 2);
  }
}

export const localStorageService = new LocalStorageService();
