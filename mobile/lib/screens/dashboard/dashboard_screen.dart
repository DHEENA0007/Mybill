import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../products/products_screen.dart';
import '../billing/billing_screen.dart';
import '../accounts/accounts_dashboard.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  Map<String, dynamic>? _stats;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    try {
      final response = await api.getDashboardStats();
      setState(() {
        _stats = response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      // Handle error quietly
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final companyName = user?['company']?['name'];
    final isSuperAdmin = user?['is_superuser'] == true;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Dashboard'),
            if (companyName != null)
              Text(
                companyName,
                style: const TextStyle(fontSize: 12, color: AppTheme.primary),
              ),
            if (isSuperAdmin && companyName == null)
              const Text(
                'SuperAdmin Portal',
                style: TextStyle(fontSize: 12, color: AppTheme.accent),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              context.read<AuthProvider>().logout();
            },
          ),
        ],
      ),
      drawer: _buildDrawer(context, isSuperAdmin, companyName),
      body: _buildBody(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.inventory_2_outlined),
            activeIcon: Icon(Icons.inventory_2),
            label: 'Inventory',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_outlined),
            activeIcon: Icon(Icons.receipt_long),
            label: 'Sales',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.more_horiz),
            label: 'More',
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_currentIndex == 0) return _buildDashboardContent();
    if (_currentIndex == 1) return const ProductsScreen();
    if (_currentIndex == 2) return const BillingScreen();
    if (_currentIndex == 3) return const AccountsDashboardScreen();
    return Center(child: Text('Page $_currentIndex - Under Construction'));
  }

  Widget _buildDrawer(BuildContext context, bool isSuperAdmin, String? companyName) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: AppTheme.primary),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Text('BillPro', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                if (companyName != null) Text(companyName, style: const TextStyle(color: Colors.white70, fontSize: 14)),
                if (isSuperAdmin && companyName == null) const Text('SuperAdmin Portal', style: TextStyle(color: Colors.white70, fontSize: 14)),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard),
            title: const Text('Dashboard'),
            onTap: () {
              Navigator.pop(context);
              setState(() => _currentIndex = 0);
            },
          ),
          const Divider(),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text('INVENTORY', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.bold)),
          ),
          ListTile(
            leading: const Icon(Icons.inventory_2),
            title: const Text('Products'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ProductsScreen()));
            },
          ),
          ListTile(
            leading: const Icon(Icons.category),
            title: const Text('Categories'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (_) => const CategoriesScreen()));
            },
          ),
          const Divider(),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text('SALES', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.bold)),
          ),
          ListTile(
            leading: const Icon(Icons.point_of_sale),
            title: const Text('POS / Billing'),
            onTap: () {
              Navigator.pop(context);
              setState(() => _currentIndex = 2);
            },
          ),
          ListTile(
            leading: const Icon(Icons.people),
            title: const Text('Customers'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (_) => const CustomersScreen()));
            },
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardContent() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_stats == null) {
      return const Center(child: Text('Failed to load stats'));
    }

    // Checking if we are dealing with superadmin stats or normal company stats
    final isSuperAdminStats = _stats!.containsKey('total_companies');

    if (isSuperAdminStats) {
      return RefreshIndicator(
        onRefresh: _loadStats,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildStatCard(
              title: 'Total Companies',
              value: _stats!['total_companies']?.toString() ?? '0',
              icon: Icons.business,
              color: AppTheme.primary,
            ),
            const SizedBox(height: 12),
            _buildStatCard(
              title: 'Active Companies',
              value: _stats!['active_companies']?.toString() ?? '0',
              icon: Icons.check_circle_outline,
              color: AppTheme.success,
            ),
            const SizedBox(height: 12),
            _buildStatCard(
              title: 'Total Users',
              value: _stats!['total_users']?.toString() ?? '0',
              icon: Icons.people_outline,
              color: AppTheme.accent,
            ),
          ],
        ),
      );
    }

    // Normal company dashboard
    return RefreshIndicator(
      onRefresh: _loadStats,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              _buildGridCard(
                title: 'Today\'s Sales',
                value: '₹${_stats!['today_sales'] ?? 0}',
                icon: Icons.payments_outlined,
                color: AppTheme.success,
              ),
              _buildGridCard(
                title: 'Monthly Sales',
                value: '₹${_stats!['monthly_sales'] ?? 0}',
                icon: Icons.trending_up,
                color: AppTheme.primary,
              ),
              _buildGridCard(
                title: 'Total Products',
                value: _stats!['total_products']?.toString() ?? '0',
                icon: Icons.inventory_2_outlined,
                color: AppTheme.accent,
              ),
              _buildGridCard(
                title: 'Low Stock',
                value: _stats!['low_stock_items']?.toString() ?? '0',
                icon: Icons.warning_amber_rounded,
                color: AppTheme.warning,
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          const Text(
            'Recent Invoices',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          
          if (_stats!['recent_invoices'] != null && (_stats!['recent_invoices'] as List).isNotEmpty)
            ...(_stats!['recent_invoices'] as List).map((inv) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppTheme.primary.withOpacity(0.1),
                  child: const Icon(Icons.receipt_long, color: AppTheme.primary),
                ),
                title: Text(inv['invoice_number'] ?? 'Unknown'),
                subtitle: Text(inv['customer_name'] ?? 'Walk-in'),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '₹${inv['total_amount']}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    Text(
                      inv['status']?.toUpperCase() ?? '',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: inv['status'] == 'paid' 
                            ? AppTheme.success 
                            : AppTheme.warning,
                      ),
                    ),
                  ],
                ),
              ),
            ))
          else
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24.0),
                child: Text('No recent invoices'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGridCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
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
            child: Icon(icon, color: color, size: 24),
          ),
          const Spacer(),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
