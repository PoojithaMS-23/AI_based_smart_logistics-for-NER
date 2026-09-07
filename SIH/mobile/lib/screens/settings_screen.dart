import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../services/sync_service.dart';
import '../services/database_service.dart';
import 'home_screen.dart' show AppColors;

/// Settings and configuration screen
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _baseUrlController = TextEditingController();
  final _reporterIdController = TextEditingController();
  
  final SyncService _sync = SyncService();
  final DatabaseService _db = DatabaseService();
  
  bool _isNetworkSimulationOffline = false;
  bool _isLoading = true;
  bool _isTesting = false;
  String? _connectionTestResult;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    _baseUrlController.dispose();
    _reporterIdController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      
      final baseUrl = prefs.getString(AppConfig.baseUrlKey) ?? AppConfig.defaultBaseUrl;
      final reporterId = prefs.getString(AppConfig.reporterIdKey) ?? AppConfig.defaultReporterId;
      final networkSimulation = await _sync.isNetworkSimulationOffline();
      
      setState(() {
        _baseUrlController.text = baseUrl;
        _reporterIdController.text = reporterId;
        _isNetworkSimulationOffline = networkSimulation;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading settings: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _saveSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Save base URL
      await prefs.setString(AppConfig.baseUrlKey, _baseUrlController.text.trim());
      await _sync.setBaseUrl(_baseUrlController.text.trim());
      
      // Save reporter ID
      await prefs.setString(AppConfig.reporterIdKey, _reporterIdController.text.trim());
      
      // Save network simulation
      await _sync.setNetworkSimulation(_isNetworkSimulationOffline);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Settings saved successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving settings: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _testConnection() async {
    setState(() {
      _isTesting = true;
      _connectionTestResult = null;
    });

    try {
      // Temporarily save the base URL for testing
      await _sync.setBaseUrl(_baseUrlController.text.trim());
      
      final isConnected = await _sync.hasConnectivity();
      
      setState(() {
        _connectionTestResult = isConnected 
            ? 'Connection successful!' 
            : 'Connection failed. Check the URL and network.';
      });
    } catch (e) {
      setState(() {
        _connectionTestResult = 'Connection error: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isTesting = false;
      });
    }
  }

  Future<void> _showResetConfirmation() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Reset All Data'),
          content: const Text(
            'This will delete all local reports and reset settings to defaults. '
            'Synced reports on the server will not be affected.\n\n'
            'Are you sure you want to continue?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Reset All'),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      await _resetAllData();
    }
  }

  Future<void> _resetAllData() async {
    try {
      // Close and reset database
      await _db.close();
      
      // Clear shared preferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      
      // Reinitialize with defaults
      await prefs.setString(AppConfig.baseUrlKey, AppConfig.defaultBaseUrl);
      await prefs.setString(AppConfig.reporterIdKey, AppConfig.defaultReporterId);
      
      // Reload settings
      await _loadSettings();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('All data has been reset'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error resetting data: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
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
            Text('SYSTEM SETTINGS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1)),
            Text('Field Configuration', style: TextStyle(fontSize: 9, color: AppColors.textMuted, letterSpacing: 0.5)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: _saveSettings,
            child: const Text(
              'SAVE',
              style: TextStyle(color: AppColors.cyan, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 0.5),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.cyan))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // API Configuration
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'API Configuration',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        
                        // Base URL
                        TextField(
                          controller: _baseUrlController,
                          decoration: const InputDecoration(
                            labelText: 'Backend Base URL',
                            hintText: 'http://10.0.2.2:8000',
                            border: OutlineInputBorder(),
                            helperText: 'Use 10.0.2.2 for Android emulator, or your computer\'s IP for physical device',
                          ),
                          keyboardType: TextInputType.url,
                        ),
                        
                        const SizedBox(height: 16),
                        
                        // Test Connection
                        Row(
                          children: [
                            ElevatedButton.icon(
                              onPressed: _isTesting ? null : _testConnection,
                              icon: _isTesting
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : const Icon(Icons.wifi_find),
                              label: Text(_isTesting ? 'Testing...' : 'Test Connection'),
                            ),
                            if (_connectionTestResult != null) ...[
                              const SizedBox(width: 16),
                              Expanded(
                                child: Text(
                                  _connectionTestResult!,
                                  style: TextStyle(
                                    color: _connectionTestResult!.contains('successful') 
                                        ? Colors.green 
                                        : Colors.red,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Reporter Information
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Reporter Information',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _reporterIdController,
                          decoration: const InputDecoration(
                            labelText: 'Reporter ID',
                            hintText: 'FIELD-MOBILE-001',
                            border: OutlineInputBorder(),
                            helperText: 'Unique identifier for field reports',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Network Simulation (Demo/Testing)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Demo & Testing',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        SwitchListTile(
                          title: const Text('Simulate Offline Mode'),
                          subtitle: const Text('Force offline behavior for testing'),
                          value: _isNetworkSimulationOffline,
                          onChanged: (bool value) {
                            setState(() {
                              _isNetworkSimulationOffline = value;
                            });
                          },
                          contentPadding: EdgeInsets.zero,
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // App Information
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Application Info',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        _buildInfoRow('App Name', AppConfig.appName),
                        _buildInfoRow('Version', AppConfig.appVersion),
                        _buildInfoRow('Database', AppConfig.databaseName),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Danger Zone
                Card(
                  color: Colors.red[50],
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Danger Zone',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.red[800],
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'These actions cannot be undone. Use with caution.',
                          style: TextStyle(color: Colors.red),
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: _showResetConfirmation,
                          icon: const Icon(Icons.delete_forever, color: Colors.red),
                          label: const Text(
                            'Reset All Data',
                            style: TextStyle(color: Colors.red),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.red),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 32),
              ],
            ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
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
          Text(value),
        ],
      ),
    );
  }
}