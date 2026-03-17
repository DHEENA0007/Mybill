"""
Management command to create initial superuser and demo data.

Usage:
    python manage.py setup_initial_data
    python manage.py setup_initial_data --superuser-only
    python manage.py setup_initial_data --demo-data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
import random
from datetime import date, timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Create initial superuser, roles, permissions, and optionally demo data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--superuser-only',
            action='store_true',
            help='Only create superuser and roles/permissions',
        )
        parser.add_argument(
            '--demo-data',
            action='store_true',
            help='Create full demo data (categories, products, suppliers, customers, etc.)',
        )
        parser.add_argument(
            '--username',
            type=str,
            default='admin',
            help='Superuser username (default: admin)',
        )
        parser.add_argument(
            '--email',
            type=str,
            default='admin@billing.local',
            help='Superuser email',
        )
        parser.add_argument(
            '--password',
            type=str,
            default='admin123',
            help='Superuser password (default: admin123)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting initial data setup..."))

        # Always create superuser and roles
        self._create_superuser(options)
        self._create_roles_and_permissions()

        if options.get('demo_data') or not options.get('superuser_only'):
            self._create_demo_data()

        self.stdout.write(self.style.SUCCESS("Initial data setup complete!"))

    def _create_superuser(self, options):
        username = options['username']
        email = options['email']
        password = options['password']

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"Superuser '{username}' already exists. Skipping."))
            return

        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name='System',
            last_name='Admin',
        )
        self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' created with password '{password}'."))

        # Create a regular staff user
        if not User.objects.filter(username='manager').exists():
            manager = User.objects.create_user(
                username='manager',
                email='manager@billing.local',
                password='manager123',
                first_name='Store',
                last_name='Manager',
                is_staff=True,
            )
            self.stdout.write(self.style.SUCCESS("Manager user created (username: manager, password: manager123)."))

        if not User.objects.filter(username='staff').exists():
            staff = User.objects.create_user(
                username='staff',
                email='staff@billing.local',
                password='staff123',
                first_name='Sales',
                last_name='Staff',
            )
            self.stdout.write(self.style.SUCCESS("Staff user created (username: staff, password: staff123)."))

    def _create_roles_and_permissions(self):
        from users.models import Role, Permission, RolePermission, UserRole

        # Define permissions
        permissions_data = [
            # Inventory
            ('View Products', 'inventory.view_products', 'inventory'),
            ('Add Products', 'inventory.add_products', 'inventory'),
            ('Edit Products', 'inventory.edit_products', 'inventory'),
            ('Delete Products', 'inventory.delete_products', 'inventory'),
            ('Manage Categories', 'inventory.manage_categories', 'inventory'),
            ('Adjust Stock', 'inventory.adjust_stock', 'inventory'),
            # Sales
            ('View Invoices', 'sales.view_invoices', 'sales'),
            ('Create Invoices', 'sales.create_invoices', 'sales'),
            ('Edit Invoices', 'sales.edit_invoices', 'sales'),
            ('Cancel Invoices', 'sales.cancel_invoices', 'sales'),
            ('Manage Customers', 'sales.manage_customers', 'sales'),
            # Purchases
            ('View Purchases', 'purchases.view_purchases', 'purchases'),
            ('Create Purchases', 'purchases.create_purchases', 'purchases'),
            ('Edit Purchases', 'purchases.edit_purchases', 'purchases'),
            ('Manage Suppliers', 'purchases.manage_suppliers', 'purchases'),
            # Returns
            ('Process Returns', 'returns.process_returns', 'returns'),
            ('View Returns', 'returns.view_returns', 'returns'),
            # Financial
            ('View Payments', 'financial.view_payments', 'financial'),
            ('Record Payments', 'financial.record_payments', 'financial'),
            ('View Reports', 'financial.view_reports', 'financial'),
            ('View Financial Reports', 'financial.view_financial_reports', 'financial'),
            # Users
            ('Manage Users', 'users.manage_users', 'users'),
            ('Manage Roles', 'users.manage_roles', 'users'),
        ]

        created_perms = {}
        for name, codename, category in permissions_data:
            perm, created = Permission.objects.get_or_create(
                codename=codename,
                defaults={'name': name, 'category': category}
            )
            created_perms[codename] = perm
            if created:
                self.stdout.write(f"  Created permission: {codename}")

        # Create roles
        roles_data = {
            'Admin': {
                'description': 'Full system access',
                'permissions': list(created_perms.keys()),
            },
            'Manager': {
                'description': 'Store manager - all except user management',
                'permissions': [k for k in created_perms.keys() if not k.startswith('users.')],
            },
            'Sales Staff': {
                'description': 'Can create invoices and view inventory',
                'permissions': [
                    'inventory.view_products', 'sales.view_invoices', 'sales.create_invoices',
                    'sales.manage_customers', 'financial.view_payments', 'financial.record_payments',
                    'returns.view_returns', 'returns.process_returns',
                ],
            },
            'Purchase Staff': {
                'description': 'Can manage purchases',
                'permissions': [
                    'inventory.view_products', 'inventory.adjust_stock',
                    'purchases.view_purchases', 'purchases.create_purchases',
                    'purchases.edit_purchases', 'purchases.manage_suppliers',
                    'returns.view_returns', 'returns.process_returns',
                ],
            },
            'Accountant': {
                'description': 'Financial reports and payments',
                'permissions': [
                    'financial.view_payments', 'financial.record_payments',
                    'financial.view_reports', 'financial.view_financial_reports',
                    'sales.view_invoices', 'purchases.view_purchases',
                ],
            },
        }

        for role_name, role_data in roles_data.items():
            role, created = Role.objects.get_or_create(
                name=role_name,
                defaults={'description': role_data['description']}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created role: {role_name}"))

            for codename in role_data['permissions']:
                if codename in created_perms:
                    RolePermission.objects.get_or_create(role=role, permission=created_perms[codename])

        # Assign Admin role to superuser
        try:
            admin_user = User.objects.get(username='admin')
            admin_role = Role.objects.get(name='Admin')
            UserRole.objects.get_or_create(user=admin_user, role=admin_role)

            manager_user = User.objects.get(username='manager')
            manager_role = Role.objects.get(name='Manager')
            UserRole.objects.get_or_create(user=manager_user, role=manager_role)

            staff_user = User.objects.get(username='staff')
            sales_role = Role.objects.get(name='Sales Staff')
            UserRole.objects.get_or_create(user=staff_user, role=sales_role)
        except (User.DoesNotExist, Role.DoesNotExist):
            pass

        self.stdout.write(self.style.SUCCESS("Roles and permissions configured."))

    def _create_demo_data(self):
        self.stdout.write(self.style.NOTICE("Creating demo data..."))
        self._create_categories_and_products()
        self._create_suppliers()
        self._create_customers()
        self._create_demo_purchases()
        self._create_demo_invoices()
        self.stdout.write(self.style.SUCCESS("Demo data created!"))

    def _create_categories_and_products(self):
        from inventory.models import Category, Product

        categories_data = [
            ('Electronics', 'Electronic devices and accessories'),
            ('Mobile Phones', 'Smartphones and accessories'),
            ('Laptops & Computers', 'Laptops, desktops, and peripherals'),
            ('Clothing', 'Apparel and fashion items'),
            ('Food & Beverages', 'Packaged food and drinks'),
            ('Stationery', 'Office and school supplies'),
            ('Home Appliances', 'Household appliances'),
        ]

        categories = {}
        for name, desc in categories_data:
            cat, _ = Category.objects.get_or_create(name=name, defaults={'description': desc})
            categories[name] = cat

        products_data = [
            ('Samsung Galaxy A54', 'MOB-001', categories['Mobile Phones'], 15000, 18500, 50, 5, '8901234567890'),
            ('iPhone 14', 'MOB-002', categories['Mobile Phones'], 65000, 72000, 20, 3, '8901234567891'),
            ('OnePlus Nord 3', 'MOB-003', categories['Mobile Phones'], 28000, 32000, 35, 5, '8901234567892'),
            ('Dell Inspiron 15', 'LAP-001', categories['Laptops & Computers'], 45000, 52000, 15, 3, '8901234567893'),
            ('HP Pavilion x360', 'LAP-002', categories['Laptops & Computers'], 52000, 60000, 10, 2, '8901234567894'),
            ('Lenovo IdeaPad 3', 'LAP-003', categories['Laptops & Computers'], 38000, 44000, 12, 3, '8901234567895'),
            ('Wireless Mouse', 'ACC-001', categories['Electronics'], 800, 1200, 100, 20, '8901234567896'),
            ('USB-C Hub', 'ACC-002', categories['Electronics'], 1200, 1800, 80, 15, '8901234567897'),
            ('Bluetooth Earphones', 'ACC-003', categories['Electronics'], 2500, 3500, 60, 10, '8901234567898'),
            ('Mechanical Keyboard', 'ACC-004', categories['Electronics'], 3500, 4800, 40, 8, '8901234567899'),
            ('Men\'s T-Shirt (M)', 'CLO-001', categories['Clothing'], 250, 499, 200, 30, '8901234567900'),
            ('Women\'s Kurti', 'CLO-002', categories['Clothing'], 450, 899, 150, 25, '8901234567901'),
            ('Jeans (32W)', 'CLO-003', categories['Clothing'], 800, 1499, 100, 20, '8901234567902'),
            ('A4 Paper (500 sheets)', 'STA-001', categories['Stationery'], 180, 280, 500, 100, '8901234567903'),
            ('Ball Pen Pack (10)', 'STA-002', categories['Stationery'], 40, 75, 300, 50, '8901234567904'),
            ('Notebook (200 pages)', 'STA-003', categories['Stationery'], 60, 120, 400, 80, '8901234567905'),
            ('Mineral Water 1L', 'FOD-001', categories['Food & Beverages'], 12, 20, 1000, 200, '8901234567906'),
            ('Biscuits Pack', 'FOD-002', categories['Food & Beverages'], 25, 40, 500, 100, '8901234567907'),
            ('Washing Machine 7kg', 'APP-001', categories['Home Appliances'], 18000, 22000, 8, 2, '8901234567908'),
            ('Air Conditioner 1.5T', 'APP-002', categories['Home Appliances'], 28000, 35000, 5, 1, '8901234567909'),
        ]

        for name, sku, category, pp, sp, stock, min_stock, barcode in products_data:
            product, created = Product.objects.get_or_create(
                sku=sku,
                defaults={
                    'name': name,
                    'category': category,
                    'purchase_price': pp,
                    'selling_price': sp,
                    'current_stock': stock,
                    'min_stock_level': min_stock,
                    'barcode': barcode,
                    'is_active': True,
                }
            )
            if created:
                self.stdout.write(f"  Product: {name}")

        self.stdout.write(self.style.SUCCESS(f"Products created."))

    def _create_suppliers(self):
        from purchases.models import Supplier

        suppliers_data = [
            ('Tech World Distributors', '9876543210', 'techworld@supplier.com', '123 Electronic Market, Mumbai', '27AAPFT1234A1Z5'),
            ('Mobile Hub India', '9876543211', 'mobilehub@supplier.com', '456 Phone Street, Delhi', '07AAPFT1234A1Z6'),
            ('Fashion Depot', '9876543212', 'fashion@supplier.com', '789 Garment Road, Surat', '24AAPFT1234A1Z7'),
            ('Office Supplies Co.', '9876543213', 'office@supplier.com', '321 Stationery Lane, Chennai', '33AAPFT1234A1Z8'),
            ('FMCG Traders', '9876543214', 'fmcg@supplier.com', '654 Market Street, Hyderabad', '36AAPFT1234A1Z9'),
            ('Appliance World', '9876543215', 'appliance@supplier.com', '987 Home Center, Bangalore', '29AAPFT1234A1Z0'),
        ]

        for name, phone, email, address, gst in suppliers_data:
            Supplier.objects.get_or_create(
                name=name,
                defaults={
                    'phone': phone,
                    'email': email,
                    'address': address,
                    'gst_number': gst,
                }
            )
        self.stdout.write(self.style.SUCCESS(f"Suppliers created."))

    def _create_customers(self):
        from sales.models import Customer

        customers_data = [
            ('Rajesh Kumar', '9123456789', 'rajesh@gmail.com', '12 MG Road, Bangalore'),
            ('Priya Sharma', '9123456790', 'priya@gmail.com', '34 Park Street, Kolkata'),
            ('Amit Patel', '9123456791', 'amit@gmail.com', '56 CG Road, Ahmedabad'),
            ('Sunita Devi', '9123456792', 'sunita@gmail.com', '78 Linking Road, Mumbai'),
            ('Vijay Singh', '9123456793', 'vijay@gmail.com', '90 Connaught Place, Delhi'),
            ('Meera Nair', '9123456794', 'meera@gmail.com', '23 Brigade Road, Bangalore'),
            ('Karan Mehta', '9123456795', 'karan@gmail.com', '45 Jubilee Hills, Hyderabad'),
            ('Anita Reddy', '9123456796', 'anita@gmail.com', '67 Anna Nagar, Chennai'),
            ('Suresh Gupta', '9123456797', 'suresh@gmail.com', '89 Salt Lake, Kolkata'),
            ('Pooja Joshi', '9123456798', 'pooja@gmail.com', '11 Banjara Hills, Hyderabad'),
            ('Walk-in Customer', None, None, None),
        ]

        for name, phone, email, address in customers_data:
            Customer.objects.get_or_create(
                name=name,
                defaults={
                    'phone': phone,
                    'email': email,
                    'address': address,
                }
            )
        self.stdout.write(self.style.SUCCESS(f"Customers created."))

    def _create_demo_purchases(self):
        from purchases.models import Supplier, Purchase, PurchaseItem
        from inventory.models import Product, StockTransaction

        # Reset stock for demo purposes
        admin_user = User.objects.filter(is_superuser=True).first()
        suppliers = list(Supplier.objects.all())
        products = list(Product.objects.all())

        if not suppliers or not products:
            return

        today = date.today()

        for i in range(10):
            purchase_date = today - timedelta(days=random.randint(1, 60))
            supplier = random.choice(suppliers)
            paid_pct = random.choice([0, 0.5, 1.0])

            purchase = Purchase.objects.create(
                supplier=supplier,
                purchase_date=purchase_date,
                total_amount=0,
                paid_amount=0,
                balance_due=0,
                status='pending',
                notes=f'Demo purchase {i+1}',
                created_by=admin_user,
            )

            total = Decimal('0')
            selected_products = random.sample(products, min(random.randint(2, 5), len(products)))
            for product in selected_products:
                qty = random.randint(5, 30)
                price = product.purchase_price
                item_total = qty * price
                PurchaseItem.objects.create(
                    purchase=purchase,
                    product=product,
                    quantity=qty,
                    purchase_price=price,
                    total_price=item_total,
                )
                total += item_total

            purchase.total_amount = total
            purchase.paid_amount = total * Decimal(str(paid_pct))
            purchase.balance_due = total - purchase.paid_amount
            if purchase.balance_due <= 0:
                purchase.status = 'paid'
            elif purchase.paid_amount > 0:
                purchase.status = 'partial'
            else:
                purchase.status = 'pending'
            purchase.save()

        self.stdout.write(self.style.SUCCESS("Demo purchases created."))

    def _create_demo_invoices(self):
        from sales.models import Customer, SalesInvoice, InvoiceItem
        from inventory.models import Product, StockTransaction

        admin_user = User.objects.filter(is_superuser=True).first()
        customers = list(Customer.objects.all())
        products = list(Product.objects.filter(current_stock__gt=5))

        if not customers or not products:
            return

        today = date.today()

        for i in range(20):
            invoice_date = today - timedelta(days=random.randint(0, 45))
            customer = random.choice(customers)
            paid_pct = random.choice([0, 0.5, 1.0])

            # Build unique invoice number for demo
            count_today = SalesInvoice.objects.filter(invoice_date=invoice_date).count() + 1
            inv_num = f"INV-{invoice_date.strftime('%Y%m%d')}-{count_today:04d}"

            invoice = SalesInvoice(
                invoice_number=inv_num,
                customer=customer,
                invoice_date=invoice_date,
                subtotal=0,
                tax_amount=0,
                discount_amount=0,
                total_amount=0,
                paid_amount=0,
                balance_due=0,
                status='pending',
                notes=f'Demo invoice {i+1}',
                created_by=admin_user,
            )
            invoice.save()

            subtotal = Decimal('0')
            tax_total = Decimal('0')
            selected_products = random.sample(products, min(random.randint(1, 4), len(products)))
            for product in selected_products:
                qty = random.randint(1, 5)
                # Check stock
                if product.current_stock < qty:
                    qty = max(1, product.current_stock)
                if qty == 0:
                    continue
                price = product.selling_price
                tax_rate = Decimal('18.0')  # 18% GST
                tax_amt = (price * qty) * (tax_rate / 100)
                total_price = (price * qty) + tax_amt

                InvoiceItem.objects.create(
                    invoice=invoice,
                    product=product,
                    quantity=qty,
                    unit_price=price,
                    tax_rate=tax_rate,
                    total_price=total_price,
                )
                subtotal += price * qty
                tax_total += tax_amt

                # Update stock
                product.current_stock -= qty
                product.save()

                StockTransaction.objects.create(
                    product=product,
                    transaction_type='sale',
                    quantity=-qty,
                    reference_id=inv_num,
                    notes=f'Demo sale {inv_num}'
                )

            invoice.subtotal = subtotal
            invoice.tax_amount = tax_total
            invoice.total_amount = subtotal + tax_total
            invoice.paid_amount = invoice.total_amount * Decimal(str(paid_pct))
            invoice.balance_due = invoice.total_amount - invoice.paid_amount
            if invoice.balance_due <= 0:
                invoice.status = 'paid'
                invoice.balance_due = 0
            elif invoice.paid_amount > 0:
                invoice.status = 'partial'
            else:
                invoice.status = 'pending'
            invoice.save()

        self.stdout.write(self.style.SUCCESS("Demo invoices created."))
