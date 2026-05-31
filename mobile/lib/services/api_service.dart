import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  late Dio dio;

  factory ApiService() {
    return _instance;
  }

  ApiService._internal() {
    dio = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        // Handle token refresh logic here if needed, or logout on 401
        if (e.response?.statusCode == 401) {
          // You might want to trigger a logout event here
        }
        return handler.next(e);
      },
    ));
  }

  // Auth
  Future<Response> login(String username, String password) {
    return dio.post('/auth/login/', data: {
      'username': username,
      'password': password,
    });
  }

  // Products
  Future<Response> getProducts({int page = 1, String search = '', String category = ''}) {
    return dio.get('/products/', queryParameters: {
      'page': page,
      if (search.isNotEmpty) 'search': search,
      if (category.isNotEmpty) 'category': category,
    });
  }
  
  Future<Response> getProduct(int id) {
    return dio.get('/products/$id/');
  }

  Future<Response> createProduct(Map<String, dynamic> data) {
    return dio.post('/products/', data: data);
  }

  Future<Response> updateProduct(int id, Map<String, dynamic> data) {
    return dio.put('/products/$id/', data: data);
  }

  Future<Response> deleteProduct(int id) {
    return dio.delete('/products/$id/');
  }
  // Customers
  Future<Response> getCustomers({int page = 1, String search = ''}) {
    return dio.get('/customers/', queryParameters: {
      'page': page,
      if (search.isNotEmpty) 'search': search,
    });
  }
  
  Future<Response> createCustomer(Map<String, dynamic> data) {
    return dio.post('/customers/', data: data);
  }

  Future<Response> updateCustomer(int id, Map<String, dynamic> data) {
    return dio.put('/customers/$id/', data: data);
  }

  Future<Response> deleteCustomer(int id) {
    return dio.delete('/customers/$id/');
  }
  // Categories
  Future<Response> getCategories() {
    return dio.get('/categories/');
  }

  Future<Response> createCategory(Map<String, dynamic> data) {
    return dio.post('/categories/', data: data);
  }

  Future<Response> updateCategory(int id, Map<String, dynamic> data) {
    return dio.put('/categories/$id/', data: data);
  }

  Future<Response> deleteCategory(int id) {
    return dio.delete('/categories/$id/');
  }

  // Dashboard Stats
  Future<Response> getDashboardStats() {
    return dio.get('/dashboard/stats/');
  }
  
  // Invoices
  Future<Response> getInvoices({int page = 1, String search = ''}) {
    return dio.get('/invoices/', queryParameters: {
      'page': page,
      'search': search,
    });
  }

  // Accounts
  Future<Response> getAccountsDashboard() {
    return dio.get('/accounts-dashboard/');
  }

  Future<Response> getIncomes({int page = 1}) {
    return dio.get('/incomes/', queryParameters: {'page': page});
  }

  Future<Response> getExpenses({int page = 1}) {
    return dio.get('/expenses/', queryParameters: {'page': page});
  }
}

final api = ApiService();
