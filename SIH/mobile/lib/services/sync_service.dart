import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/field_report.dart';
import '../config/app_config.dart';
import 'database_service.dart';

/// Network and synchronization service for field reports
class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  final DatabaseService _db = DatabaseService();
  Timer? _syncTimer;
  bool _isSyncing = false;

  /// Start automatic sync timer
  void startAutoSync() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(
      Duration(seconds: AppConfig.syncIntervalSeconds),
      (_) => syncPendingReports(),
    );
  }

  /// Stop automatic sync timer
  void stopAutoSync() {
    _syncTimer?.cancel();
    _syncTimer = null;
  }

  /// Check if device has internet connectivity
  Future<bool> hasConnectivity() async {
    try {
      // Check network simulation setting first
      final prefs = await SharedPreferences.getInstance();
      final simulateOffline = prefs.getBool(AppConfig.networkSimulationKey) ?? false;
      if (simulateOffline) {
        return false; // Simulated offline mode
      }

      // Check actual connectivity
      final connectivityResults = await Connectivity().checkConnectivity();
      if (connectivityResults.contains(ConnectivityResult.none)) {
        return false;
      }

      // Ping the API server to verify actual connection
      final String baseUrl = await getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl${AppConfig.corridorEndpoint}'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(Duration(seconds: AppConfig.connectionTimeoutSeconds));

      return response.statusCode == 200;

    } catch (e) {
      return false;
    }
  }

  /// Get API base URL from preferences
  Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConfig.baseUrlKey) ?? AppConfig.defaultBaseUrl;
  }

  /// Set API base URL in preferences
  Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConfig.baseUrlKey, url);
  }

  /// Submit a single field report to the API
  Future<SyncResult> submitReport(FieldReport report) async {
    try {
      final String baseUrl = await getBaseUrl();
      final Uri uri = Uri.parse('$baseUrl${AppConfig.reportsEndpoint}');

      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(report.toApiRequest()),
      ).timeout(Duration(seconds: AppConfig.connectionTimeoutSeconds));

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Success - mark as synced
        await _db.markReportAsSynced(report.id);
        return SyncResult.success();
      } else {
        // Server error
        final String error = 'Server error: ${response.statusCode} ${response.reasonPhrase}';
        await _db.markReportAsFailed(report.id, error);
        return SyncResult.error(error);
      }

    } catch (e) {
      // Network or other error
      final String error = 'Network error: ${e.toString()}';
      await _db.markReportAsFailed(report.id, error);
      return SyncResult.error(error);
    }
  }

  /// Sync all pending reports
  Future<SyncBatchResult> syncPendingReports() async {
    if (_isSyncing) {
      return SyncBatchResult.skipped('Sync already in progress');
    }

    _isSyncing = true;
    
    try {
      // Check connectivity first
      if (!await hasConnectivity()) {
        return SyncBatchResult.noNetwork('No network connectivity');
      }

      // Get all pending reports
      final List<FieldReport> pendingReports = await _db.getPendingReports();
      
      if (pendingReports.isEmpty) {
        return SyncBatchResult.success(0, 0);
      }

      int successCount = 0;
      int failureCount = 0;
      List<String> errors = [];

      // Submit each report
      for (FieldReport report in pendingReports) {
        final SyncResult result = await submitReport(report);
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          if (result.error != null) {
            errors.add('${report.id}: ${result.error}');
          }
        }

        // Small delay between requests to avoid overwhelming the server
        await Future.delayed(Duration(milliseconds: 500));
      }

      return SyncBatchResult.success(successCount, failureCount, errors);

    } finally {
      _isSyncing = false;
    }
  }

  /// Retry failed reports (mark as pending and sync)
  Future<SyncBatchResult> retryFailedReports() async {
    // Reset failed reports to pending
    await _db.retryFailedReports();
    
    // Sync all pending reports
    return await syncPendingReports();
  }

  /// Get network simulation status
  Future<bool> isNetworkSimulationOffline() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(AppConfig.networkSimulationKey) ?? false;
  }

  /// Toggle network simulation for demo/testing
  Future<void> setNetworkSimulation(bool offline) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConfig.networkSimulationKey, offline);
  }

  /// Dispose resources
  void dispose() {
    stopAutoSync();
  }
}

/// Result of a single sync operation
class SyncResult {
  final bool success;
  final String? error;

  SyncResult._({required this.success, this.error});

  factory SyncResult.success() => SyncResult._(success: true);
  factory SyncResult.error(String error) => SyncResult._(success: false, error: error);
}

/// Result of a batch sync operation
class SyncBatchResult {
  final bool success;
  final int successCount;
  final int failureCount;
  final String? message;
  final List<String> errors;

  SyncBatchResult._({
    required this.success,
    this.successCount = 0,
    this.failureCount = 0,
    this.message,
    this.errors = const [],
  });

  factory SyncBatchResult.success(int successCount, int failureCount, [List<String>? errors]) {
    return SyncBatchResult._(
      success: true,
      successCount: successCount,
      failureCount: failureCount,
      errors: errors ?? [],
    );
  }

  factory SyncBatchResult.noNetwork(String message) {
    return SyncBatchResult._(success: false, message: message);
  }

  factory SyncBatchResult.skipped(String message) {
    return SyncBatchResult._(success: false, message: message);
  }

  String get displayMessage {
    if (message != null) return message!;
    
    if (successCount > 0 && failureCount == 0) {
      return 'Successfully synced $successCount reports';
    } else if (successCount > 0 && failureCount > 0) {
      return 'Synced $successCount reports, $failureCount failed';
    } else if (successCount == 0 && failureCount > 0) {
      return 'Failed to sync $failureCount reports';
    } else {
      return 'No reports to sync';
    }
  }
}