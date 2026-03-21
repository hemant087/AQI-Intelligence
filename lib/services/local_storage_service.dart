import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/aqi_reading.dart';

class LocalStorageService {
  static final LocalStorageService instance = LocalStorageService._init();
  static Database? _database;

  LocalStorageService._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('aqi_readings.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 2, // Upgraded to v2
      onCreate: _createDB,
      onUpgrade: _onUpgrade,
    );
  }

  Future _createDB(Database db, int version) async {
    await _buildSchema(db);
  }

  Future _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      // For v1 to v2, we add new columns
      await db.execute('ALTER TABLE readings ADD COLUMN source_name TEXT');
      await db.execute('ALTER TABLE readings ADD COLUMN no2 REAL');
      await db.execute('ALTER TABLE readings ADD COLUMN co REAL');
      await db.execute('ALTER TABLE readings ADD COLUMN so2 REAL');
      await db.execute('ALTER TABLE readings ADD COLUMN o3 REAL');
      await db.execute('ALTER TABLE readings ADD COLUMN nh3 REAL');
    }
  }

  Future _buildSchema(Database db) async {
    const idType = 'TEXT PRIMARY KEY';
    const textType = 'TEXT NOT NULL';
    const numType = 'REAL';

    await db.execute('''
CREATE TABLE readings (
  id $idType,
  device_id $textType,
  source_name TEXT,
  timestamp $textType,
  pm25 $numType,
  pm10 $numType,
  no2 $numType,
  co $numType,
  so2 $numType,
  o3 $numType,
  nh3 $numType,
  temperature $numType,
  humidity $numType,
  latitude $numType,
  longitude $numType,
  source_type $textType,
  context_tag TEXT,
  sync_status $textType
)
''');
  }

  Future<void> insertReading(AQIReading reading) async {
    final db = await instance.database;
    await db.insert('readings', reading.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<AQIReading>> getPendingReadings() async {
    final db = await instance.database;
    final maps = await db.query(
      'readings',
      where: 'sync_status = ?',
      whereArgs: ['pending'],
      orderBy: 'timestamp ASC'
    );
    if (maps.isNotEmpty) {
      return maps.map((map) => AQIReading.fromMap(map)).toList();
    } else {
      return [];
    }
  }

  Future<void> updateSyncStatus(String id, String status) async {
    final db = await instance.database;
    await db.update(
      'readings',
      {'sync_status': status},
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
