/// Application configuration and constants
class AppConfig {
  // API Configuration
  static const String defaultBaseUrl = 'http://10.0.2.2:8000'; // Android emulator
  static const String physicalDeviceBaseUrl = 'http://192.168.1.100:8000'; // Change for physical device
  
  // Shared preferences keys
  static const String baseUrlKey = 'api_base_url';
  static const String reporterIdKey = 'reporter_id';
  static const String networkSimulationKey = 'network_simulation_offline';
  
  // Default values
  static const String defaultReporterId = 'FIELD-MOBILE-001';
  
  // API endpoints
  static const String reportsEndpoint = '/api/reports';
  static const String corridorEndpoint = '/api/corridor';
  
  // App metadata
  static const String appName = 'NER-SANCHAAR Field Reporter';
  static const String appVersion = '1.0.0';
  
  // Database configuration
  static const String databaseName = 'field_reports.db';
  static const int databaseVersion = 1;
  
  // GPS configuration
  static const int locationTimeoutSeconds = 30;
  static const double locationAccuracyMeters = 100.0;
  
  // Photo configuration
  static const int imageQuality = 85;
  static const double maxImageWidth = 1024.0;
  static const double maxImageHeight = 1024.0;
  
  // Sync configuration
  static const int maxRetryAttempts = 3;
  static const int syncIntervalSeconds = 30;
  static const int connectionTimeoutSeconds = 10;
}

/// Network simulation states for demo/testing
enum NetworkSimulation {
  online,
  offline,
}

extension NetworkSimulationExtension on NetworkSimulation {
  String get displayName {
    switch (this) {
      case NetworkSimulation.online:
        return 'Online Mode';
      case NetworkSimulation.offline:
        return 'Offline Mode (Demo)';
    }
  }
}