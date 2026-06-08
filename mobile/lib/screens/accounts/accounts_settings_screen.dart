import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';
import 'package:dio/dio.dart';

class AccountsSettingsScreen extends StatefulWidget {
  const AccountsSettingsScreen({super.key});

  @override
  State<AccountsSettingsScreen> createState() => _AccountsSettingsScreenState();
}

class _AccountsSettingsScreenState extends State<AccountsSettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Accounts Settings'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Income Types'),
            Tab(text: 'Categories'),
            Tab(text: 'Subcategories'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          IncomeTypesView(),
          ExpenseCategoriesView(),
          ExpenseSubcategoriesView(),
        ],
      ),
    );
  }
}

class IncomeTypesView extends StatefulWidget {
  const IncomeTypesView({super.key});

  @override
  State<IncomeTypesView> createState() => _IncomeTypesViewState();
}

class _IncomeTypesViewState extends State<IncomeTypesView> {
  List<dynamic> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchItems();
  }

  Future<void> _fetchItems() async {
    setState(() => _isLoading = true);
    try {
      final response = await api.getIncomeTypes();
      setState(() {
        _items = response.data['results'] ?? response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _showForm([Map<String, dynamic>? item]) {
    final nameCtrl = TextEditingController(text: item?['name'] ?? '');
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(item == null ? 'Add Income Type' : 'Edit Income Type'),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: nameCtrl,
            decoration: const InputDecoration(labelText: 'Name *'),
            validator: (v) => v!.isEmpty ? 'Required' : null,
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              try {
                if (item == null) {
                  await api.createIncomeType({'name': nameCtrl.text});
                } else {
                  // Assuming update is handled properly on backend or not needed
                }
                if (context.mounted) {
                  Navigator.pop(context);
                  _fetchItems();
                }
              } catch (e) {
                // handle error
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _buildListView(_items, _isLoading, _showForm, api.deleteIncomeType, _fetchItems);
  }
}

class ExpenseCategoriesView extends StatefulWidget {
  const ExpenseCategoriesView({super.key});

  @override
  State<ExpenseCategoriesView> createState() => _ExpenseCategoriesViewState();
}

class _ExpenseCategoriesViewState extends State<ExpenseCategoriesView> {
  List<dynamic> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchItems();
  }

  Future<void> _fetchItems() async {
    setState(() => _isLoading = true);
    try {
      final response = await api.getExpenseCategories();
      setState(() {
        _items = response.data['results'] ?? response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _showForm([Map<String, dynamic>? item]) {
    final nameCtrl = TextEditingController(text: item?['name'] ?? '');
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(item == null ? 'Add Category' : 'Edit Category'),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: nameCtrl,
            decoration: const InputDecoration(labelText: 'Name *'),
            validator: (v) => v!.isEmpty ? 'Required' : null,
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              try {
                if (item == null) {
                  await api.createExpenseCategory({'name': nameCtrl.text});
                }
                if (context.mounted) {
                  Navigator.pop(context);
                  _fetchItems();
                }
              } catch (e) {}
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _buildListView(_items, _isLoading, _showForm, api.deleteExpenseCategory, _fetchItems);
  }
}

class ExpenseSubcategoriesView extends StatefulWidget {
  const ExpenseSubcategoriesView({super.key});

  @override
  State<ExpenseSubcategoriesView> createState() => _ExpenseSubcategoriesViewState();
}

class _ExpenseSubcategoriesViewState extends State<ExpenseSubcategoriesView> {
  List<dynamic> _items = [];
  List<dynamic> _categories = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchItems();
    _fetchCategories();
  }

  Future<void> _fetchCategories() async {
    try {
      final response = await api.getExpenseCategories();
      setState(() {
        _categories = response.data['results'] ?? response.data;
      });
    } catch (e) {}
  }

  Future<void> _fetchItems() async {
    setState(() => _isLoading = true);
    try {
      final response = await api.getExpenseSubcategories();
      setState(() {
        _items = response.data['results'] ?? response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _showForm([Map<String, dynamic>? item]) {
    final nameCtrl = TextEditingController(text: item?['name'] ?? '');
    int? selectedCategory = item?['category'];
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setStateModal) => AlertDialog(
          title: Text(item == null ? 'Add Subcategory' : 'Edit Subcategory'),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<int>(
                  decoration: const InputDecoration(labelText: 'Category *'),
                  value: selectedCategory,
                  items: _categories.map((c) => DropdownMenuItem<int>(
                    value: c['id'],
                    child: Text(c['name']),
                  )).toList(),
                  onChanged: (v) => setStateModal(() => selectedCategory = v),
                  validator: (v) => v == null ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Name *'),
                  validator: (v) => v!.isEmpty ? 'Required' : null,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                try {
                  if (item == null) {
                    await api.createExpenseSubcategory({
                      'name': nameCtrl.text,
                      'category': selectedCategory,
                    });
                  }
                  if (context.mounted) {
                    Navigator.pop(context);
                    _fetchItems();
                  }
                } catch (e) {}
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
    return _buildListView(_items, _isLoading, _showForm, api.deleteExpenseSubcategory, _fetchItems);
  }
}

Widget _buildListView(List<dynamic> items, bool isLoading, Function([Map<String, dynamic>?]) showForm, Future<Response> Function(int) deleteFunc, Function refresh) {
  if (isLoading) return const Center(child: CircularProgressIndicator());

  return Column(
    children: [
      Padding(
        padding: const EdgeInsets.all(16.0),
        child: ElevatedButton.icon(
          onPressed: showForm,
          icon: const Icon(Icons.add),
          label: const Text('Add New'),
          style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
        ),
      ),
      Expanded(
        child: items.isEmpty
            ? const Center(child: Text('No items found'))
            : ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: items.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final item = items[index];
                  return Card(
                    child: ListTile(
                      title: Text(item['name'] ?? ''),
                      subtitle: item['category_name'] != null ? Text('Category: ${item['category_name']}') : null,
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline, color: AppTheme.danger),
                        onPressed: () async {
                          try {
                            await deleteFunc(item['id']);
                            refresh();
                          } catch (e) {}
                        },
                      ),
                    ),
                  );
                },
              ),
      ),
    ],
  );
}
