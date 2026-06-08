import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> with SingleTickerProviderStateMixin {
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
        title: const Text('Reports'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Sales'),
            Tab(text: 'Inventory'),
            Tab(text: 'Financial'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          SalesReportView(),
          InventoryReportView(),
          FinancialReportView(),
        ],
      ),
    );
  }
}

class SalesReportView extends StatefulWidget {
  const SalesReportView({super.key});

  @override
  State<SalesReportView> createState() => _SalesReportViewState();
}

class _SalesReportViewState extends State<SalesReportView> {
  Map<String, dynamic>? _data;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    try {
      final response = await api.getSalesReport();
      setState(() {
        _data = response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_data == null) return const Center(child: Text('Failed to load'));

    final summary = _data!['summary'] ?? {};
    final daily = (_data!['daily_sales'] as List?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSummaryCard('Total Sales', '₹${summary['total_revenue'] ?? 0}'),
        _buildSummaryCard('Total Invoices', '${summary['total_invoices'] ?? 0}'),
        const SizedBox(height: 16),
        const Text('Daily Sales', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        ...daily.map((d) => ListTile(
          title: Text(d['date'] ?? ''),
          trailing: Text('₹${d['daily_revenue']}'),
        )),
      ],
    );
  }

  Widget _buildSummaryCard(String title, String value) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(title, style: const TextStyle(color: AppTheme.textSecondary)),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primary)),
          ],
        ),
      ),
    );
  }
}

class InventoryReportView extends StatefulWidget {
  const InventoryReportView({super.key});

  @override
  State<InventoryReportView> createState() => _InventoryReportViewState();
}

class _InventoryReportViewState extends State<InventoryReportView> {
  Map<String, dynamic>? _data;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    try {
      final response = await api.getInventoryReport();
      setState(() {
        _data = response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_data == null) return const Center(child: Text('Failed to load'));

    final summary = _data!['summary'] ?? {};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                const Text('Total Value', style: TextStyle(color: AppTheme.textSecondary)),
                const SizedBox(height: 8),
                Text('₹${summary['total_value'] ?? 0}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primary)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class FinancialReportView extends StatefulWidget {
  const FinancialReportView({super.key});

  @override
  State<FinancialReportView> createState() => _FinancialReportViewState();
}

class _FinancialReportViewState extends State<FinancialReportView> {
  Map<String, dynamic>? _data;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    try {
      final response = await api.getFinancialReport();
      setState(() {
        _data = response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_data == null) return const Center(child: Text('Failed to load'));

    final summary = _data!['summary'] ?? {};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                const Text('Net Balance', style: TextStyle(color: AppTheme.textSecondary)),
                const SizedBox(height: 8),
                Text('₹${summary['net_balance'] ?? 0}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primary)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
