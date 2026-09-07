import 'dart:io';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../models/field_report.dart';
import '../services/database_service.dart';
import '../services/location_service.dart';
import '../services/camera_service.dart';
import '../services/sync_service.dart';
import '../config/app_config.dart';
import 'home_screen.dart' show AppColors;

class NewReportScreen extends StatefulWidget {
  const NewReportScreen({super.key});

  @override
  State<NewReportScreen> createState() => _NewReportScreenState();
}

class _NewReportScreenState extends State<NewReportScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _notesController = TextEditingController();

  final DatabaseService _db = DatabaseService();
  final LocationService _location = LocationService();
  final CameraService _camera = CameraService();
  final SyncService _sync = SyncService();

  String _selectedSegmentId = 'SEG-06';
  String _selectedHazardType = HazardTypes.all.first;
  String _selectedSeverity = SeverityLevels.all.first;
  String? _photoPath;
  LocationResult? _locationResult;

  bool _isGettingLocation = false;
  bool _isSubmitting = false;
  String _reporterId = AppConfig.defaultReporterId;

  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _loadReporterId();
    _notesController.text = '';
    _slideController = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));
    _slideAnimation = Tween<Offset>(begin: const Offset(0, 0.05), end: Offset.zero)
        .animate(CurvedAnimation(parent: _slideController, curve: Curves.easeOut));
    _slideController.forward();
  }

  @override
  void dispose() {
    _notesController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  Future<void> _loadReporterId() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _reporterId = prefs.getString(AppConfig.reporterIdKey) ?? AppConfig.defaultReporterId;
    });
  }

  Future<void> _getLocation() async {
    setState(() => _isGettingLocation = true);
    try {
      final result = await _location.getCurrentLocation();
      setState(() => _locationResult = result);
      if (!result.success && mounted) _showLocationErrorDialog(result);
    } finally {
      setState(() => _isGettingLocation = false);
    }
  }

  void _showLocationErrorDialog(LocationResult result) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.border),
        ),
        title: const Text('GPS Error', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700)),
        content: Text(result.displayText, style: const TextStyle(color: AppColors.textSecond, fontSize: 13)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('OK', style: TextStyle(color: AppColors.cyan)),
          ),
          if (result.error?.contains('permission') == true)
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _location.openAppSettings();
              },
              child: const Text('Settings', style: TextStyle(color: AppColors.amber)),
            ),
        ],
      ),
    );
  }

  Future<void> _showPhotoOptions() async {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(color: AppColors.border),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36, height: 4,
                decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
              ),
              const SizedBox(height: 16),
              _buildSheetTile(Icons.camera_alt_rounded, 'Take Photo', AppColors.cyan, () async {
                Navigator.pop(ctx);
                final result = await _camera.takePhoto();
                if (result.success && result.photoPath != null) {
                  setState(() => _photoPath = result.photoPath);
                }
              }),
              _buildSheetTile(Icons.photo_library_rounded, 'Choose from Gallery', AppColors.blue, () async {
                Navigator.pop(ctx);
                final result = await _camera.selectFromGallery();
                if (result.success && result.photoPath != null) {
                  setState(() => _photoPath = result.photoPath);
                }
              }),
              if (_photoPath != null)
                _buildSheetTile(Icons.delete_rounded, 'Remove Photo', AppColors.rose, () {
                  Navigator.pop(ctx);
                  setState(() => _photoPath = null);
                }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSheetTile(IconData icon, String title, Color color, VoidCallback onTap) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: color, size: 18),
      ),
      title: Text(title, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600)),
      onTap: onTap,
    );
  }

  Future<void> _submitReport() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    try {
      final report = FieldReport(
        id: const Uuid().v4(),
        segmentId: _selectedSegmentId,
        hazardType: _selectedHazardType,
        severity: _selectedSeverity,
        latitude: _locationResult?.latitude,
        longitude: _locationResult?.longitude,
        photoPath: _photoPath,
        notes: _notesController.text.trim(),
        timestamp: DateTime.now(),
        reporterId: _reporterId,
        syncStatus: SyncStatus.pending,
      );
      await _db.insertReport(report);
      final isConnected = await _sync.hasConnectivity();
      String message = 'Report saved locally. Will sync when online.';
      if (isConnected) {
        final syncResult = await _sync.submitReport(report);
        if (syncResult.success) message = 'Report submitted & synced to HQ successfully!';
      }
      if (mounted) {
        _showSuccessAndPop(message);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: AppColors.rose),
        );
      }
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  void _showSuccessAndPop(String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: AppColors.emerald.withValues(alpha: 0.5)),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.emerald.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_rounded, color: AppColors.emerald, size: 40),
            ),
            const SizedBox(height: 16),
            const Text('Report Submitted', style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(message, style: const TextStyle(color: AppColors.textSecond, fontSize: 12), textAlign: TextAlign.center),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pop(context, true);
              },
              child: const Text('DONE'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: _buildAppBar(),
      body: SlideTransition(
        position: _slideAnimation,
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
            children: [
              _buildReporterHeader(),
              const SizedBox(height: 16),
              _buildFormSection(
                label: '01 — SECTOR',
                icon: Icons.map_rounded,
                color: AppColors.cyan,
                child: _buildSegmentDropdown(),
              ),
              _buildFormSection(
                label: '02 — HAZARD TYPE',
                icon: Icons.warning_rounded,
                color: AppColors.amber,
                child: _buildHazardDropdown(),
              ),
              _buildFormSection(
                label: '03 — SEVERITY',
                icon: Icons.speed_rounded,
                color: AppColors.rose,
                child: _buildSeveritySelector(),
              ),
              _buildFormSection(
                label: '04 — GPS COORDINATES',
                icon: Icons.my_location_rounded,
                color: AppColors.blue,
                child: _buildGpsSection(),
              ),
              _buildFormSection(
                label: '05 — PHOTOGRAPH',
                icon: Icons.camera_alt_rounded,
                color: AppColors.cyan,
                child: _buildPhotoSection(),
              ),
              _buildFormSection(
                label: '06 — FIELD NOTES',
                icon: Icons.notes_rounded,
                color: AppColors.blue,
                child: _buildNotesField(),
              ),
              const SizedBox(height: 8),
              _buildSubmitButton(),
            ],
          ),
        ),
      ),
    );
  }

  AppBar _buildAppBar() {
    return AppBar(
      backgroundColor: AppColors.slate950,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('NEW TERRAIN REPORT', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1)),
          Text('NH-313 Dibang Valley', style: TextStyle(fontSize: 9, color: AppColors.textMuted, letterSpacing: 0.5)),
        ],
      ),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textSecond),
        onPressed: () => Navigator.pop(context),
      ),
      actions: [
        if (_isSubmitting)
          const Padding(
            padding: EdgeInsets.all(14),
            child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.cyan)),
          ),
      ],
    );
  }

  Widget _buildReporterHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.person_rounded, color: AppColors.textSecond, size: 16),
          const SizedBox(width: 8),
          Text('Reporter:', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.cyan.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: AppColors.cyan.withValues(alpha: 0.4)),
            ),
            child: Text(
              _reporterId,
              style: const TextStyle(color: AppColors.cyan, fontSize: 10, fontWeight: FontWeight.w700, fontFamily: 'monospace'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFormSection({required String label, required IconData icon, required Color color, required Widget child}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            child: Row(
              children: [
                Icon(icon, color: color, size: 14),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: TextStyle(
                    color: color,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            child: child,
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentDropdown() {
    return DropdownButtonFormField<String>(
      value: _selectedSegmentId,
      isExpanded: true,
      dropdownColor: AppColors.bgSurface,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
      iconEnabledColor: AppColors.textSecond,
      items: CorridorSegments.all.map((seg) => DropdownMenuItem(
        value: seg['id'],
        child: Text(seg['name'] ?? seg['id']!, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis),
      )).toList(),
      onChanged: (v) { if (v != null) setState(() => _selectedSegmentId = v); },
    );
  }

  Widget _buildHazardDropdown() {
    return DropdownButtonFormField<String>(
      value: _selectedHazardType,
      dropdownColor: AppColors.bgSurface,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
      iconEnabledColor: AppColors.textSecond,
      items: HazardTypes.all.map((h) => DropdownMenuItem(value: h, child: Text(h))).toList(),
      onChanged: (v) { if (v != null) setState(() => _selectedHazardType = v); },
      validator: (v) => v == null || v.isEmpty ? 'Please select a hazard type' : null,
    );
  }

  Widget _buildSeveritySelector() {
    final severities = [
      {'label': 'Observation', 'color': AppColors.blue, 'icon': Icons.info_rounded},
      {'label': 'Moderate', 'color': AppColors.amber, 'icon': Icons.report_problem_rounded},
      {'label': 'Severe', 'color': AppColors.rose, 'icon': Icons.warning_rounded},
    ];
    return Row(
      children: severities.map((s) {
        final label = s['label'] as String;
        final color = s['color'] as Color;
        final icon = s['icon'] as IconData;
        final isSelected = _selectedSeverity == label;
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _selectedSeverity = label),
            child: Container(
              margin: const EdgeInsets.only(right: 6),
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: isSelected ? color.withValues(alpha: 0.15) : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: isSelected ? color : AppColors.border, width: isSelected ? 1.5 : 1),
              ),
              child: Column(
                children: [
                  Icon(icon, color: isSelected ? color : AppColors.textMuted, size: 18),
                  const SizedBox(height: 4),
                  Text(
                    label,
                    style: TextStyle(
                      color: isSelected ? color : AppColors.textMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildGpsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_locationResult != null) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: (_locationResult!.success ? AppColors.emerald : AppColors.rose).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: (_locationResult!.success ? AppColors.emerald : AppColors.rose).withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                Icon(
                  _locationResult!.success ? Icons.location_on_rounded : Icons.location_off_rounded,
                  color: _locationResult!.success ? AppColors.emerald : AppColors.rose,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _locationResult!.displayText,
                    style: TextStyle(
                      color: _locationResult!.success ? AppColors.emerald : AppColors.rose,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ],
        GestureDetector(
          onTap: _isGettingLocation ? null : _getLocation,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.blue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.blue.withValues(alpha: 0.4)),
            ),
            child: Center(
              child: _isGettingLocation
                  ? const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.blue)),
                        SizedBox(width: 8),
                        Text('Acquiring GPS...', style: TextStyle(color: AppColors.blue, fontSize: 12, fontWeight: FontWeight.w600)),
                      ],
                    )
                  : const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.my_location_rounded, color: AppColors.blue, size: 16),
                        SizedBox(width: 8),
                        Text('Get GPS Coordinates', style: TextStyle(color: AppColors.blue, fontSize: 12, fontWeight: FontWeight.w700)),
                      ],
                    ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPhotoSection() {
    return Column(
      children: [
        if (_photoPath != null) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.file(
              File(_photoPath!),
              width: double.infinity,
              height: 180,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(height: 10),
        ],
        GestureDetector(
          onTap: _showPhotoOptions,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.cyan.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: _photoPath != null ? AppColors.cyan.withValues(alpha: 0.4) : AppColors.border,
                style: _photoPath != null ? BorderStyle.solid : BorderStyle.solid,
              ),
            ),
            child: Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(_photoPath == null ? Icons.add_a_photo_rounded : Icons.edit_rounded, color: AppColors.cyan, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    _photoPath == null ? 'Add Incident Photo' : 'Change Photo',
                    style: const TextStyle(color: AppColors.cyan, fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNotesField() {
    return TextFormField(
      controller: _notesController,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
      maxLines: 4,
      decoration: const InputDecoration(
        hintText: 'Describe conditions: debris size, road visibility, weather, approximate blockage...',
        hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 12),
      ),
      validator: (v) {
        if (v == null || v.trim().isEmpty) return 'Field notes are required';
        if (v.trim().length < 10) return 'Please provide more detail (min 10 characters)';
        return null;
      },
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : _submitReport,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.cyan,
          foregroundColor: AppColors.bgDark,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        child: _isSubmitting
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.bgDark))
            : const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.send_rounded, size: 18),
                  SizedBox(width: 10),
                  Text('SUBMIT FIELD REPORT', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                ],
              ),
      ),
    );
  }
}