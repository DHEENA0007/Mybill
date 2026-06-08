import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';
import 'package:dio/dio.dart';

class PurchasesScreen extends StatefulWidget {
  const PurchasesScreen({super.key});

  @override
  State<PurchasesScreen> createState() => _PurchasesScreenState();
}

class _PurchasesScreenState extends State<PurchasesScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  
  List<dynamic> _purchases = [];
  bool _isLoading = true;
  String _searchQuery = '';
  
  int _currentPage = 1;
  int _totalPages = 1;
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    _fetchPurchases();
  }

  Future<void> _fetchPurchases({bool resetPage = true}) async {
    if (resetPage) {
      setState(() {
        _currentPage = 1;
        _isLoading = true;
      });
    } else {
      setState(() => _isLoadingMore = true);
    }
    
    try {
      final response = await api.getPurchases(
        search: _searchQuery, 
        page: _currentPage,
      );
      
      final newPurchases = response.data['results'] ?? [];
      final count = response.data['count'] ?? 0;
      
      setState(() {
        if (resetPage) {
          _purchases = newPurchases;
        } else {
          _purchases.addAll(newPurchases);
        }
        _totalPages = (count / 20).ceil();
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
          const SnackBar(content: Text('Failed to load purchases')),
        );
      }
    }
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      setState(() => _searchQuery = query);
      _fetchPurchases();
    });
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
        title: const Text('Purchases'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              // Add Purchase
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search purchases...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                          _fetchPurchases();
                        },
                      )
                    : null,
              ),
              onChanged: _onSearchChanged,
            ),
          ),
          
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _purchases.isEmpty
                    ? const Center(child: Text('No purchases found', style: TextStyle(color: AppTheme.textSecondary)))
                    : NotificationListener<ScrollNotification>(
                        onNotification: (ScrollNotification scrollInfo) {
                          if (!_isLoadingMore &&
                              _currentPage < _totalPages &&
                              scrollInfo.metrics.pixels == scrollInfo.metrics.maxScrollExtent) {
                            setState(() => _currentPage++);
                            _fetchPurchases(resetPage: false);
                            return true;
                          }
                          return false;
                        },
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16.0),
                          itemCount: _purchases.length + (_isLoadingMore ? 1 : 0),
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            if (index == _purchases.length) {
                              return const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator()));
                            }
                            
                            final purchase = _purchases[index];

                            return Card(
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: AppTheme.primary.withOpacity(0.1),
                                  child: const Icon(Icons.shopping_cart, color: AppTheme.primary),
                                ),
                                title: Text(purchase['invoice_number'] ?? 'N/A', style: const TextStyle(fontWeight: FontWeight.bold)),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Supplier: ${purchase['supplier_name'] ?? 'Walk-in'}', style: const TextStyle(fontSize: 12)),
                                    Text('Date: ${purchase['date'] ?? ''}', style: const TextStyle(fontSize: 12)),
                                  ],
                                ),
                                trailing: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text('₹${purchase['total_amount']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                                    Text(
                                      purchase['status']?.toUpperCase() ?? 'PENDING',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: purchase['status'] == 'paid' ? AppTheme.success : AppTheme.warning,
                                      ),
                                    ),
                                  ],
                                ),
                                onTap: () {
                                  // Navigate to purchase detail
                                },
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
