import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/sync_service.dart';
import 'screens/home_screen.dart';
import 'config/app_config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize services
  await _initializeApp();
  
  runApp(const NerSanchaarFieldApp());
}

Future<void> _initializeApp() async {
  // Initialize default preferences
  final prefs = await SharedPreferences.getInstance();
  
  // Set default reporter ID if not set
  if (!prefs.containsKey(AppConfig.reporterIdKey)) {
    await prefs.setString(AppConfig.reporterIdKey, AppConfig.defaultReporterId);
  }
  
  // Set default base URL if not set
  if (!prefs.containsKey(AppConfig.baseUrlKey)) {
    await prefs.setString(AppConfig.baseUrlKey, AppConfig.defaultBaseUrl);
  }
  
  // Start automatic synchronization
  SyncService().startAutoSync();
}

class NerSanchaarFieldApp extends StatelessWidget {
  const NerSanchaarFieldApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.appName,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1976D2), // Blue theme matching dashboard
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1976D2),
          foregroundColor: Colors.white,
          elevation: 2,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1976D2),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
        cardTheme: const CardThemeData(
          elevation: 4,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
      home: const HomeScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}