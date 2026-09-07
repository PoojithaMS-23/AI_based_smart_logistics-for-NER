import 'package:flutter/material.dart';
import '../models/field_report.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../config/app_config.dart';
import 'new_report_screen.dart';
import 'report_history_screen.dart';
import 'settings_screen.dart';

/// Home screen with main navigation and status overview
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final DatabaseService _db = DatabaseService();
  final SyncService _sync = SyncService();
  
  Map<SyncStatus, int> _reportCounts = {
    SyncStatus.pending: 0,
    SyncStatus.synced: 0,
    SyncStatus.failed: 0,
  };
  
  bool _isConnected = false;
  bool _isLoading = true;
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Load report counts
      final counts = await _db.getReportCounts();
      
      // Check connectivity
      final connected = await _sync.hasConnectivity();
      
      setState(() {
        _reportCounts = counts;
        _isConnected = connected;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading data: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _syncReports() async {
    if (_isSyncing) return;
    
    setState(() {
      _isSyncing = true;
    });

    try {
      final result = await _sync.syncPendingReports();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.displayMessage),
            backgroundColor: result.success ? Colors.green : Colors.orange,
          ),
        );
      }
      
      // Reload data to reflect changes
      await _loadData();
      
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sync error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _isSyncing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(AppConfig.appName),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => _navigateToSettings(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildConnectionStatus(),
                  const SizedBox(height: 16),
                  _buildReportSummary(),
                  const SizedBox(height: 24),
                  _buildQuickActions(),
                  const SizedBox(height: 24),
                  _buildRecentReports(),
                ],
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _navigateToNewReport(),
        icon: const Icon(Icons.add_a_photo),
        label: const Text('New Report'),
      ),
    );
  }

  Widget _buildConnectionStatus() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              _isConnected ? Icons.cloud_done : Icons.cloud_off,
              color: _isConnected ? Colors.green : Colors.orange,
              size: 32,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _isConnected ? 'Connected' : 'Offline Mode',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    _isConnected 
                        ? 'Reports will sync automatically'
                        : 'Reports saved locally for later sync',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            if (!_isConnected && _reportCounts[SyncStatus.pending]! > 0)
              ElevatedButton(
                onPressed: _isSyncing ? null : _syncReports,
                child: _isSyncing 
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Retry Sync'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildReportSummary() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Report Summary',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildCountCard(
                    'Pending',
                    _reportCounts[SyncStatus.pending]!,
                    Colors.orange,
                    Icons.schedule,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildCountCard(
                    'Synced',
                    _reportCounts[SyncStatus.synced]!,
                    Colors.green,
                    Icons.cloud_done,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildCountCard(
                    'Failed',
                    _reportCounts[SyncStatus.failed]!,
                    Colors.red,
                    Icons.error,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCountCard(String label, int count, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 4),
          Text(
            count.toString(),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () => _navigateToNewReport(),
                icon: const Icon(Icons.add_a_photo),
                label: const Text('New Report'),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => _navigateToHistory(),
                icon: const Icon(Icons.history),
                label: const Text('View History'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRecentReports() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Reports',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => _navigateToHistory(),
          child: const Text('View All →'),
        ),
        const SizedBox(height: 8),
        FutureBuilder<List<FieldReport>>(
          future: _db.getAllReports(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            
            if (snapshot.hasError) {
              return Center(
                child: Text('Error: ${snapshot.error}'),
              );
            }
            
            final reports = snapshot.data ?? [];
            if (reports.isEmpty) {
              return const Card(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(
                    child: Text('No reports yet. Tap "New Report" to get started.'),
                  ),
                ),
              );
            }
            
            // Show only the 3 most recent reports
            final recentReports = reports.take(3).toList();
            
            return Column(
              children: recentReports.map((report) => _buildReportCard(report)).toList(),
            );
          },
        ),
      ],
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

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          Icons.report_problem,
          color: report.severity == 'Severe' ? Colors.red : Colors.orange,
        ),
        title: Text(report.hazardType),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Severity: ${report.severity}'),
            Text(
              'Created: ${report.timestamp.toString().split('.')[0]}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        trailing: Icon(statusIcon, color: statusColor, size: 20),
        isThreeLine: true,
      ),
    );
  }

  void _navigateToNewReport() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const NewReportScreen()),
    );
    
    if (result == true) {
      // Reload data if a new report was created
      _loadData();
    }
  }

  void _navigateToHistory() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const ReportHistoryScreen()),
    );
  }

  void _navigateToSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SettingsScreen()),
    );
  }
}