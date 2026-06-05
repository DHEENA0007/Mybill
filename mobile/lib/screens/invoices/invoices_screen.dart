import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../config/theme.dart';

class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({super.key});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  List<dynamic> _invoices = [];
  bool _isLoading = true;
  int _page = 1;
  bool _hasNext = false;
  String _statusFilter = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadInvoices();
  }

  Future<void> _loadInvoices({bool append = false}) async {
    if (!append) setState(() => _isLoading = true);
    try {
      final res = await api.getInvoices(
        page: _page,
        search: _searchController.text,
        status: _statusFilter,
      );
      final data = res.data;
      final results = (data['results'] ?? data) as List;
      setState(() {
        if (append) {
          _invoices.addAll(results);
        } else {
          _invoices = results;
        }
        _hasNext = data['next'] != null;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'paid':
        return AppTheme.success;
      case 'partial':
        return AppTheme.warning;
      case 'cancelled':
        return AppTheme.danger;
      default:
        return AppTheme.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoices'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search invoices...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _page = 1;
                          _loadInvoices();
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppTheme.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              onSubmitted: (_) {
                _page = 1;
                _loadInvoices();
              },
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Status Filter Chips
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                _filterChip('All', ''),
                _filterChip('Paid', 'paid'),
                _filterChip('Partial', 'partial'),
                _filterChip('Unpaid', 'unpaid'),
                _filterChip('Cancelled', 'cancelled'),
              ],
            ),
          ),
          // Invoice List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _invoices.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.receipt_long_outlined, size: 64, color: AppTheme.border),
                            const SizedBox(height: 16),
                            const Text('No invoices found', style: TextStyle(color: AppTheme.textSecondary, fontSize: 16)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () {
                          _page = 1;
                          return _loadInvoices();
                        },
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _invoices.length + (_hasNext ? 1 : 0),
                          itemBuilder: (context, index) {
                            if (index == _invoices.length) {
                              return Center(
                                child: TextButton(
                                  onPressed: () {
                                    _page++;
                                    _loadInvoices(append: true);
                                  },
                                  child: const Text('Load More'),
                                ),
                              );
                            }
                            final inv = _invoices[index];
                            return _buildInvoiceCard(inv);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String label, String value) {
    final isSelected = _statusFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) {
          setState(() => _statusFilter = value);
          _page = 1;
          _loadInvoices();
        },
        selectedColor: AppTheme.primary.withOpacity(0.2),
        checkmarkColor: AppTheme.primary,
        labelStyle: TextStyle(
          color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
    );
  }

  Widget _buildInvoiceCard(dynamic inv) {
    final status = inv['status']?.toString() ?? 'unpaid';
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _showInvoiceDetail(inv),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _statusColor(status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.receipt_long, color: _statusColor(status)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      inv['invoice_number'] ?? '#${inv['id']}',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      inv['customer_name'] ?? 'Walk-in Customer',
                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '₹${inv['total_amount'] ?? '0.00'}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: _statusColor(status).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      status.toUpperCase(),
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _statusColor(status)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showInvoiceDetail(dynamic inv) {
    final items = (inv['items'] as List?) ?? [];
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        builder: (context, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(
              inv['invoice_number'] ?? 'Invoice',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Customer: ${inv['customer_name'] ?? 'Walk-in'}',
              style: const TextStyle(color: AppTheme.textSecondary),
            ),
            Text(
              'Date: ${inv['date'] ?? inv['created_at']?.toString().substring(0, 10) ?? '-'}',
              style: const TextStyle(color: AppTheme.textSecondary),
            ),
            const Divider(height: 32),
            ...items.map((item) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: Text(item['product_name'] ?? 'Product', style: const TextStyle(fontWeight: FontWeight.w500)),
                  ),
                  Expanded(child: Text('×${item['quantity']}', textAlign: TextAlign.center)),
                  Expanded(
                    flex: 2,
                    child: Text('₹${item['total'] ?? item['line_total'] ?? '0.00'}', textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            )),
            const Divider(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                Text('₹${inv['total_amount'] ?? '0.00'}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primary)),
              ],
            ),
            if (inv['paid_amount'] != null) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Paid', style: TextStyle(color: AppTheme.success)),
                  Text('₹${inv['paid_amount']}', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.success)),
                ],
              ),
            ],
            if (inv['balance_due'] != null && double.tryParse(inv['balance_due'].toString()) != 0) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Balance Due', style: TextStyle(color: AppTheme.warning)),
                  Text('₹${inv['balance_due']}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.warning)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}
