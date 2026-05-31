import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';
import 'package:dio/dio.dart';

class ProductFormScreen extends StatefulWidget {
  final Map<String, dynamic>? product;
  final List<dynamic> categories;

  const ProductFormScreen({super.key, this.product, required this.categories});

  @override
  State<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends State<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _nameController;
  late TextEditingController _skuController;
  late TextEditingController _descController;
  late TextEditingController _purchasePriceController;
  late TextEditingController _sellingPriceController;
  late TextEditingController _minStockController;
  late TextEditingController _hsnController;
  late TextEditingController _taxRateController;
  
  String? _selectedCategory;
  bool _isActive = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _nameController = TextEditingController(text: p?['name']?.toString() ?? '');
    _skuController = TextEditingController(text: p?['sku']?.toString() ?? '');
    _descController = TextEditingController(text: p?['description']?.toString() ?? '');
    _purchasePriceController = TextEditingController(text: p?['purchase_price']?.toString() ?? '');
    _sellingPriceController = TextEditingController(text: p?['selling_price']?.toString() ?? '');
    _minStockController = TextEditingController(text: p?['min_stock_level']?.toString() ?? '10');
    _hsnController = TextEditingController(text: p?['hsn_code']?.toString() ?? '');
    _taxRateController = TextEditingController(text: p?['tax_rate']?.toString() ?? '0.00');
    
    if (p != null && p['category'] != null) {
      _selectedCategory = p['category'].toString();
    }
    if (p != null && p['is_active'] != null) {
      _isActive = p['is_active'];
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _skuController.dispose();
    _descController.dispose();
    _purchasePriceController.dispose();
    _sellingPriceController.dispose();
    _minStockController.dispose();
    _hsnController.dispose();
    _taxRateController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSaving = true);
    
    final data = {
      'name': _nameController.text,
      'sku': _skuController.text,
      'description': _descController.text,
      'purchase_price': _purchasePriceController.text,
      'selling_price': _sellingPriceController.text,
      'min_stock_level': _minStockController.text,
      'hsn_code': _hsnController.text,
      'tax_rate': _taxRateController.text,
      'category': _selectedCategory,
      'is_active': _isActive,
    };

    try {
      if (widget.product != null) {
        await api.updateProduct(widget.product!['id'], data);
      } else {
        await api.createProduct(data);
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.product != null ? 'Product updated' : 'Product created'),
            backgroundColor: AppTheme.success,
          ),
        );
        Navigator.pop(context, true); // true indicates success/refresh needed
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.response?.data?.toString() ?? 'Failed to save product'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.product != null ? 'Edit Product' : 'Add Product'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Product Name *'),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _skuController,
                      decoration: const InputDecoration(labelText: 'SKU *'),
                      validator: (v) => v!.isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedCategory,
                      decoration: const InputDecoration(labelText: 'Category *'),
                      items: widget.categories.map((c) {
                        return DropdownMenuItem<String>(
                          value: c['id'].toString(),
                          child: Text(c['name']),
                        );
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedCategory = v),
                      validator: (v) => v == null ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _descController,
                decoration: const InputDecoration(labelText: 'Description'),
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _purchasePriceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Purchase Price *'),
                      validator: (v) => v!.isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _sellingPriceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Selling Price *'),
                      validator: (v) => v!.isEmpty ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _minStockController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Min Stock Alert *'),
                      validator: (v) => v!.isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _taxRateController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Tax Rate (%) *'),
                      validator: (v) => v!.isEmpty ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _hsnController,
                decoration: const InputDecoration(labelText: 'HSN/SAC Code'),
              ),
              const SizedBox(height: 16),
              
              SwitchListTile(
                title: const Text('Is Active'),
                value: _isActive,
                onChanged: (v) => setState(() => _isActive = v),
                activeColor: AppTheme.primary,
              ),
              const SizedBox(height: 24),
              
              ElevatedButton(
                onPressed: _isSaving ? null : _save,
                child: _isSaving 
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(widget.product != null ? 'Update Product' : 'Create Product'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
