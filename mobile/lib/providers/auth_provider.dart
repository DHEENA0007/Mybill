import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import 'package:dio/dio.dart';

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;
  bool _isLoading = true;

  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;

  AuthProvider() {
    checkAuth();
  }

  Future<void> checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    
    if (token != null) {
      _isAuthenticated = true;
      // In a real app, you might want to fetch user profile again
      // or store user data in SharedPreferences on login
      final userDataStr = prefs.getString('user_data');
      if (userDataStr != null) {
        // Parse JSON (needs dart:convert)
        // _user = jsonDecode(userDataStr);
      }
    } else {
      _isAuthenticated = false;
    }
    
    _isLoading = false;
    notifyListeners();
  }

  Future<void> login(String username, String password) async {
    try {
      final response = await api.login(username, password);
      final data = response.data;
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('access_token', data['access']);
      await prefs.setString('refresh_token', data['refresh']);
      
      _user = data['user'];
      _isAuthenticated = true;
      notifyListeners();
    } on DioException catch (e) {
      throw e.response?.data['detail'] ?? 'Login failed';
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    await prefs.remove('user_data');
    
    _isAuthenticated = false;
    _user = null;
    notifyListeners();
  }
}
