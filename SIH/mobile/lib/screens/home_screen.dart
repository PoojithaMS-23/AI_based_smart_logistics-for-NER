import 'package:flutter/material.dart';
import '../models/field_report.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../config/app_config.dart';
import 'new_report_screen.dart';
import 'report_history_screen.dart';
import 'settings_screen.dart';

// Shared design constants aligned with the web dashboard palette
class AppColors {
  static const bgDark       = Color(0xFF030712);
  static const bgCard       = Color(0xFF0F172A);
  static const bgSurface    = Color(0xFF1E293B);
  static const border       = Color(0xFF334155);
  static const cyan         = Color(0xFF22D3EE);
  static const blue         = Color(0xFF3B82F6);
  static const textPrimary  = Color(0xFFF1F5F9);
  static const textSecond   = Color(0xFF94A3B8);
  static const textMuted    = Color(0xFF475569);
  static const emerald      = Color(0xFF10B981);
  static const amber        = Color(0xFFF59E0B);
  static const rose         = Color(0xFFF43F5E);
  static const slate950     = Color(0xFF020617);
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
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

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _loadData();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final counts = await _db.getReportCounts();
      final connected = await _sync.hasConnectivity();
      setState(() {
        _reportCounts = counts;
        _isConnected = connected;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _syncReports() async {
    if (_isSyncing) return;
    setState(() => _isSyncing = true);
    try {
      final result = await _sync.syncPendingReports();
      if (mounted) {
        _showToast(result.displayMessage, result.success ? 'success' : 'warning');
      }
      await _loadData();
    } catch (e) {
      if (mounted) _showToast('Sync error: ${e.toString()}', 'error');
    } finally {
      setState(() => _isSyncing = false);
    }
  }

  void _showToast(String message, String type) {
    final colors = {
      'success': AppColors.emerald,
      'warning': AppColors.amber,
      'error': AppColors.rose,
    };
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              type == 'success' ? Icons.check_circle : type == 'warning' ? Icons.warning_amber : Icons.error,
              color: colors[type],
              size: 16,
            ),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: AppColors.bgSurface,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: colors[type]!, width: 1),
        ),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: _isLoading
          ? _buildLoader()
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppColors.cyan,
              backgroundColor: AppColors.bgCard,
              child: CustomScrollView(
                slivers: [
                  _buildSliverAppBar(),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        const SizedBox(height: 16),
                        _buildConnectivityBanner(),
                        const SizedBox(height: 16),
                        _buildSectionLabel('MISSION STATUS'),
                        const SizedBox(height: 8),
                        _buildStatCards(),
                        const SizedBox(height: 20),
                        _buildSectionLabel('FIELD OPERATIONS'),
                        const SizedBox(height: 8),
                        _buildActionCards(),
                        const SizedBox(height: 20),
                        _buildSectionLabel('RECENT INCIDENTS'),
                        const SizedBox(height: 8),
                        _buildRecentReports(),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
      floatingActionButton: _buildFAB(),
    );
  }

  Widget _buildLoader() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(color: AppColors.cyan),
          SizedBox(height: 16),
          Text(
            'INITIALIZING FIELD SYSTEMS...',
            style: TextStyle(
              color: AppColors.textSecond,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar() {
    return SliverAppBar(
      expandedHeight: 140,
      pinned: true,
      backgroundColor: AppColors.slate950,
      surfaceTintColor: Colors.transparent,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF020617), Color(0xFF0C1A3A)],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.cyan.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.cyan.withValues(alpha: 0.4)),
                            ),
                            child: const Icon(Icons.shield, color: AppColors.cyan, size: 18),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'NER-SANCHAAR',
                                style: TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.8,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                decoration: BoxDecoration(
                                  color: AppColors.blue.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: AppColors.blue.withValues(alpha: 0.5)),
                                ),
                                child: const Text(
                                  'FIELD OPERATIONS · PS 26002',
                                  style: TextStyle(
                                    color: AppColors.cyan,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          AnimatedBuilder(
                            animation: _pulseAnimation,
                            builder: (context, child) => Opacity(
                              opacity: _isConnected ? _pulseAnimation.value : 1.0,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: (_isConnected ? AppColors.emerald : AppColors.amber).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: (_isConnected ? AppColors.emerald : AppColors.amber).withValues(alpha: 0.6),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      _isConnected ? Icons.wifi : Icons.wifi_off,
                                      size: 12,
                                      color: _isConnected ? AppColors.emerald : AppColors.amber,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      _isConnected ? 'LIVE' : 'OFFLINE',
                                      style: TextStyle(
                                        color: _isConnected ? AppColors.emerald : AppColors.amber,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.settings_outlined, color: AppColors.textSecond, size: 20),
                            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen())),
                            padding: EdgeInsets.zero,
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'NH-313 DIBANG VALLEY TERRAIN WATCH',
                    style: TextStyle(
                      color: AppColors.textSecond,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionLabel(String label) {
    return Text(
      label,
      style: const TextStyle(
        color: AppColors.textMuted,
        fontSize: 10,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.5,
      ),
    );
  }

  Widget _buildConnectivityBanner() {
    if (_isConnected) return const SizedBox.shrink();
    final pending = _reportCounts[SyncStatus.pending] ?? 0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.amber.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.amber.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.cloud_off, color: AppColors.amber, size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'OFFLINE MODE ACTIVE',
                  style: TextStyle(color: AppColors.amber, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                ),
                Text(
                  pending > 0 ? '$pending report(s) queued for sync' : 'Reports will sync when connection is restored',
                  style: const TextStyle(color: AppColors.textSecond, fontSize: 11),
                ),
              ],
            ),
          ),
          if (pending > 0)
            GestureDetector(
              onTap: _isSyncing ? null : _syncReports,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.amber.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.amber),
                ),
                child: _isSyncing
                    ? const SizedBox(
                        width: 14, height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.amber),
                      )
                    : const Text('SYNC', style: TextStyle(color: AppColors.amber, fontSize: 10, fontWeight: FontWeight.w800)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatCards() {
    final stats = [
      {
        'label': 'PENDING',
        'count': _reportCounts[SyncStatus.pending]!,
        'icon': Icons.schedule_rounded,
        'color': AppColors.amber,
      },
      {
        'label': 'SYNCED',
        'count': _reportCounts[SyncStatus.synced]!,
        'icon': Icons.cloud_done_rounded,
        'color': AppColors.emerald,
      },
      {
        'label': 'FAILED',
        'count': _reportCounts[SyncStatus.failed]!,
        'icon': Icons.error_rounded,
        'color': AppColors.rose,
      },
    ];
    return Row(
      children: stats.map((s) {
        final color = s['color'] as Color;
        return Expanded(
          child: Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: color.withValues(alpha: 0.25)),
            ),
            child: Column(
              children: [
                Icon(s['icon'] as IconData, color: color, size: 22),
                const SizedBox(height: 6),
                Text(
                  s['count'].toString(),
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: color,
                    height: 1,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  s['label'] as String,
                  style: TextStyle(
                    fontSize: 9,
                    color: color.withValues(alpha: 0.8),
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildActionCards() {
    return Column(
      children: [
        _buildActionTile(
          icon: Icons.add_a_photo_rounded,
          title: 'Submit Terrain Report',
          subtitle: 'Photograph & GPS-tag a hazard on NH-313',
          color: AppColors.cyan,
          onTap: _navigateToNewReport,
          isPrimary: true,
        ),
        _buildActionTile(
          icon: Icons.history_rounded,
          title: 'Report History',
          subtitle: 'View pending, synced, and failed submissions',
          color: AppColors.blue,
          onTap: _navigateToHistory,
        ),
        if (_isConnected && (_reportCounts[SyncStatus.pending]! > 0))
          _buildActionTile(
            icon: Icons.sync_rounded,
            title: 'Force Sync Now',
            subtitle: 'Push ${_reportCounts[SyncStatus.pending]} queued report(s) to HQ',
            color: AppColors.emerald,
            onTap: _syncReports,
          ),
      ],
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
    bool isPrimary = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isPrimary ? color.withValues(alpha: 0.12) : AppColors.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isPrimary ? color.withValues(alpha: 0.5) : AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isPrimary ? color : AppColors.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(color: AppColors.textSecond, fontSize: 11),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: color.withValues(alpha: 0.6), size: 18),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentReports() {
    return FutureBuilder<List<FieldReport>>(
      future: _db.getAllReports(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: AppColors.cyan));
        }
        final reports = (snapshot.data ?? []).take(3).toList();
        if (reports.isEmpty) {
          return _buildEmptyState();
        }
        return Column(
          children: [
            ...reports.map(_buildReportCard),
            const SizedBox(height: 4),
            GestureDetector(
              onTap: _navigateToHistory,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Center(
                  child: Text(
                    'VIEW ALL REPORTS  →',
                    style: TextStyle(color: AppColors.cyan, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.5),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: const Column(
        children: [
          Icon(Icons.terrain, size: 48, color: AppColors.textMuted),
          SizedBox(height: 12),
          Text(
            'No terrain reports yet',
            style: TextStyle(color: AppColors.textSecond, fontSize: 14, fontWeight: FontWeight.w600),
          ),
          SizedBox(height: 4),
          Text(
            'Tap the button below to submit your first incident',
            style: TextStyle(color: AppColors.textMuted, fontSize: 11),
          ),
        ],
      ),
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
    IconData syncIcon;
    switch (report.syncStatus) {
      case SyncStatus.synced:
        syncColor = AppColors.emerald;
        syncIcon = Icons.cloud_done;
        break;
      case SyncStatus.failed:
        syncColor = AppColors.rose;
        syncIcon = Icons.cloud_off;
        break;
      default:
        syncColor = AppColors.amber;
        syncIcon = Icons.cloud_upload;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: severityColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(severityIcon, color: severityColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  report.hazardType,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: severityColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: severityColor.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        report.severity,
                        style: TextStyle(color: severityColor, fontSize: 9, fontWeight: FontWeight.w700),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${report.timestamp.day}/${report.timestamp.month} ${report.timestamp.hour.toString().padLeft(2,'0')}:${report.timestamp.minute.toString().padLeft(2,'0')}',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Icon(syncIcon, color: syncColor, size: 16),
        ],
      ),
    );
  }

  Widget _buildFAB() {
    return FloatingActionButton.extended(
      onPressed: _navigateToNewReport,
      backgroundColor: AppColors.cyan,
      foregroundColor: AppColors.bgDark,
      icon: const Icon(Icons.add_a_photo_rounded, size: 20),
      label: const Text('NEW INCIDENT', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
    );
  }

  void _navigateToNewReport() async {
    final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const NewReportScreen()));
    if (result == true) _loadData();
  }

  void _navigateToHistory() {
    Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportHistoryScreen()));
  }
}