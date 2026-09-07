import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/sync_service.dart';
import 'screens/home_screen.dart';
import 'config/app_config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Force dark status bar overlay to match dark theme
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
  ));

  await _initializeApp();

  runApp(const NerSanchaarFieldApp());
}

Future<void> _initializeApp() async {
  final prefs = await SharedPreferences.getInstance();
  if (!prefs.containsKey(AppConfig.reporterIdKey)) {
    await prefs.setString(AppConfig.reporterIdKey, AppConfig.defaultReporterId);
  }
  if (!prefs.containsKey(AppConfig.baseUrlKey)) {
    await prefs.setString(AppConfig.baseUrlKey, AppConfig.defaultBaseUrl);
  }
  SyncService().startAutoSync();
}

class NerSanchaarFieldApp extends StatelessWidget {
  const NerSanchaarFieldApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: _buildDarkTheme(),
      home: const HomeScreen(),
    );
  }

  ThemeData _buildDarkTheme() {
    const bgDark = Color(0xFF030712);       // near-black, matches web
    const bgCard = Color(0xFF0F172A);       // slate-900
    const bgSurface = Color(0xFF1E293B);    // slate-800
    const accentCyan = Color(0xFF22D3EE);   // cyan-400
    const accentBlue = Color(0xFF3B82F6);   // blue-500
    const borderColor = Color(0xFF334155);  // slate-700

    return ThemeData(
      brightness: Brightness.dark,
      useMaterial3: true,
      scaffoldBackgroundColor: bgDark,
      colorScheme: const ColorScheme.dark(
        primary: accentCyan,
        secondary: accentBlue,
        surface: bgCard,
        onPrimary: bgDark,
        onSurface: Color(0xFFE2E8F0),   // slate-200
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF020617), // slate-950
        foregroundColor: Color(0xFFE2E8F0),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        titleTextStyle: TextStyle(
          color: Color(0xFFF1F5F9),
          fontSize: 14,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
      cardTheme: CardThemeData(
        color: bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
          side: BorderSide(color: borderColor, width: 1),
        ),
        margin: const EdgeInsets.only(bottom: 12),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bgSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: accentCyan, width: 1.5),
        ),
        labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
        hintStyle: const TextStyle(color: Color(0xFF475569)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accentCyan,
          foregroundColor: bgDark,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 0.3),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: accentCyan,
          side: const BorderSide(color: accentCyan),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        ),
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(color: Color(0xFFF1F5F9), fontWeight: FontWeight.w800),
        titleLarge: TextStyle(color: Color(0xFFF1F5F9), fontWeight: FontWeight.w700, fontSize: 16),
        titleMedium: TextStyle(color: Color(0xFFCBD5E1), fontWeight: FontWeight.w600, fontSize: 14),
        bodyMedium: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        bodySmall: TextStyle(color: Color(0xFF64748B), fontSize: 11),
        labelLarge: TextStyle(color: Color(0xFFE2E8F0), fontWeight: FontWeight.w600),
      ),
      dividerTheme: const DividerThemeData(color: borderColor, thickness: 1),
      listTileTheme: const ListTileThemeData(
        iconColor: Color(0xFF94A3B8),
        textColor: Color(0xFFCBD5E1),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: bgSurface,
        contentTextStyle: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        behavior: SnackBarBehavior.floating,
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: accentCyan,
        unselectedLabelColor: Color(0xFF64748B),
        indicatorColor: accentCyan,
        dividerColor: borderColor,
        labelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
        unselectedLabelStyle: TextStyle(fontSize: 11),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: accentCyan,
        foregroundColor: bgDark,
        extendedTextStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
      ),
      iconTheme: const IconThemeData(color: Color(0xFF94A3B8)),
    );
  }
}