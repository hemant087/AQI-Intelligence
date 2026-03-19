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
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    const idType = 'TEXT PRIMARY KEY';
    const textType = 'TEXT NOT NULL';
    const numType = 'REAL';

    await db.execute('''
CREATE TABLE readings (
  id $idType,
  device_id $textType,
  timestamp $textType,
  pm25 $numType,
  pm10 $numType,
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
