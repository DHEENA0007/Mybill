import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';

class AccountsDashboardScreen extends StatefulWidget {
  const AccountsDashboardScreen({super.key});

  @override
  State<AccountsDashboardScreen> createState() => _AccountsDashboardScreenState();
}

class _AccountsDashboardScreenState extends State<AccountsDashboardScreen> {
  Map<String, dynamic>? _stats;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    try {
      final response = await api.getAccountsDashboard();
      setState(() {
        _stats = response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load accounts dashboard')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Accounts Portal')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_stats == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Accounts Portal')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Could not load data'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadStats,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final summary = _stats!['summary'] ?? {};
    final recentIncomes = (_stats!['recent_incomes'] as List?) ?? [];
    final recentExpenses = (_stats!['recent_expenses'] as List?) ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Accounts Portal'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() => _isLoading = true);
              _loadStats();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadStats,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Summary Cards
            Row(
              children: [
                Expanded(
                  child: _buildSummaryCard(
                    'Total Income',
                    '₹${summary['total_income'] ?? '0.00'}',
                    Icons.arrow_downward,
                    AppTheme.success,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildSummaryCard(
                    'Total Expense',
                    '₹${summary['total_expense'] ?? '0.00'}',
                    Icons.arrow_upward,
                    AppTheme.danger,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildNetBalanceCard(summary['net_balance'] ?? 0),
            
            const SizedBox(height: 24),
            
            // Recent Incomes
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recent Incomes', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                TextButton(
                  onPressed: () {
                    // Navigate to Incomes List
                  },
                  child: const Text('View All'),
                ),
              ],
            ),
            if (recentIncomes.isEmpty)
              const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Text('No recent incomes', style: TextStyle(color: AppTheme.textSecondary)))
            else
              ...recentIncomes.map((inc) => _buildTransactionCard(
                title: inc['description'] ?? 'Income',
                subtitle: inc['income_type_name'] ?? 'General',
                amount: inc['amount'],
                date: inc['date'],
                isIncome: true,
              )),
              
            const SizedBox(height: 24),
            
            // Recent Expenses
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recent Expenses', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                TextButton(
                  onPressed: () {
                    // Navigate to Expenses List
                  },
                  child: const Text('View All'),
                ),
              ],
            ),
            if (recentExpenses.isEmpty)
              const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Text('No recent expenses', style: TextStyle(color: AppTheme.textSecondary)))
            else
              ...recentExpenses.map((exp) => _buildTransactionCard(
                title: exp['description'] ?? 'Expense',
                subtitle: exp['subcategory_name'] ?? 'General',
                amount: exp['amount'],
                date: exp['date'],
                isIncome: false,
              )),
              
            const SizedBox(height: 32),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Add transaction bottom sheet
          _showAddTransactionSheet(context);
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildSummaryCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildNetBalanceCard(dynamic balanceValue) {
    final double bal = double.tryParse(balanceValue.toString()) ?? 0;
    final isPositive = bal >= 0;
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isPositive 
              ? [AppTheme.primary, AppTheme.primaryDark] 
              : [AppTheme.danger, Colors.red.shade900],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: (isPositive ? AppTheme.primary : AppTheme.danger).withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Net Balance',
                style: TextStyle(fontSize: 14, color: Colors.white70),
              ),
              const SizedBox(height: 4),
              Text(
                '₹${bal.abs().toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.account_balance_wallet,
              color: Colors.white,
              size: 32,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionCard({
    required String title,
    required String subtitle,
    required dynamic amount,
    required String date,
    required bool isIncome,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isIncome ? AppTheme.success.withOpacity(0.1) : AppTheme.danger.withOpacity(0.1),
          child: Icon(
            isIncome ? Icons.arrow_downward : Icons.arrow_upward,
            color: isIncome ? AppTheme.success : AppTheme.danger,
          ),
        ),
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text('$subtitle • $date', style: const TextStyle(fontSize: 12)),
        trailing: Text(
          '${isIncome ? '+' : '-'}₹$amount',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isIncome ? AppTheme.success : AppTheme.danger,
          ),
        ),
      ),
    );
  }

  void _showAddTransactionSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Add Transaction', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              icon: const Icon(Icons.arrow_downward),
              label: const Text('Add Income'),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success, padding: const EdgeInsets.symmetric(vertical: 16)),
              onPressed: () {
                Navigator.pop(context);
                // Navigate to Add Income
              },
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              icon: const Icon(Icons.arrow_upward),
              label: const Text('Add Expense'),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger, padding: const EdgeInsets.symmetric(vertical: 16)),
              onPressed: () {
                Navigator.pop(context);
                // Navigate to Add Expense
              },
            ),
          ],
        ),
      ),
    );
  }
}
