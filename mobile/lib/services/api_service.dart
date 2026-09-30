import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';

class ApiException implements Exception {
  final String message;

  ApiException(this.message);

  @override
  String toString() => message;
}

class ApiService {
  /// Dipanggil AppRoot ketika token yang tersimpan sudah tidak valid.
  VoidCallback? onSessionExpired;

  /// Mencegah callback session expired dipanggil berkali-kali
  /// ketika beberapa request mendapat 401 bersamaan.
  bool _sessionExpiredHandled = false;

  Future<Map<String, String>> _headers() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('warehouse_token');

    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Uri _uri(String path) {
    return Uri.parse('${AppConfig.apiUrl}$path');
  }

  Future<void> _handleUnauthorized() async {
    final prefs = await SharedPreferences.getInstance();

    final token = prefs.getString('warehouse_token');

    // Kalau tidak ada token, kemungkinan 401 berasal dari
    // login dengan username/password yang salah.
    // Jangan paksa AppRoot logout lagi.
    if (token == null || token.isEmpty) {
      return;
    }

    if (_sessionExpiredHandled) {
      return;
    }

    _sessionExpiredHandled = true;

    await prefs.remove('warehouse_token');
    await prefs.remove('warehouse_username');

    onSessionExpired?.call();
  }

  dynamic _decode(http.Response response) {
    dynamic body;

    try {
      body = response.body.isEmpty ? null : jsonDecode(response.body);
    } catch (_) {
      body = response.body;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = body is Map && body['message'] != null
          ? body['message'].toString()
          : body?.toString() ?? 'HTTP ${response.statusCode}';

      throw ApiException(message);
    }

    return body;
  }

  Future<dynamic> get(String path) async {
    try {
      final response = await http.get(
        _uri(path),
        headers: await _headers(),
      );

      if (response.statusCode == 401) {
        await _handleUnauthorized();
      }

      return _decode(response);
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }

      throw ApiException(
        'Network request failed. '
        'Periksa API URL, Wi-Fi, IP PC, dan firewall.',
      );
    }
  }

  Future<dynamic> post(
    String path, [
    Map<String, dynamic>? data,
  ]) async {
    try {
      final response = await http.post(
        _uri(path),
        headers: await _headers(),
        body: jsonEncode(data ?? {}),
      );

      if (response.statusCode == 401) {
        await _handleUnauthorized();
      }

      return _decode(response);
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }

      throw ApiException(
        'Network request failed. '
        'Periksa API URL, Wi-Fi, IP PC, dan firewall.',
      );
    }
  }

  Future<dynamic> put(
    String path, [
    Map<String, dynamic>? data,
  ]) async {
    try {
      final response = await http.put(
        _uri(path),
        headers: await _headers(),
        body: jsonEncode(data ?? {}),
      );

      if (response.statusCode == 401) {
        await _handleUnauthorized();
      }

      return _decode(response);
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }

      throw ApiException(
        'Network request failed. '
        'Periksa API URL, Wi-Fi, IP PC, dan firewall.',
      );
    }
  }

  Future<dynamic> delete(
    String path, [
    Map<String, dynamic>? data,
  ]) async {
    try {
      final response = await http.delete(
        _uri(path),
        headers: await _headers(),
        body: jsonEncode(data ?? {}),
      );

      if (response.statusCode == 401) {
        await _handleUnauthorized();
      }

      return _decode(response);
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }

      throw ApiException(
        'Network request failed. '
        'Periksa API URL, Wi-Fi, IP PC, dan firewall.',
      );
    }
  }

  /// Dipanggil setelah login berhasil supaya instance ApiService
  /// bisa kembali menangani session berikutnya.
  void resetSessionState() {
    _sessionExpiredHandled = false;
  }
}
