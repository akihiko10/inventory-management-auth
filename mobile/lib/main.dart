import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'services/api_service.dart';
import 'screens/login_screen.dart';
import 'screens/app_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(const WarehouseMobileApp());
}

class WarehouseMobileApp extends StatelessWidget {
  const WarehouseMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Warehouse Management',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F64A3),
        ),
        scaffoldBackgroundColor: const Color(0xFFF5F7FC),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFF5F7FC),
          elevation: 0,
          surfaceTintColor: Colors.transparent,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(
              color: Color(0xFFD9DDE8),
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(
              color: Color(0xFF4F64A3),
              width: 2,
            ),
          ),
        ),
      ),
      home: const AppRoot(),
    );
  }
}

class AppRoot extends StatefulWidget {
  const AppRoot({super.key});

  @override
  State<AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<AppRoot> {
  late final ApiService api;

  String? username;

  bool loading = true;

  @override
  void initState() {
    super.initState();

    // Buat satu instance ApiService untuk seluruh aplikasi.
    api = ApiService();

    // Jika API mengembalikan HTTP 401,
    // ApiService akan memanggil fungsi ini.
    api.onSessionExpired = _handleSessionExpired;

    _checkLogin();
  }

  /// Mengecek apakah user masih memiliki session tersimpan.
  ///
  /// Kita tidak hanya mengecek username.
  /// Token juga harus ada karena token yang digunakan
  /// untuk Authorization ke backend.
  Future<void> _checkLogin() async {
    final prefs = await SharedPreferences.getInstance();

    final savedUsername = prefs.getString('warehouse_username');
    final savedToken = prefs.getString('warehouse_token');

    if (!mounted) return;

    // Jika username atau token tidak ada,
    // user dianggap belum login.
    if (savedUsername == null ||
        savedUsername.trim().isEmpty ||
        savedToken == null ||
        savedToken.trim().isEmpty) {
      await prefs.remove('warehouse_username');
      await prefs.remove('warehouse_token');

      api.resetSessionState();

      setState(() {
        username = null;
        loading = false;
      });

      return;
    }

    setState(() {
      username = savedUsername;
      loading = false;
    });
  }

  /// Dipanggil LoginScreen setelah login berhasil.
  Future<void> _login(String name) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(
      'warehouse_username',
      name,
    );

    // Reset status session expired.
    api.resetSessionState();

    if (!mounted) return;

    setState(() {
      username = name;
    });
  }

  /// Logout manual dari aplikasi.
  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.remove('warehouse_token');
    await prefs.remove('warehouse_username');

    api.resetSessionState();

    if (!mounted) return;

    setState(() {
      username = null;
    });
  }

  /// Dipanggil otomatis ketika backend mengembalikan HTTP 401.
  ///
  /// Contoh:
  /// - token expired
  /// - token invalid
  /// - session tidak berlaku
  /// - token dihapus/ditolak backend
  Future<void> _handleSessionExpired() async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.remove('warehouse_token');
    await prefs.remove('warehouse_username');

    if (!mounted) return;

    setState(() {
      username = null;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Sesi login tidak valid atau sudah berakhir. Silakan login kembali.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Saat aplikasi sedang mengecek SharedPreferences.
    if (loading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    // Belum login / session expired.
    //
    // Ini akan menampilkan:
    // Username
    // Password
    // Tombol Login
    if (username == null) {
      return LoginScreen(
        api: api,
        onLoggedIn: _login,
      );
    }

    // Sudah login.
    return AppShell(
      api: api,
      username: username!,
      onLogout: _logout,
    );
  }
}
