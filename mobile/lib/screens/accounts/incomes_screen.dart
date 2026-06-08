import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';
import 'package:dio/dio.dart';

class IncomesScreen extends StatefulWidget {
  const IncomesScreen({super.key});

  @override
  State<IncomesScreen> createState() => _IncomesScreenState();
}

class _IncomesScreenState extends State<IncomesScreen> {
  List<dynamic> _incomes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchIncomes();
  }

  Future<void> _fetchIncomes() async {
    setState(() => _isLoading = true);
    try {
      final response = await api.getIncomes();
      setState(() {
        _incomes = response.data['results'] ?? response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Incomes')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _incomes.isEmpty
              ? const Center(child: Text('No incomes found'))
              : ListView.builder(
                  itemCount: _incomes.length,
                  itemBuilder: (context, index) {
                    final item = _incomes[index];
                    return ListTile(
                      title: Text(item['description'] ?? 'Income'),
                      subtitle: Text(item['date'] ?? ''),
                      trailing: Text(
                        '+₹${item['amount']}',
                        style: const TextStyle(color: AppTheme.success, fontWeight: FontWeight.bold),
                      ),
                    );
                  },
                ),
    );
  }
}
