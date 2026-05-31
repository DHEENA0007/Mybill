import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';
import 'package:dio/dio.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  
  List<dynamic> _customers = [];
  bool _isLoading = true;
  String _searchQuery = '';
  
  int _currentPage = 1;
  int _totalPages = 1;
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    _fetchCustomers();
  }

  Future<void> _fetchCustomers({bool resetPage = true}) async {
    if (resetPage) {
      setState(() {
        _currentPage = 1;
        _isLoading = true;
      });
    } else {
      setState(() => _isLoadingMore = true);
    }
    
    try {
      final response = await api.getCustomers(
        search: _searchQuery, 
        page: _currentPage,
      );
      
      final newCustomers = response.data['results'] ?? [];
      final count = response.data['count'] ?? 0;
      
      setState(() {
        if (resetPage) {
          _customers = newCustomers;
        } else {
          _customers.addAll(newCustomers);
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
          const SnackBar(content: Text('Failed to load customers')),
        );
      }
    }
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      setState(() => _searchQuery = query);
      _fetchCustomers();
    });
  }

  Future<void> _deleteCustomer(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Customer'),
        content: const Text('Are you sure you want to delete this customer?'),
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
      await api.deleteCustomer(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Customer deleted successfully'), backgroundColor: AppTheme.success),
        );
        _fetchCustomers();
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.response?.data?.toString() ?? 'Failed to delete customer'), backgroundColor: AppTheme.danger),
        );
      }
    }
  }

  void _showCustomerForm([Map<String, dynamic>? customer]) {
    final nameCtrl = TextEditingController(text: customer?['name'] ?? '');
    final emailCtrl = TextEditingController(text: customer?['email'] ?? '');
    final phoneCtrl = TextEditingController(text: customer?['phone'] ?? '');
    final addressCtrl = TextEditingController(text: customer?['address'] ?? '');
    final gstinCtrl = TextEditingController(text: customer?['gstin'] ?? '');
    
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(customer == null ? 'Add Customer' : 'Edit Customer'),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Name *'),
                  validator: (v) => v!.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: phoneCtrl,
                  decoration: const InputDecoration(labelText: 'Phone'),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: emailCtrl,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: gstinCtrl,
                  decoration: const InputDecoration(labelText: 'GSTIN / Tax ID'),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: addressCtrl,
                  decoration: const InputDecoration(labelText: 'Address'),
                  maxLines: 2,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              
              final data = {
                'name': nameCtrl.text,
                'phone': phoneCtrl.text,
                'email': emailCtrl.text,
                'gstin': gstinCtrl.text,
                'address': addressCtrl.text,
              };
              
              try {
                if (customer == null) {
                  await api.createCustomer(data);
                } else {
                  await api.updateCustomer(customer['id'], data);
                }
                
                if (context.mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(customer == null ? 'Customer created' : 'Customer updated'),
                      backgroundColor: AppTheme.success,
                    ),
                  );
                  _fetchCustomers();
                }
              } on DioException catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(e.response?.data?.toString() ?? 'Failed to save customer'), backgroundColor: AppTheme.danger),
                  );
                }
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
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
        title: const Text('Customers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add),
            onPressed: () => _showCustomerForm(),
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
                hintText: 'Search customers...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                          _fetchCustomers();
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
                : _customers.isEmpty
                    ? const Center(child: Text('No customers found', style: TextStyle(color: AppTheme.textSecondary)))
                    : NotificationListener<ScrollNotification>(
                        onNotification: (ScrollNotification scrollInfo) {
                          if (!_isLoadingMore &&
                              _currentPage < _totalPages &&
                              scrollInfo.metrics.pixels == scrollInfo.metrics.maxScrollExtent) {
                            setState(() => _currentPage++);
                            _fetchCustomers(resetPage: false);
                            return true;
                          }
                          return false;
                        },
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16.0),
                          itemCount: _customers.length + (_isLoadingMore ? 1 : 0),
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            if (index == _customers.length) {
                              return const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator()));
                            }
                            
                            final customer = _customers[index];
                            final totalPurchases = customer['total_purchases'] ?? '0.00';

                            return Card(
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: AppTheme.primary.withOpacity(0.1),
                                  child: const Icon(Icons.person, color: AppTheme.primary),
                                ),
                                title: Text(customer['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (customer['phone'] != null && customer['phone'].toString().isNotEmpty)
                                      Text(customer['phone'], style: const TextStyle(fontSize: 12)),
                                    Text('Total Spent: ₹$totalPurchases', style: const TextStyle(fontSize: 12, color: AppTheme.success, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.edit_outlined, color: AppTheme.accent),
                                      onPressed: () => _showCustomerForm(customer),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, color: AppTheme.danger),
                                      onPressed: () => _deleteCustomer(customer['id']),
                                    ),
                                  ],
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
