import 'dart:io';
import 'package:flutter/material.dart';
import '../models/field_report.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

/// Screen showing history of all field reports
class ReportHistoryScreen extends StatefulWidget {
  const ReportHistoryScreen({super.key});

  @override
  State<ReportHistoryScreen> createState() => _ReportHistoryScreenState();
}

class _ReportHistoryScreenState extends State<ReportHistoryScreen> with SingleTickerProviderStateMixin {
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
    setState(() {
      _isLoading = true;
    });

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
      setState(() {
        _isLoading = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading reports: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _retryFailedReports() async {
    if (_isRetrying) return;
    
    setState(() {
      _isRetrying = true;
    });

    try {
      final result = await _sync.retryFailedReports();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.displayMessage),
            backgroundColor: result.success ? Colors.green : Colors.orange,
          ),
        );
      }
      
      // Reload reports to reflect changes
      await _loadReports();
      
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Retry error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _isRetrying = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report History'),
        actions: [
          if (_failedReports.isNotEmpty)
            IconButton(
              icon: _isRetrying
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(Icons.refresh),
              onPressed: _isRetrying ? null : _retryFailedReports,
              tooltip: 'Retry Failed Reports',
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: [
            Tab(
              text: 'All (${_allReports.length})',
              icon: const Icon(Icons.list, size: 20),
            ),
            Tab(
              text: 'Pending (${_pendingReports.length})',
              icon: const Icon(Icons.schedule, size: 20),
            ),
            Tab(
              text: 'Synced (${_syncedReports.length})',
              icon: const Icon(Icons.cloud_done, size: 20),
            ),
            Tab(
              text: 'Failed (${_failedReports.length})',
              icon: const Icon(Icons.error, size: 20),
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadReports,
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildReportsList(_allReports),
                  _buildReportsList(_pendingReports),
                  _buildReportsList(_syncedReports),
                  _buildReportsList(_failedReports),
                ],
              ),
            ),
    );
  }

  Widget _buildReportsList(List<FieldReport> reports) {
    if (reports.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No reports in this category',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: reports.length,
      itemBuilder: (context, index) {
        return _buildReportCard(reports[index]);
      },
    );
  }

  Widget _buildReportCard(FieldReport report) {
    Color statusColor;
    IconData statusIcon;
    
    switch (report.syncStatus) {
      case SyncStatus.synced:
        statusColor = Colors.green;
        statusIcon = Icons.cloud_done;
        break;
      case SyncStatus.failed:
        statusColor = Colors.red;
        statusIcon = Icons.error;
        break;
      default:
        statusColor = Colors.orange;
        statusIcon = Icons.schedule;
    }

    Color severityColor;
    switch (report.severity) {
      case 'Severe':
        severityColor = Colors.red;
        break;
      case 'Moderate':
        severityColor = Colors.orange;
        break;
      default:
        severityColor = Colors.blue;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: ExpansionTile(
        leading: Icon(
          Icons.report_problem,
          color: severityColor,
          size: 32,
        ),
        title: Text(
          report.hazardType,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: severityColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: severityColor.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    report.severity,
                    style: TextStyle(
                      color: severityColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Icon(statusIcon, color: statusColor, size: 16),
                const SizedBox(width: 4),
                Text(
                  report.statusDisplay,
                  style: TextStyle(color: statusColor, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Created: ${_formatDateTime(report.timestamp)}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Notes
                _buildDetailRow('Notes', report.notes),
                const SizedBox(height: 12),
                
                // Location
                _buildDetailRow('Location', report.locationDisplay),
                const SizedBox(height: 12),
                
                // Reporter
                _buildDetailRow('Reporter', report.reporterId),
                const SizedBox(height: 12),
                
                // Photo
                if (report.photoPath != null) ...[
                  _buildDetailRow('Photo', null),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    height: 200,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey[300]!),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: File(report.photoPath!).existsSync()
                          ? Image.file(
                              File(report.photoPath!),
                              fit: BoxFit.cover,
                            )
                          : const Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.broken_image, size: 48, color: Colors.grey),
                                  SizedBox(height: 8),
                                  Text('Photo not found', style: TextStyle(color: Colors.grey)),
                                ],
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                
                // Sync Status
                if (report.syncStatus == SyncStatus.failed && report.serverError != null) ...[
                  _buildDetailRow('Error', report.serverError!),
                  const SizedBox(height: 12),
                ],
                
                // Report ID
                _buildDetailRow('Report ID', report.id),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String? value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 80,
          child: Text(
            '$label:',
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              color: Colors.grey,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value ?? 'N/A',
            style: const TextStyle(fontSize: 14),
          ),
        ),
      ],
    );
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} '
           '${dateTime.hour.toString().padLeft(2, '0')}:'
           '${dateTime.minute.toString().padLeft(2, '0')}';
  }
}