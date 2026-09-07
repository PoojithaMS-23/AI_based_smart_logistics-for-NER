import 'package:json_annotation/json_annotation.dart';

part 'field_report.g.dart';

/// Field report model for terrain hazard reporting
@JsonSerializable()
class FieldReport {
  final String id;
  final String segmentId;
  final String hazardType;
  final String severity;
  final double? latitude;
  final double? longitude;
  final String? photoPath;
  final String notes;
  final DateTime timestamp;
  final String reporterId;
  final SyncStatus syncStatus;
  final String? serverError;

  const FieldReport({
    required this.id,
    this.segmentId = 'SEG-06',
    required this.hazardType,
    required this.severity,
    this.latitude,
    this.longitude,
    this.photoPath,
    required this.notes,
    required this.timestamp,
    required this.reporterId,
    this.syncStatus = SyncStatus.pending,
    this.serverError,
  });

  /// Creates a copy of this report with updated values
  FieldReport copyWith({
    String? id,
    String? segmentId,
    String? hazardType,
    String? severity,
    double? latitude,
    double? longitude,
    String? photoPath,
    String? notes,
    DateTime? timestamp,
    String? reporterId,
    SyncStatus? syncStatus,
    String? serverError,
  }) {
    return FieldReport(
      id: id ?? this.id,
      segmentId: segmentId ?? this.segmentId,
      hazardType: hazardType ?? this.hazardType,
      severity: severity ?? this.severity,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      photoPath: photoPath ?? this.photoPath,
      notes: notes ?? this.notes,
      timestamp: timestamp ?? this.timestamp,
      reporterId: reporterId ?? this.reporterId,
      syncStatus: syncStatus ?? this.syncStatus,
      serverError: serverError ?? this.serverError,
    );
  }

  /// JSON serialization
  factory FieldReport.fromJson(Map<String, dynamic> json) => _$FieldReportFromJson(json);
  Map<String, dynamic> toJson() => _$FieldReportToJson(this);

  /// Convert to API request format
  Map<String, dynamic> toApiRequest() {
    return {
      'id': id,
      'segment_id': segmentId,
      'hazard_type': hazardType,
      'severity': severity,
      'reporter_id': reporterId,
      'notes': notes,
      'latitude': latitude,
      'longitude': longitude,
      'photo_path': photoPath,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  /// Get display status text
  String get statusDisplay {
    switch (syncStatus) {
      case SyncStatus.pending:
        return 'Pending Sync';
      case SyncStatus.synced:
        return 'Synced';
      case SyncStatus.failed:
        return 'Sync Failed';
    }
  }

  /// Get GPS display text
  String get locationDisplay {
    if (latitude != null && longitude != null) {
      return '${latitude!.toStringAsFixed(6)}, ${longitude!.toStringAsFixed(6)}';
    }
    return 'No GPS Location';
  }

  bool get hasLocation => latitude != null && longitude != null;
}

/// Sync status enumeration
enum SyncStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('synced')
  synced,
  @JsonValue('failed')
  failed,
}

/// Hazard types available in the app
class HazardTypes {
  static const List<String> all = [
    'Landslide',
    'Rockfall',
    'Flash Flood',
    'Road Damage',
    'Bridge Damage',
    'Debris Obstruction',
  ];
}

/// Severity levels available in the app
class SeverityLevels {
  static const List<String> all = [
    'Severe',
    'Moderate',
    'Minor',
  ];

  static String getDescription(String severity) {
    switch (severity) {
      case 'Severe':
        return 'Complete blockage - Impassable';
      case 'Moderate':
        return 'Single lane only - Caution required';
      case 'Minor':
        return 'Passable with care';
      default:
        return severity;
    }
  }
}

/// NH-313 Corridor Segments for Field Reporter Selection
class CorridorSegments {
  static const List<Map<String, String>> all = [
    {'id': 'SEG-01', 'name': 'SEG-01: Roing - Koronu Transit'},
    {'id': 'SEG-02', 'name': 'SEG-02: Koronu - Mayodia Ascent'},
    {'id': 'SEG-03', 'name': 'SEG-03: Mayodia Ridge - Tiwari Gaon'},
    {'id': 'SEG-04', 'name': 'SEG-04: Tiwari Gaon - Hunli Sector'},
    {'id': 'SEG-05', 'name': 'SEG-05: Hunli - Desali Junction'},
    {'id': 'SEG-06', 'name': 'SEG-06: Desali - New Arzoo Gorge'},
    {'id': 'SEG-07', 'name': 'SEG-07: New Arzoo - Kronli Cliff'},
    {'id': 'SEG-08', 'name': 'SEG-08: Kronli - Etalin Confluence'},
    {'id': 'SEG-09', 'name': 'SEG-09: Etalin - Ranli Sector'},
    {'id': 'SEG-10', 'name': 'SEG-10: Ranli - Anini Terminal'},
    {'id': 'SEG-11', 'name': 'SEG-11: Anini - Mipi Border Link'},
    {'id': 'SEG-BP1', 'name': 'SEG-BP1: Desali - Chipi Bypass Link'},
    {'id': 'SEG-BP2', 'name': 'SEG-BP2: Chipi - Etalin Bypass Link'},
  ];

  static String getSegmentName(String id) {
    final match = all.firstWhere((s) => s['id'] == id, orElse: () => {'id': id, 'name': id});
    return match['name'] ?? id;
  }
}