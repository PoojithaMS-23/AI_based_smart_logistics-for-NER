import 'dart:async';
import 'package:geolocator/geolocator.dart';
import '../config/app_config.dart';

/// GPS location service for field reports
class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  /// Check and request location permissions
  Future<LocationPermissionStatus> checkLocationPermission() async {
    // Check if location services are enabled
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationPermissionStatus.serviceDisabled;
    }

    // Check current permission status
    LocationPermission permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      // Request permission
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return LocationPermissionStatus.denied;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return LocationPermissionStatus.deniedForever;
    }

    return LocationPermissionStatus.granted;
  }

  /// Get current GPS location
  Future<LocationResult> getCurrentLocation() async {
    try {
      // Check permissions first
      LocationPermissionStatus permissionStatus = await checkLocationPermission();
      if (permissionStatus != LocationPermissionStatus.granted) {
        return LocationResult.error('GPS permission not granted: ${permissionStatus.displayMessage}');
      }

      // Get current position with timeout
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: AppConfig.locationTimeoutSeconds),
        ),
      );

      // Validate accuracy
      if (position.accuracy > AppConfig.locationAccuracyMeters) {
        return LocationResult.error(
          'GPS accuracy too low: ${position.accuracy.toStringAsFixed(1)}m (required: ${AppConfig.locationAccuracyMeters}m)'
        );
      }

      return LocationResult.success(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      );

    } catch (e) {
      String errorMessage;
      if (e is TimeoutException) {
        errorMessage = 'GPS timeout after ${AppConfig.locationTimeoutSeconds} seconds';
      } else if (e.toString().contains('location service')) {
        errorMessage = 'Location service is disabled. Please enable GPS.';
      } else {
        errorMessage = 'GPS error: ${e.toString()}';
      }
      
      return LocationResult.error(errorMessage);
    }
  }

  /// Open device location settings
  Future<void> openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }

  /// Open app settings for permission management
  Future<void> openAppSettings() async {
    await openAppSettings();
  }
}

/// Location permission status
enum LocationPermissionStatus {
  granted,
  denied,
  deniedForever,
  serviceDisabled,
}

extension LocationPermissionStatusExtension on LocationPermissionStatus {
  String get displayMessage {
    switch (this) {
      case LocationPermissionStatus.granted:
        return 'Location access granted';
      case LocationPermissionStatus.denied:
        return 'Location permission denied';
      case LocationPermissionStatus.deniedForever:
        return 'Location permission permanently denied';
      case LocationPermissionStatus.serviceDisabled:
        return 'Location service is disabled';
    }
  }

  bool get canRequestAgain {
    return this == LocationPermissionStatus.denied;
  }

  bool get requiresSettings {
    return this == LocationPermissionStatus.deniedForever || 
           this == LocationPermissionStatus.serviceDisabled;
  }
}

/// Location result wrapper
class LocationResult {
  final bool success;
  final double? latitude;
  final double? longitude;
  final double? accuracy;
  final String? error;

  LocationResult._({
    required this.success,
    this.latitude,
    this.longitude,
    this.accuracy,
    this.error,
  });

  factory LocationResult.success({
    required double latitude,
    required double longitude,
    required double accuracy,
  }) {
    return LocationResult._(
      success: true,
      latitude: latitude,
      longitude: longitude,
      accuracy: accuracy,
    );
  }

  factory LocationResult.error(String error) {
    return LocationResult._(
      success: false,
      error: error,
    );
  }

  String get displayText {
    if (success && latitude != null && longitude != null) {
      return '${latitude!.toStringAsFixed(6)}, ${longitude!.toStringAsFixed(6)} (±${accuracy!.toStringAsFixed(1)}m)';
    }
    return error ?? 'Unknown location error';
  }
}