from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, F, Q
from datetime import datetime, timedelta, date
from collections import defaultdict


def get_date_range(period, start_date=None, end_date=None):
    today = date.today()
    if period == 'today':
        return today, today
    elif period == 'week':
        return today - timedelta(days=6), today
    elif period == 'month':
        return today.replace(day=1), today
    elif period == 'quarter':
        q_month = ((today.month - 1) // 3) * 3 + 1
        return today.replace(month=q_month, day=1), today
    elif period == 'year':
        return today.replace(month=1, day=1), today
    elif period == 'custom' and start_date and end_date:
        try:
            return (
                datetime.strptime(start_date, '%Y-%m-%d').date(),
                datetime.strptime(end_date, '%Y-%m-%d').date(),
            )
        except ValueError:
            pass
    # default last 30 days
    return today - timedelta(days=29), today


def group_key(d, period):
    """Return grouping key string for a date based on period."""
    if period in ('today', 'week', 'custom'):
        return str(d)  # YYYY-MM-DD
    elif period == 'year':
        return str(d.year)  # YYYY
    else:
        return f"{d.year}-{d.month:02d}"  # YYYY-MM for month/quarter


class SalesReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from sales.models import SalesInvoice, InvoiceItem

        period = request.query_params.get('period', 'month')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        date_from, date_to = get_date_range(period, start_date, end_date)

        invoices = SalesInvoice.objects.filter(
            invoice_date__gte=date_from,
            invoice_date__lte=date_to
        ).exclude(status='cancelled')

        # Summary
        total_revenue = float(invoices.aggregate(t=Sum('total_amount'))['t'] or 0)
        paid_revenue = float(invoices.aggregate(t=Sum('paid_amount'))['t'] or 0)
        pending_revenue = float(invoices.aggregate(t=Sum('balance_due'))['t'] or 0)
        total_invoices = invoices.count()

        # Period grouping (Python-level to avoid SQLite TruncDate issues)
        invoice_rows = invoices.values('invoice_date', 'total_amount')
        period_totals = defaultdict(lambda: {'total': 0.0, 'count': 0})
        for row in invoice_rows:
            key = group_key(row['invoice_date'], period)
            period_totals[key]['total'] += float(row['total_amount'] or 0)
            period_totals[key]['count'] += 1

        daily_sales = [
            {'date': k, 'total': v['total'], 'count': v['count']}
            for k, v in sorted(period_totals.items())
        ]

        # Top products by revenue
        top_products_qs = InvoiceItem.objects.filter(
            invoice__invoice_date__gte=date_from,
            invoice__invoice_date__lte=date_to
        ).exclude(invoice__status='cancelled').values(
            'product__id', 'product__name', 'product__sku'
        ).annotate(
            qty_sold=Sum('quantity'),
            revenue=Sum('total_price')
        ).order_by('-revenue')[:10]

        top_products = [
            {
                'id': item['product__id'],
                'name': item['product__name'],
                'sku': item['product__sku'],
                'qty_sold': item['qty_sold'],
                'revenue': float(item['revenue'] or 0),
            }
            for item in top_products_qs
        ]

        # Status breakdown
        by_status = invoices.values('status').annotate(
            count=Count('id'),
            amount=Sum('total_amount')
        )
        status_breakdown = {
            item['status']: {
                'count': item['count'],
                'amount': float(item['amount'] or 0),
            }
            for item in by_status
        }

        return Response({
            'date_range': {'from': str(date_from), 'to': str(date_to)},
            'total_revenue': total_revenue,
            'total_invoices': total_invoices,
            'paid_revenue': paid_revenue,
            'pending_revenue': pending_revenue,
            'daily_sales': daily_sales,
            'top_products': top_products,
            'status_breakdown': status_breakdown,
        })


class InventoryReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from inventory.models import Product, Category, StockTransaction

        products = Product.objects.filter(is_active=True)
        total_products = products.count()
        low_stock_count = products.filter(current_stock__lte=F('min_stock_level')).count()
        out_of_stock = products.filter(current_stock=0).count()
        total_stock_value = float(
            products.aggregate(value=Sum(F('current_stock') * F('purchase_price')))['value'] or 0
        )
        total_retail_value = float(
            products.aggregate(value=Sum(F('current_stock') * F('selling_price')))['value'] or 0
        )

        by_category = Category.objects.annotate(
            product_count=Count('products', filter=Q(products__is_active=True)),
            total_stock=Sum('products__current_stock', filter=Q(products__is_active=True)),
            stock_value=Sum(
                F('products__current_stock') * F('products__purchase_price'),
                filter=Q(products__is_active=True)
            )
        ).values('id', 'name', 'product_count', 'total_stock', 'stock_value')

        low_stock_products = products.filter(
            current_stock__lte=F('min_stock_level')
        ).select_related('category').values(
            'id', 'name', 'sku', 'current_stock', 'min_stock_level', 'category__name'
        ).order_by('current_stock')[:20]

        recent_transactions = StockTransaction.objects.select_related('product').order_by(
            '-created_at'
        )[:20].values('product__name', 'transaction_type', 'quantity', 'reference_id', 'created_at')

        return Response({
            'summary': {
                'total_products': total_products,
                'low_stock_count': low_stock_count,
                'out_of_stock': out_of_stock,
                'total_stock_value': total_stock_value,
                'total_retail_value': total_retail_value,
                'potential_profit': total_retail_value - total_stock_value,
            },
            'by_category': [
                {
                    'id': item['id'],
                    'name': item['name'],
                    'product_count': item['product_count'] or 0,
                    'total_stock': item['total_stock'] or 0,
                    'stock_value': float(item['stock_value'] or 0),
                }
                for item in by_category
            ],
            'low_stock_products': list(low_stock_products),
            'recent_transactions': [
                {
                    'product': item['product__name'],
                    'type': item['transaction_type'],
                    'quantity': item['quantity'],
                    'reference': item['reference_id'],
                    'date': str(item['created_at']),
                }
                for item in recent_transactions
            ],
        })


class FinancialReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from sales.models import SalesInvoice, Customer
        from purchases.models import Purchase, Supplier

        period = request.query_params.get('period', 'month')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        date_from, date_to = get_date_range(period, start_date, end_date)

        invoices = SalesInvoice.objects.filter(
            invoice_date__gte=date_from,
            invoice_date__lte=date_to
        ).exclude(status='cancelled')

        revenue = float(invoices.aggregate(t=Sum('total_amount'))['t'] or 0)
        collected = float(invoices.aggregate(t=Sum('paid_amount'))['t'] or 0)
        receivables = float(invoices.aggregate(t=Sum('balance_due'))['t'] or 0)

        purchases = Purchase.objects.filter(
            purchase_date__gte=date_from,
            purchase_date__lte=date_to
        )
        cogs = float(purchases.aggregate(t=Sum('total_amount'))['t'] or 0)

        gross_profit = revenue - cogs

        # Customer credit (total outstanding credit balances)
        customer_credit = float(
            Customer.objects.aggregate(t=Sum('credit_balance'))['t'] or 0
        )

        # Monthly breakdown (Python-level grouping)
        inv_rows = invoices.values('invoice_date', 'total_amount')
        pur_rows = purchases.values('purchase_date', 'total_amount')

        monthly_rev = defaultdict(float)
        monthly_cogs = defaultdict(float)

        for row in inv_rows:
            key = f"{row['invoice_date'].year}-{row['invoice_date'].month:02d}"
            monthly_rev[key] += float(row['total_amount'] or 0)
        for row in pur_rows:
            key = f"{row['purchase_date'].year}-{row['purchase_date'].month:02d}"
            monthly_cogs[key] += float(row['total_amount'] or 0)

        all_months = sorted(set(list(monthly_rev.keys()) + list(monthly_cogs.keys())))
        monthly_breakdown = [
            {
                'month': m,
                'revenue': monthly_rev.get(m, 0.0),
                'cogs': monthly_cogs.get(m, 0.0),
            }
            for m in all_months
        ]

        # Supplier pending payments
        supplier_pending = Supplier.objects.filter(
            purchases__status__in=['pending', 'partial'],
            purchases__purchase_date__gte=date_from,
            purchases__purchase_date__lte=date_to
        ).annotate(
            pending=Sum('purchases__balance_due')
        ).values('id', 'name', 'pending').order_by('-pending')[:10]

        return Response({
            'date_range': {'from': str(date_from), 'to': str(date_to)},
            'revenue': revenue,
            'cogs': cogs,
            'gross_profit': gross_profit,
            'collected': collected,
            'receivables': receivables,
            'customer_credit': customer_credit,
            'monthly_breakdown': monthly_breakdown,
            'supplier_pending': [
                {'id': s['id'], 'name': s['name'], 'pending': float(s['pending'] or 0)}
                for s in supplier_pending
            ],
        })


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from sales.models import SalesInvoice, InvoiceItem, Customer
        from purchases.models import Purchase, Supplier
        from inventory.models import Product

        today = date.today()
        month_start = today.replace(day=1)

        today_invoices = SalesInvoice.objects.filter(invoice_date=today).exclude(status='cancelled')
        today_sales = float(today_invoices.aggregate(t=Sum('total_amount'))['t'] or 0)
        today_invoice_count = today_invoices.count()

        month_invoices = SalesInvoice.objects.filter(
            invoice_date__gte=month_start
        ).exclude(status='cancelled')
        month_sales = float(month_invoices.aggregate(t=Sum('total_amount'))['t'] or 0)

        month_purchases = float(
            Purchase.objects.filter(purchase_date__gte=month_start).aggregate(t=Sum('total_amount'))['t'] or 0
        )

        total_receivables = float(
            SalesInvoice.objects.filter(status__in=['pending', 'partial']).aggregate(t=Sum('balance_due'))['t'] or 0
        )
        total_payables = float(
            Purchase.objects.filter(status__in=['pending', 'partial']).aggregate(t=Sum('balance_due'))['t'] or 0
        )

        products = Product.objects.filter(is_active=True)
        total_products = products.count()
        low_stock = products.filter(current_stock__lte=F('min_stock_level')).count()
        out_of_stock = products.filter(current_stock=0).count()
        inventory_value = float(
            products.aggregate(value=Sum(F('current_stock') * F('purchase_price')))['value'] or 0
        )

        total_customers = Customer.objects.filter(is_active=True).count()
        total_suppliers = Supplier.objects.filter(is_active=True).count()

        # Last 7 days sales
        last_7_days = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_total = float(
                SalesInvoice.objects.filter(invoice_date=day).exclude(status='cancelled').aggregate(t=Sum('total_amount'))['t'] or 0
            )
            last_7_days.append({'date': str(day), 'total': day_total})

        top_products = InvoiceItem.objects.filter(
            invoice__invoice_date__gte=month_start
        ).exclude(invoice__status='cancelled').values(
            'product__name', 'product__sku'
        ).annotate(
            qty_sold=Sum('quantity'),
            revenue=Sum('total_price')
        ).order_by('-revenue')[:5]

        pending_invoices = SalesInvoice.objects.filter(
            status__in=['pending', 'partial']
        ).order_by('-invoice_date')[:5].values(
            'invoice_number', 'customer__name', 'total_amount', 'balance_due', 'invoice_date'
        )

        return Response({
            'today': {
                'sales': today_sales,
                'invoice_count': today_invoice_count,
            },
            'this_month': {
                'sales': month_sales,
                'purchases': month_purchases,
                'profit': month_sales - month_purchases,
            },
            'outstanding': {
                'receivables': total_receivables,
                'payables': total_payables,
            },
            'inventory': {
                'total_products': total_products,
                'low_stock': low_stock,
                'out_of_stock': out_of_stock,
                'total_value': inventory_value,
            },
            'counters': {
                'customers': total_customers,
                'suppliers': total_suppliers,
            },
            'sales_chart': last_7_days,
            'top_products': list(top_products),
            'pending_invoices': list(pending_invoices),
        })
