import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';
import 'product_form.dart';
import 'package:dio/dio.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  
  List<dynamic> _products = [];
  List<dynamic> _categories = [];
  
  bool _isLoading = true;
  String _searchQuery = '';
  String? _selectedCategory;
  
  int _currentPage = 1;
  int _totalPages = 1;
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    _fetchCategories();
    _fetchProducts();
  }

  Future<void> _fetchCategories() async {
    try {
      final response = await api.getCategories();
      setState(() {
        _categories = response.data['results'] ?? response.data;
      });
    } catch (e) {
      // Ignored intentionally, will just show "All Categories"
    }
  }

  Future<void> _fetchProducts({bool resetPage = true}) async {
    if (resetPage) {
      setState(() {
        _currentPage = 1;
        _isLoading = true;
      });
    } else {
      setState(() => _isLoadingMore = true);
    }
    
    try {
      final response = await api.getProducts(
        search: _searchQuery, 
        category: _selectedCategory ?? '',
        page: _currentPage,
      );
      
      final newProducts = response.data['results'] ?? [];
      final count = response.data['count'] ?? 0;
      
      setState(() {
        if (resetPage) {
          _products = newProducts;
        } else {
          _products.addAll(newProducts);
        }
        _totalPages = (count / 20).ceil(); // Assuming page_size=20 in backend
        _isLoading = false;
        _isLoadingMore = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _isLoadingMore = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load products')),
        );
      }
    }
  }
  
  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      setState(() => _searchQuery = query);
      _fetchProducts();
    });
  }

  Future<void> _deleteProduct(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Product'),
        content: const Text('Are you sure you want to delete this product? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppTheme.danger),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await api.deleteProduct(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Product deleted successfully'), backgroundColor: AppTheme.success),
        );
        _fetchProducts();
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.response?.data?.toString() ?? 'Failed to delete product'), backgroundColor: AppTheme.danger),
        );
      }
    }
  }

  void _navigateToForm([Map<String, dynamic>? product]) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductFormScreen(
          product: product,
          categories: _categories,
        ),
      ),
    );
    
    if (result == true) {
      _fetchProducts(); // Refresh list if product was saved
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _navigateToForm(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filters
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search products...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                              _fetchProducts();
                            },
                          )
                        : null,
                  ),
                  onChanged: _onSearchChanged,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String?>(
                  value: _selectedCategory,
                  decoration: const InputDecoration(
                    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  ),
                  hint: const Text('All Categories'),
                  items: [
                    const DropdownMenuItem<String?>(
                      value: null,
                      child: Text('All Categories'),
                    ),
                    ..._categories.map((c) => DropdownMenuItem<String?>(
                      value: c['id'].toString(),
                      child: Text(c['name']),
                    )),
                  ],
                  onChanged: (v) {
                    setState(() => _selectedCategory = v);
                    _fetchProducts();
                  },
                ),
              ],
            ),
          ),
          
          // Products List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _products.isEmpty
                    ? const Center(
                        child: Text(
                          'No products found',
                          style: TextStyle(color: AppTheme.textSecondary),
                        ),
                      )
                    : NotificationListener<ScrollNotification>(
                        onNotification: (ScrollNotification scrollInfo) {
                          if (!_isLoadingMore &&
                              _currentPage < _totalPages &&
                              scrollInfo.metrics.pixels == scrollInfo.metrics.maxScrollExtent) {
                            setState(() => _currentPage++);
                            _fetchProducts(resetPage: false);
                            return true;
                          }
                          return false;
                        },
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16.0),
                          itemCount: _products.length + (_isLoadingMore ? 1 : 0),
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            if (index == _products.length) {
                              return const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator()));
                            }
                            
                            final product = _products[index];
                            final stock = product['current_stock'] ?? 0;
                            final minStock = product['min_stock_level'] ?? 0;
                            final isLowStock = stock <= minStock;
                            final isActive = product['is_active'] == true;

                            return Card(
                              child: InkWell(
                                onTap: () => _navigateToForm(product),
                                borderRadius: BorderRadius.circular(16),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        width: 48,
                                        height: 48,
                                        decoration: BoxDecoration(
                                          color: isActive 
                                              ? AppTheme.primary.withOpacity(0.1)
                                              : AppTheme.textSecondary.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Icon(
                                          Icons.inventory_2,
                                          color: isActive ? AppTheme.primary : AppTheme.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    product['name'] ?? 'Unknown',
                                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                Text(
                                                  '₹${product['selling_price']}',
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    color: AppTheme.primary,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              'SKU: ${product['sku']} • ${product['category_name'] ?? 'Uncategorized'}',
                                              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                            ),
                                            const SizedBox(height: 12),
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                  decoration: BoxDecoration(
                                                    color: isLowStock
                                                        ? AppTheme.danger.withOpacity(0.1)
                                                        : AppTheme.success.withOpacity(0.1),
                                                    borderRadius: BorderRadius.circular(8),
                                                  ),
                                                  child: Text(
                                                    'Stock: $stock',
                                                    style: TextStyle(
                                                      fontSize: 12,
                                                      fontWeight: FontWeight.bold,
                                                      color: isLowStock ? AppTheme.danger : AppTheme.success,
                                                    ),
                                                  ),
                                                ),
                                                Row(
                                                  children: [
                                                    if (!isActive)
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                        margin: const EdgeInsets.only(right: 8),
                                                        decoration: BoxDecoration(
                                                          color: Colors.grey.withOpacity(0.1),
                                                          borderRadius: BorderRadius.circular(8),
                                                        ),
                                                        child: const Text('Inactive', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                                      ),
                                                    IconButton(
                                                      icon: const Icon(Icons.delete_outline, size: 20, color: AppTheme.danger),
                                                      padding: EdgeInsets.zero,
                                                      constraints: const BoxConstraints(),
                                                      onPressed: () => _deleteProduct(product['id']),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
