import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';
import 'package:dio/dio.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  List<dynamic> _categories = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchCategories();
  }

  Future<void> _fetchCategories() async {
    setState(() => _isLoading = true);
    try {
      final response = await api.getCategories();
      setState(() {
        _categories = response.data['results'] ?? response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load categories')),
        );
      }
    }
  }

  Future<void> _deleteCategory(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Category'),
        content: const Text('Are you sure you want to delete this category?'),
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
      await api.deleteCategory(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Category deleted successfully'), backgroundColor: AppTheme.success),
        );
        _fetchCategories();
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.response?.data?.toString() ?? 'Failed to delete category'), backgroundColor: AppTheme.danger),
        );
      }
    }
  }

  void _showCategoryForm([Map<String, dynamic>? category]) {
    final nameCtrl = TextEditingController(text: category?['name'] ?? '');
    final descCtrl = TextEditingController(text: category?['description'] ?? '');
    bool isActive = category?['is_active'] ?? true;
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setStateModal) => AlertDialog(
          title: Text(category == null ? 'Add Category' : 'Edit Category'),
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
                    controller: descCtrl,
                    decoration: const InputDecoration(labelText: 'Description'),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: const Text('Is Active'),
                    value: isActive,
                    onChanged: (v) => setStateModal(() => isActive = v),
                    contentPadding: EdgeInsets.zero,
                    activeColor: AppTheme.primary,
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
                  'description': descCtrl.text,
                  'is_active': isActive,
                };
                
                try {
                  if (category == null) {
                    await api.createCategory(data);
                  } else {
                    await api.updateCategory(category['id'], data);
                  }
                  
                  if (context.mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(category == null ? 'Category created' : 'Category updated'),
                        backgroundColor: AppTheme.success,
                      ),
                    );
                    _fetchCategories();
                  }
                } on DioException catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(e.response?.data?.toString() ?? 'Failed to save category'), backgroundColor: AppTheme.danger),
                    );
                  }
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Categories'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showCategoryForm(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _categories.isEmpty
              ? const Center(child: Text('No categories found', style: TextStyle(color: AppTheme.textSecondary)))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _categories.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    final isActive = cat['is_active'] == true;
                    
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isActive ? AppTheme.primary.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                          child: Icon(Icons.category, color: isActive ? AppTheme.primary : Colors.grey),
                        ),
                        title: Text(cat['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(cat['description'] ?? 'No description'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, color: AppTheme.accent),
                              onPressed: () => _showCategoryForm(cat),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, color: AppTheme.danger),
                              onPressed: () => _deleteCategory(cat['id']),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
