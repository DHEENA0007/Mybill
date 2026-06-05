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
        if (e.response?.statusCode == 401) {
          // Try to refresh the token
          final prefs = await SharedPreferences.getInstance();
          final refresh = prefs.getString('refresh_token');
          if (refresh != null) {
            try {
              final refreshDio = Dio(BaseOptions(baseUrl: AppConfig.baseUrl));
              final res = await refreshDio.post('/auth/refresh/', data: {'refresh': refresh});
              final newAccess = res.data['access'];
              await prefs.setString('access_token', newAccess);
              // Retry original request
              e.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
              final retryRes = await dio.fetch(e.requestOptions);
              return handler.resolve(retryRes);
            } catch (_) {
              await prefs.remove('access_token');
              await prefs.remove('refresh_token');
            }
          }
        }
        return handler.next(e);
      },
    ));
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  Future<Response> login(String username, String password) {
    return dio.post('/auth/login/', data: {
      'username': username,
      'password': password,
    });
  }

  Future<Response> getMe() {
    return dio.get('/users/me/');
  }

  // ── Dashboard ────────────────────────────────────────────────────────
  Future<Response> getDashboardStats() {
    return dio.get('/dashboard/stats/');
  }

  // ── Products ─────────────────────────────────────────────────────────
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

  Future<Response> getLowStock() {
    return dio.get('/products/low_stock_alert/');
  }

  Future<Response> adjustStock(int id, Map<String, dynamic> data) {
    return dio.post('/products/$id/adjust_stock/', data: data);
  }

  // ── Categories ───────────────────────────────────────────────────────
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

  // ── Customers ────────────────────────────────────────────────────────
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

  // ── Suppliers ────────────────────────────────────────────────────────
  Future<Response> getSuppliers({int page = 1, String search = ''}) {
    return dio.get('/suppliers/', queryParameters: {
      'page': page,
      if (search.isNotEmpty) 'search': search,
    });
  }

  Future<Response> createSupplier(Map<String, dynamic> data) {
    return dio.post('/suppliers/', data: data);
  }

  Future<Response> updateSupplier(int id, Map<String, dynamic> data) {
    return dio.put('/suppliers/$id/', data: data);
  }

  Future<Response> deleteSupplier(int id) {
    return dio.delete('/suppliers/$id/');
  }

  // ── Invoices ─────────────────────────────────────────────────────────
  Future<Response> getInvoices({int page = 1, String search = '', String status = ''}) {
    return dio.get('/invoices/', queryParameters: {
      'page': page,
      if (search.isNotEmpty) 'search': search,
      if (status.isNotEmpty) 'status': status,
    });
  }

  Future<Response> getInvoice(int id) {
    return dio.get('/invoices/$id/');
  }

  Future<Response> createInvoice(Map<String, dynamic> data) {
    return dio.post('/invoices/', data: data);
  }

  Future<Response> cancelInvoice(int id) {
    return dio.post('/invoices/$id/cancel/');
  }

  Future<Response> recordPayment(int id, Map<String, dynamic> data) {
    return dio.post('/invoices/$id/record_payment/', data: data);
  }

  // ── Purchases ────────────────────────────────────────────────────────
  Future<Response> getPurchases({int page = 1, String search = ''}) {
    return dio.get('/purchases/', queryParameters: {
      'page': page,
      if (search.isNotEmpty) 'search': search,
    });
  }

  Future<Response> getPurchase(int id) {
    return dio.get('/purchases/$id/');
  }

  Future<Response> createPurchase(Map<String, dynamic> data) {
    return dio.post('/purchases/', data: data);
  }

  // ── Accounts: Dashboard ──────────────────────────────────────────────
  Future<Response> getAccountsDashboard() {
    return dio.get('/accounts-dashboard/');
  }

  // ── Accounts: Income Types ───────────────────────────────────────────
  Future<Response> getIncomeTypes() {
    return dio.get('/income-types/');
  }

  Future<Response> createIncomeType(Map<String, dynamic> data) {
    return dio.post('/income-types/', data: data);
  }

  Future<Response> deleteIncomeType(int id) {
    return dio.delete('/income-types/$id/');
  }

  // ── Accounts: Incomes ────────────────────────────────────────────────
  Future<Response> getIncomes({int page = 1, String? incomeType, String? dateFrom, String? dateTo}) {
    return dio.get('/incomes/', queryParameters: {
      'page': page,
      if (incomeType != null) 'income_type': incomeType,
      if (dateFrom != null) 'date_from': dateFrom,
      if (dateTo != null) 'date_to': dateTo,
    });
  }

  Future<Response> createIncome(Map<String, dynamic> data) {
    return dio.post('/incomes/', data: data);
  }

  Future<Response> updateIncome(int id, Map<String, dynamic> data) {
    return dio.put('/incomes/$id/', data: data);
  }

  Future<Response> deleteIncome(int id) {
    return dio.delete('/incomes/$id/');
  }

  // ── Accounts: Expense Categories ─────────────────────────────────────
  Future<Response> getExpenseCategories() {
    return dio.get('/expense-categories/');
  }

  Future<Response> createExpenseCategory(Map<String, dynamic> data) {
    return dio.post('/expense-categories/', data: data);
  }

  Future<Response> deleteExpenseCategory(int id) {
    return dio.delete('/expense-categories/$id/');
  }

  // ── Accounts: Expense Subcategories ──────────────────────────────────
  Future<Response> getExpenseSubcategories({String? category}) {
    return dio.get('/expense-subcategories/', queryParameters: {
      if (category != null) 'category': category,
    });
  }

  Future<Response> createExpenseSubcategory(Map<String, dynamic> data) {
    return dio.post('/expense-subcategories/', data: data);
  }

  Future<Response> deleteExpenseSubcategory(int id) {
    return dio.delete('/expense-subcategories/$id/');
  }

  // ── Accounts: Expenses ───────────────────────────────────────────────
  Future<Response> getExpenses({int page = 1, String? category, String? subcategory, String? dateFrom, String? dateTo}) {
    return dio.get('/expenses/', queryParameters: {
      'page': page,
      if (category != null) 'category': category,
      if (subcategory != null) 'subcategory': subcategory,
      if (dateFrom != null) 'date_from': dateFrom,
      if (dateTo != null) 'date_to': dateTo,
    });
  }

  Future<Response> createExpense(Map<String, dynamic> data) {
    return dio.post('/expenses/', data: data);
  }

  Future<Response> updateExpense(int id, Map<String, dynamic> data) {
    return dio.put('/expenses/$id/', data: data);
  }

  Future<Response> deleteExpense(int id) {
    return dio.delete('/expenses/$id/');
  }

  // ── Reports ──────────────────────────────────────────────────────────
  Future<Response> getSalesReport({String? dateFrom, String? dateTo}) {
    return dio.get('/reports/sales/', queryParameters: {
      if (dateFrom != null) 'date_from': dateFrom,
      if (dateTo != null) 'date_to': dateTo,
    });
  }

  Future<Response> getInventoryReport() {
    return dio.get('/reports/inventory/');
  }

  Future<Response> getFinancialReport({String? dateFrom, String? dateTo}) {
    return dio.get('/reports/financial/', queryParameters: {
      if (dateFrom != null) 'date_from': dateFrom,
      if (dateTo != null) 'date_to': dateTo,
    });
  }

  // ── Credit Logs ──────────────────────────────────────────────────────
  Future<Response> getCreditLogs({int page = 1}) {
    return dio.get('/credit-logs/', queryParameters: {'page': page});
  }

  // ── Users ────────────────────────────────────────────────────────────
  Future<Response> getUsers() {
    return dio.get('/users/');
  }

  Future<Response> createUser(Map<String, dynamic> data) {
    return dio.post('/users/', data: data);
  }

  Future<Response> updateUser(int id, Map<String, dynamic> data) {
    return dio.put('/users/$id/', data: data);
  }

  // ── Roles ────────────────────────────────────────────────────────────
  Future<Response> getRoles() {
    return dio.get('/roles/');
  }

  // ── Company Setup ────────────────────────────────────────────────────
  Future<Response> getCompanySetup() {
    return dio.get('/company-setup/');
  }

  Future<Response> updateCompanySetup(Map<String, dynamic> data) {
    return dio.post('/company-setup/', data: data);
  }
}

final api = ApiService();
