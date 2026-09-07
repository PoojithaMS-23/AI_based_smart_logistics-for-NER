import 'dart:io';
import 'package:flutter/material.dart';
import '../models/field_report.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import 'home_screen.dart' show AppColors;

class ReportHistoryScreen extends StatefulWidget {
  const ReportHistoryScreen({super.key});

  @override
  State<ReportHistoryScreen> createState() => _ReportHistoryScreenState();
}

class _ReportHistoryScreenState extends State<ReportHistoryScreen>
    with SingleTickerProviderStateMixin {
  final DatabaseService _db = DatabaseService();
  final SyncService _sync = SyncService();

  late TabController _tabController;

  List<FieldReport> _allReports = [];
  List<FieldReport> _pendingReports = [];
  List<FieldReport> _syncedReports = [];
  List<FieldReport> _failedReports = [];

  bool _isLoading = true;
  bool _isRetrying = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadReports();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadReports() async {
    setState(() => _isLoading = true);
    try {
      final all = await _db.getAllReports();
      final pending = await _db.getPendingReports();
      final synced = await _db.getSyncedReports();
      final failed = await _db.getFailedReports();
      setState(() {
        _allReports = all;
        _pendingReports = pending;
        _syncedReports = synced;
        _failedReports = failed;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _retryFailedReports() async {
    if (_isRetrying) return;
    setState(() => _isRetrying = true);
    try {
      final result = await _sync.retryFailedReports();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(result.displayMessage),
          backgroundColor: result.success ? AppColors.emerald : AppColors.amber,
        ));
      }
      await _loadReports();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Retry error: ${e.toString()}'),
          backgroundColor: AppColors.rose,
        ));
      }
    } finally {
      setState(() => _isRetrying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        backgroundColor: AppColors.slate950,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textSecond),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('INCIDENT HISTORY', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1)),
            Text('NH-313 Dibang Valley', style: TextStyle(fontSize: 9, color: AppColors.textMuted, letterSpacing: 0.5)),
          ],
        ),
        actions: [
          if (_failedReports.isNotEmpty)
            IconButton(
              icon: _isRetrying
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.amber))
                  : const Icon(Icons.refresh_rounded, color: AppColors.amber),
              onPressed: _isRetrying ? null : _retryFailedReports,
              tooltip: 'Retry Failed',
            ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: TabBar(
              controller: _tabController,
              isScrollable: false,
              indicatorColor: AppColors.cyan,
              indicatorWeight: 2,
              labelColor: AppColors.cyan,
              unselectedLabelColor: AppColors.textMuted,
              labelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5),
              unselectedLabelStyle: const TextStyle(fontSize: 10),
              tabs: [
                Tab(text: 'ALL (${_allReports.length})'),
                Tab(text: 'PENDING (${_pendingReports.length})'),
                Tab(text: 'SYNCED (${_syncedReports.length})'),
                Tab(text: 'FAILED (${_failedReports.length})'),
              ],
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.cyan))
          : RefreshIndicator(
              onRefresh: _loadReports,
              color: AppColors.cyan,
              backgroundColor: AppColors.bgCard,
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildList(_allReports),
                  _buildList(_pendingReports),
                  _buildList(_syncedReports),
                  _buildList(_failedReports),
                ],
              ),
            ),
    );
  }

  Widget _buildList(List<FieldReport> reports) {
    if (reports.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.bgCard,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(Icons.inbox_rounded, size: 40, color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            const Text(
              'No reports in this category',
              style: TextStyle(color: AppColors.textSecond, fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: reports.length,
      itemBuilder: (ctx, i) => _buildReportCard(reports[i]),
    );
  }

  Widget _buildReportCard(FieldReport report) {
    Color severityColor;
    IconData severityIcon;
    switch (report.severity) {
      case 'Severe':
        severityColor = AppColors.rose;
        severityIcon = Icons.warning_rounded;
        break;
      case 'Moderate':
        severityColor = AppColors.amber;
        severityIcon = Icons.report_problem_rounded;
        break;
      default:
        severityColor = AppColors.blue;
        severityIcon = Icons.info_rounded;
    }

    Color syncColor;
    String syncLabel;
    IconData syncIcon;
    switch (report.syncStatus) {
      case SyncStatus.synced:
        syncColor = AppColors.emerald;
        syncLabel = 'SYNCED';
        syncIcon = Icons.cloud_done_rounded;
        break;
      case SyncStatus.failed:
        syncColor = AppColors.rose;
        syncLabel = 'FAILED';
        syncIcon = Icons.cloud_off_rounded;
        break;
      default:
        syncColor = AppColors.amber;
        syncLabel = 'PENDING';
        syncIcon = Icons.cloud_upload_rounded;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: severityColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(severityIcon, color: severityColor, size: 18),
        ),
        title: Text(
          report.hazardType,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w700),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: severityColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: severityColor.withValues(alpha: 0.3)),
                ),
                child: Text(report.severity, style: TextStyle(color: severityColor, fontSize: 9, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: syncColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: syncColor.withValues(alpha: 0.3)),
                ),
                child: Row(children: [
                  Icon(syncIcon, color: syncColor, size: 10),
                  const SizedBox(width: 3),
                  Text(syncLabel, style: TextStyle(color: syncColor, fontSize: 9, fontWeight: FontWeight.w700)),
                ]),
              ),
              const SizedBox(width: 8),
              Text(_formatDate(report.timestamp), style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
            ],
          ),
        ),
        iconColor: AppColors.textMuted,
        collapsedIconColor: AppColors.textMuted,
        children: [
          const Divider(color: AppColors.border),
          const SizedBox(height: 8),
          _buildDetailRow(Icons.notes_rounded, 'Notes', report.notes),
          _buildDetailRow(Icons.location_on_rounded, 'Location', report.locationDisplay),
          _buildDetailRow(Icons.person_rounded, 'Reporter', report.reporterId),
          _buildDetailRow(Icons.route_rounded, 'Sector', report.segmentId),
          if (report.photoPath != null) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: File(report.photoPath!).existsSync()
                  ? Image.file(File(report.photoPath!), width: double.infinity, height: 160, fit: BoxFit.cover)
                  : Container(
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppColors.bgSurface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Center(
                        child: Icon(Icons.broken_image_rounded, color: AppColors.textMuted, size: 32),
                      ),
                    ),
            ),
          ],
          if (report.syncStatus == SyncStatus.failed && report.serverError != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.rose.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.rose.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_rounded, color: AppColors.rose, size: 14),
                  const SizedBox(width: 8),
                  Expanded(child: Text(report.serverError!, style: const TextStyle(color: AppColors.rose, fontSize: 11))),
                ],
              ),
            ),
          ],
          const SizedBox(height: 4),
          Text('ID: ${report.id.substring(0, 8)}...', style: const TextStyle(color: AppColors.textMuted, fontSize: 9, fontFamily: 'monospace')),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String? value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.textMuted, size: 13),
          const SizedBox(width: 8),
          SizedBox(
            width: 70,
            child: Text('$label:', style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
          ),
          Expanded(child: Text(value ?? 'N/A', style: const TextStyle(color: AppColors.textSecond, fontSize: 11))),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}