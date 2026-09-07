import 'dart:async';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/field_report.dart';
import '../config/app_config.dart';

/// Local database service for offline-first behavior
class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Database? _database;

  /// Get database instance
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  /// Initialize the local database
  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), AppConfig.databaseName);
    
    return await openDatabase(
      path,
      version: AppConfig.databaseVersion,
      onCreate: _onCreate,
    );
  }

  /// Create database tables
  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE field_reports (
        id TEXT PRIMARY KEY,
        segment_id TEXT NOT NULL DEFAULT 'SEG-06',
        hazard_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        photo_path TEXT,
        notes TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        reporter_id TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        server_error TEXT
      )
    ''');
  }

  /// Insert a new field report
  Future<void> insertReport(FieldReport report) async {
    final db = await database;
    await db.insert(
      'field_reports',
      _reportToMap(report),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Update an existing report
  Future<void> updateReport(FieldReport report) async {
    final db = await database;
    await db.update(
      'field_reports',
      _reportToMap(report),
      where: 'id = ?',
      whereArgs: [report.id],
    );
  }

  /// Get all reports ordered by timestamp (newest first)
  Future<List<FieldReport>> getAllReports() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'field_reports',
      orderBy: 'timestamp DESC',
    );

    return maps.map((map) => _mapToReport(map)).toList();
  }

  /// Get reports by sync status
  Future<List<FieldReport>> getReportsByStatus(SyncStatus status) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'field_reports',
      where: 'sync_status = ?',
      whereArgs: [status.toString().split('.').last],
      orderBy: 'timestamp DESC',
    );

    return maps.map((map) => _mapToReport(map)).toList();
  }

  /// Get pending reports (for synchronization)
  Future<List<FieldReport>> getPendingReports() async {
    return getReportsByStatus(SyncStatus.pending);
  }

  /// Get synced reports
  Future<List<FieldReport>> getSyncedReports() async {
    return getReportsByStatus(SyncStatus.synced);
  }

  /// Get failed reports (for retry)
  Future<List<FieldReport>> getFailedReports() async {
    return getReportsByStatus(SyncStatus.failed);
  }

  /// Delete a report
  Future<void> deleteReport(String id) async {
    final db = await database;
    await db.delete(
      'field_reports',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Mark a report as synced
  Future<void> markReportAsSynced(String id) async {
    final db = await database;
    await db.update(
      'field_reports',
      {'sync_status': 'synced', 'server_error': null},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Mark a report as failed with error message
  Future<void> markReportAsFailed(String id, String error) async {
    final db = await database;
    await db.update(
      'field_reports',
      {'sync_status': 'failed', 'server_error': error},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Reset failed reports to pending (for retry)
  Future<void> retryFailedReports() async {
    final db = await database;
    await db.update(
      'field_reports',
      {'sync_status': 'pending', 'server_error': null},
      where: 'sync_status = ?',
      whereArgs: ['failed'],
    );
  }

  /// Get report count by status
  Future<Map<SyncStatus, int>> getReportCounts() async {
    final db = await database;
    final result = await db.rawQuery('''
      SELECT sync_status, COUNT(*) as count 
      FROM field_reports 
      GROUP BY sync_status
    ''');

    Map<SyncStatus, int> counts = {
      SyncStatus.pending: 0,
      SyncStatus.synced: 0,
      SyncStatus.failed: 0,
    };

    for (var row in result) {
      String status = row['sync_status'] as String;
      int count = row['count'] as int;
      
      switch (status) {
        case 'pending':
          counts[SyncStatus.pending] = count;
          break;
        case 'synced':
          counts[SyncStatus.synced] = count;
          break;
        case 'failed':
          counts[SyncStatus.failed] = count;
          break;
      }
    }

    return counts;
  }

  /// Convert FieldReport to database map
  Map<String, dynamic> _reportToMap(FieldReport report) {
    return {
      'id': report.id,
      'segment_id': report.segmentId,
      'hazard_type': report.hazardType,
      'severity': report.severity,
      'latitude': report.latitude,
      'longitude': report.longitude,
      'photo_path': report.photoPath,
      'notes': report.notes,
      'timestamp': report.timestamp.millisecondsSinceEpoch,
      'reporter_id': report.reporterId,
      'sync_status': report.syncStatus.toString().split('.').last,
      'server_error': report.serverError,
    };
  }

  /// Convert database map to FieldReport
  FieldReport _mapToReport(Map<String, dynamic> map) {
    SyncStatus status;
    switch (map['sync_status'] as String) {
      case 'synced':
        status = SyncStatus.synced;
        break;
      case 'failed':
        status = SyncStatus.failed;
        break;
      default:
        status = SyncStatus.pending;
    }

    return FieldReport(
      id: map['id'] as String,
      segmentId: map['segment_id'] as String? ?? 'SEG-06',
      hazardType: map['hazard_type'] as String,
      severity: map['severity'] as String,
      latitude: map['latitude'] as double?,
      longitude: map['longitude'] as double?,
      photoPath: map['photo_path'] as String?,
      notes: map['notes'] as String,
      timestamp: DateTime.fromMillisecondsSinceEpoch(map['timestamp'] as int),
      reporterId: map['reporter_id'] as String,
      syncStatus: status,
      serverError: map['server_error'] as String?,
    );
  }

  /// Close database connection
  Future<void> close() async {
    final db = _database;
    if (db != null) {
      await db.close();
      _database = null;
    }
  }
}