// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'field_report.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FieldReport _$FieldReportFromJson(Map<String, dynamic> json) => FieldReport(
  id: json['id'] as String,
  segmentId: json['segmentId'] as String? ?? 'SEG-06',
  hazardType: json['hazardType'] as String,
  severity: json['severity'] as String,
  latitude: (json['latitude'] as num?)?.toDouble(),
  longitude: (json['longitude'] as num?)?.toDouble(),
  photoPath: json['photoPath'] as String?,
  notes: json['notes'] as String,
  timestamp: DateTime.parse(json['timestamp'] as String),
  reporterId: json['reporterId'] as String,
  syncStatus:
      $enumDecodeNullable(_$SyncStatusEnumMap, json['syncStatus']) ??
      SyncStatus.pending,
  serverError: json['serverError'] as String?,
);

Map<String, dynamic> _$FieldReportToJson(FieldReport instance) =>
    <String, dynamic>{
      'id': instance.id,
      'segmentId': instance.segmentId,
      'hazardType': instance.hazardType,
      'severity': instance.severity,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'photoPath': instance.photoPath,
      'notes': instance.notes,
      'timestamp': instance.timestamp.toIso8601String(),
      'reporterId': instance.reporterId,
      'syncStatus': _$SyncStatusEnumMap[instance.syncStatus]!,
      'serverError': instance.serverError,
    };

const _$SyncStatusEnumMap = {
  SyncStatus.pending: 'pending',
  SyncStatus.synced: 'synced',
  SyncStatus.failed: 'failed',
};
