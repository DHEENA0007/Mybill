import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';
import 'package:dio/dio.dart';

class BillingScreen extends StatefulWidget {
  const BillingScreen({super.key});

  @override
  State<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends State<BillingScreen> {
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _paidAmountController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();
  Timer? _debounce;
  
  List<dynamic> _searchResults = [];
  List<Map<String, dynamic>> _cart = [];
  List<dynamic> _customers = [];
  
  bool _isSearching = false;
  bool _isSaving = false;
  
  String? _selectedCustomerId;
  double _taxRate = 0;
  String _paymentMethod = 'cash';
  
  @override
  void initState() {
    super.initState();
    _fetchCustomers();
  }

  Future<void> _fetchCustomers() async {
    try {
      // For a POS screen, we typically want a larger page_size or a searchable dropdown
      // Here we fetch the first page.
      final response = await api.getCustomers();
      setState(() {
        _customers = response.data['results'] ?? response.data;
      });
    } catch (e) {
      // Handle silently
    }
  }

  void _onSearchChanged(String query) {
    if (query.isEmpty) {
      setState(() {
        _searchResults = [];
        _isSearching = false;
      });
      return;
    }

    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _searchProducts(query);
    });
  }

  void _searchProducts(String query) async {
    setState(() => _isSearching = true);
    try {
      final response = await api.getProducts(search: query);
      if (mounted) {
        setState(() {
          _searchResults = response.data['results'] ?? response.data;
          _isSearching = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  void _addToCart(dynamic product) {
    setState(() {
      final existingIndex = _cart.indexWhere((item) => item['product'] == product['id']);
      if (existingIndex >= 0) {
        _cart[existingIndex]['quantity'] += 1;
      } else {
        _cart.add({
          'product': product['id'],
          'name': product['name'],
          'unit_price': double.parse(product['selling_price'].toString()),
          'quantity': 1,
        });
      }
      _searchController.clear();
      _searchResults = [];
      FocusScope.of(context).unfocus();
    });
  }

  void _updateQuantity(int index, int delta) {
    setState(() {
      final newQuantity = _cart[index]['quantity'] + delta;
      if (newQuantity > 0) {
        _cart[index]['quantity'] = newQuantity;
      } else {
        _cart.removeAt(index);
      }
    });
  }

  double get _subtotal {
    return _cart.fold(0.0, (sum, item) => sum + (item['quantity'] * item['unit_price']));
  }

  double get _taxAmount {
    return (_subtotal * _taxRate) / 100;
  }

  double get _total {
    return _subtotal + _taxAmount;
  }

  double get _paidAmount {
    if (_paymentMethod == 'credit') return 0.0;
    if (_paidAmountController.text.isEmpty) return _total;
    return double.tryParse(_paidAmountController.text) ?? _total;
  }
  
  double get _balance {
    return _total - _paidAmount;
  }

  Future<void> _handleCheckout() async {
    if (_cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one product')),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final data = {
        if (_selectedCustomerId != null) 'customer': int.parse(_selectedCustomerId!),
        'tax_rate': _taxRate,
        'paid_amount': _paidAmount,
        'payment_method': _paymentMethod,
        'notes': _notesController.text,
        'items': _cart.map((i) => {
          'product': i['product'],
          'quantity': i['quantity'],
          'unit_price': i['unit_price']
        }).toList(),
      };
      
      final response = await api.dio.post('/invoices/', data: data);
      
      if (mounted) {
        final invNum = response.data['invoice_number'];
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Invoice $invNum created successfully'), backgroundColor: AppTheme.success),
        );
        setState(() {
          _cart = [];
          _taxRate = 0;
          _selectedCustomerId = null;
          _paymentMethod = 'cash';
          _paidAmountController.clear();
          _notesController.clear();
        });
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.response?.data?.toString() ?? 'Failed to create invoice'), 
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _quickAddCustomer() async {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Customer'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name *')),
            const SizedBox(height: 12),
            TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Phone')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.isEmpty) return;
              Navigator.pop(context, {'name': nameCtrl.text, 'phone': phoneCtrl.text});
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (result != null) {
      try {
        final res = await api.createCustomer(result);
        final newCustomer = res.data;
        setState(() {
          _customers.add(newCustomer);
          _selectedCustomerId = newCustomer['id'].toString();
        });
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Customer added')));
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to add customer'), backgroundColor: AppTheme.danger));
      }
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _paidAmountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New Sale (POS)'),
        actions: [
          if (_cart.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep, color: AppTheme.danger),
              onPressed: () => setState(() => _cart = []),
              tooltip: 'Clear Cart',
            )
        ],
      ),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left Side: Cart & Search (Expanded on tablets, takes full width on mobile if we were using LayoutBuilder, but assuming vertical scroll for mobile)
          Expanded(
            child: Column(
              children: [
                // Search Product
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search product to add...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                _searchController.clear();
                                setState(() {
                                  _searchResults = [];
                                  _isSearching = false;
                                });
                              },
                            )
                          : null,
                    ),
                    onChanged: _onSearchChanged,
                  ),
                ),
                
                // Search Results Dropdown
                if (_searchResults.isNotEmpty || _isSearching)
                  Container(
                    constraints: const BoxConstraints(maxHeight: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.border),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10),
                      ],
                    ),
                    child: _isSearching
                        ? const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()))
                        : ListView.builder(
                            shrinkWrap: true,
                            itemCount: _searchResults.length,
                            itemBuilder: (context, index) {
                              final p = _searchResults[index];
                              final isOutOfStock = (p['current_stock'] ?? 0) <= 0;
                              return ListTile(
                                title: Text(p['name'], style: TextStyle(color: isOutOfStock ? Colors.grey : null)),
                                subtitle: Text('Stock: ${p['current_stock']} • SKU: ${p['sku']}'),
                                trailing: Text('₹${p['selling_price']}', style: TextStyle(fontWeight: FontWeight.bold, color: isOutOfStock ? Colors.grey : AppTheme.primary)),
                                onTap: isOutOfStock ? null : () => _addToCart(p),
                                enabled: !isOutOfStock,
                              );
                            },
                          ),
                  ),
                  
                const Divider(),
                
                // Cart Items
                Expanded(
                  child: _cart.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(Icons.shopping_cart_outlined, size: 64, color: AppTheme.border),
                              SizedBox(height: 16),
                              Text('Cart is empty', style: TextStyle(color: AppTheme.textSecondary, fontSize: 18)),
                              Text('Search products above to add them', style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _cart.length,
                          separatorBuilder: (context, index) => const Divider(),
                          itemBuilder: (context, index) {
                            final item = _cart[index];
                            return Row(
                              children: [
                                Expanded(
                                  flex: 3,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                                      const SizedBox(height: 4),
                                      Text('₹${item['unit_price']}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                                    ],
                                  ),
                                ),
                                Row(
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.remove_circle_outline, color: AppTheme.textSecondary),
                                      onPressed: () => _updateQuantity(index, -1),
                                      splashRadius: 20,
                                    ),
                                    Container(
                                      width: 32,
                                      alignment: Alignment.center,
                                      child: Text('${item['quantity']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.add_circle_outline, color: AppTheme.primary),
                                      onPressed: () => _updateQuantity(index, 1),
                                      splashRadius: 20,
                                    ),
                                  ],
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    '₹${(item['quantity'] * item['unit_price']).toStringAsFixed(2)}',
                                    textAlign: TextAlign.right,
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
      // Right Side/Bottom: Checkout Summary & Payment
      bottomNavigationBar: Container(
        padding: EdgeInsets.only(
          left: 24, 
          right: 24, 
          top: 24, 
          bottom: MediaQuery.of(context).padding.bottom + 24
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -5)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Customer Selection
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String?>(
                    value: _selectedCustomerId,
                    decoration: const InputDecoration(labelText: 'Customer (Optional)', isDense: true),
                    items: [
                      const DropdownMenuItem<String?>(value: null, child: Text('Walk-in Customer')),
                      ..._customers.map((c) => DropdownMenuItem<String?>(
                        value: c['id'].toString(),
                        child: Text('${c['name']} ${c['phone'] != null ? '(${c['phone']})' : ''}'),
                      )),
                    ],
                    onChanged: (v) => setState(() => _selectedCustomerId = v),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.person_add, color: AppTheme.primary),
                  onPressed: _quickAddCustomer,
                  tooltip: 'Quick Add Customer',
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Subtotal & Tax
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Subtotal', style: TextStyle(color: AppTheme.textSecondary)),
                Text('₹${_subtotal.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Tax', style: TextStyle(color: AppTheme.textSecondary)),
                Row(
                  children: [
                    SizedBox(
                      width: 60,
                      child: TextField(
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                          hintText: '0%',
                        ),
                        onChanged: (v) => setState(() => _taxRate = double.tryParse(v) ?? 0),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text('₹${_taxAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(),
            ),
            
            // Total
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                Text('₹${_total.toStringAsFixed(2)}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primary)),
              ],
            ),
            const SizedBox(height: 16),
            
            // Payment Method & Paid Amount
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _paymentMethod,
                    decoration: const InputDecoration(labelText: 'Payment Method', isDense: true),
                    items: const [
                      DropdownMenuItem(value: 'cash', child: Text('Cash')),
                      DropdownMenuItem(value: 'card', child: Text('Card')),
                      DropdownMenuItem(value: 'upi', child: Text('UPI')),
                      DropdownMenuItem(value: 'bank_transfer', child: Text('Bank Transfer')),
                      DropdownMenuItem(value: 'credit', child: Text('Credit (Pay Later)')),
                    ],
                    onChanged: (v) {
                      setState(() {
                        _paymentMethod = v!;
                        // If credit, paid amount is 0. Else, reset to total.
                        if (v == 'credit') {
                          _paidAmountController.text = '0';
                        } else {
                          _paidAmountController.clear(); // Empty implies full payment
                        }
                      });
                    },
                  ),
                ),
                if (_paymentMethod != 'credit') ...[
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextField(
                      controller: _paidAmountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Amount Paid',
                        isDense: true,
                        hintText: '₹${_total.toStringAsFixed(0)}',
                      ),
                      onChanged: (v) => setState(() {}),
                    ),
                  ),
                ],
              ],
            ),
            
            // Balance / Change Indicator
            if (_paymentMethod != 'credit' && _paidAmountController.text.isNotEmpty) ...[
              const SizedBox(height: 12),
              if (_balance > 0)
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppTheme.warning.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber, size: 16, color: AppTheme.warning),
                      const SizedBox(width: 8),
                      Text('Balance to add to credit: ₹${_balance.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, color: AppTheme.warning, fontWeight: FontWeight.bold)),
                    ],
                  ),
                )
              else if (_balance < 0)
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppTheme.success.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_outline, size: 16, color: AppTheme.success),
                      const SizedBox(width: 8),
                      Text('Change to return: ₹${(-_balance).toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, color: AppTheme.success, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
            ],
            
            const SizedBox(height: 16),
            
            // Checkout Button
            ElevatedButton(
              onPressed: (_cart.isEmpty || _isSaving) ? null : _handleCheckout,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isSaving 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.receipt_long),
                        SizedBox(width: 8),
                        Text('Create Invoice', style: TextStyle(fontSize: 16)),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
