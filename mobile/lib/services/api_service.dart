import 'dart:convert';
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
  Future<Map<String, String>> _headers() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('warehouse_token');
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Uri _uri(String path) => Uri.parse('${AppConfig.apiUrl}$path');

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
      final r = await http.get(_uri(path), headers: await _headers());
      return _decode(r);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network request failed. Periksa API URL, Wi-Fi, IP PC, dan firewall.');
    }
  }

  Future<dynamic> post(String path, [Map<String, dynamic>? data]) async {
    try {
      final r = await http.post(_uri(path), headers: await _headers(), body: jsonEncode(data ?? {}));
      return _decode(r);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network request failed. Periksa API URL, Wi-Fi, IP PC, dan firewall.');
    }
  }

  Future<dynamic> put(String path, [Map<String, dynamic>? data]) async {
    try {
      final r = await http.put(_uri(path), headers: await _headers(), body: jsonEncode(data ?? {}));
      return _decode(r);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network request failed. Periksa API URL, Wi-Fi, IP PC, dan firewall.');
    }
  }

  Future<dynamic> delete(String path, [Map<String, dynamic>? data]) async {
    try {
      final r = await http.delete(_uri(path), headers: await _headers(), body: jsonEncode(data ?? {}));
      return _decode(r);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network request failed. Periksa API URL, Wi-Fi, IP PC, dan firewall.');
    }
  }
}
