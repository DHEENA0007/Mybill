import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';
import 'package:dio/dio.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  List<dynamic> _users = [];
  List<dynamic> _roles = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final rolesRes = await api.getRoles();
      final usersRes = await api.getUsers();
      
      setState(() {
        _roles = rolesRes.data;
        _users = usersRes.data['results'] ?? usersRes.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load users')),
        );
      }
    }
  }

  void _showUserForm([Map<String, dynamic>? user]) {
    final usernameCtrl = TextEditingController(text: user?['username'] ?? '');
    final emailCtrl = TextEditingController(text: user?['email'] ?? '');
    final passwordCtrl = TextEditingController();
    int? selectedRole = user?['role'];
    bool isActive = user?['is_active'] ?? true;
    
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setStateModal) => AlertDialog(
          title: Text(user == null ? 'Add User' : 'Edit User'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: usernameCtrl,
                    decoration: const InputDecoration(labelText: 'Username *'),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: emailCtrl,
                    decoration: const InputDecoration(labelText: 'Email *'),
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  if (user == null) ...[
                    TextFormField(
                      controller: passwordCtrl,
                      decoration: const InputDecoration(labelText: 'Password *'),
                      obscureText: true,
                      validator: (v) => v!.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 16),
                  ],
                  DropdownButtonFormField<int>(
                    decoration: const InputDecoration(labelText: 'Role *'),
                    value: selectedRole,
                    items: _roles.map((role) => DropdownMenuItem<int>(
                      value: role['id'],
                      child: Text(role['name']),
                    )).toList(),
                    onChanged: (v) => setStateModal(() => selectedRole = v),
                    validator: (v) => v == null ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: const Text('Active'),
                    value: isActive,
                    onChanged: (v) => setStateModal(() => isActive = v),
                    contentPadding: EdgeInsets.zero,
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
                  'username': usernameCtrl.text,
                  'email': emailCtrl.text,
                  'role': selectedRole,
                  'is_active': isActive,
                };
                
                if (user == null) {
                  data['password'] = passwordCtrl.text;
                }
                
                try {
                  if (user == null) {
                    await api.createUser(data);
                  } else {
                    await api.updateUser(user['id'], data);
                  }
                  
                  if (context.mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(user == null ? 'User created' : 'User updated'), backgroundColor: AppTheme.success),
                    );
                    _fetchData();
                  }
                } on DioException catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(e.response?.data?.toString() ?? 'Failed to save'), backgroundColor: AppTheme.danger),
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
        title: const Text('User Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add),
            onPressed: () => _showUserForm(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _users.isEmpty
              ? const Center(child: Text('No users found'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _users.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final user = _users[index];
                    final isActive = user['is_active'] == true;
                    final roleName = user['role_name'] ?? 'No Role';
                    
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isActive ? AppTheme.primary.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                          child: Icon(Icons.person, color: isActive ? AppTheme.primary : Colors.grey),
                        ),
                        title: Text(user['username'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${user['email']}\nRole: $roleName'),
                        isThreeLine: true,
                        trailing: IconButton(
                          icon: const Icon(Icons.edit_outlined, color: AppTheme.accent),
                          onPressed: () => _showUserForm(user),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
