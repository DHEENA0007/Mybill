from rest_framework import viewsets
from users.mixins import TenantViewSet, ReadOnlyTenantViewSet, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Q, Sum, F

from .models import (
    Category, Product, StockTransaction, ProductPrefix, 
    ExpenseCategory, ExpenseSubcategory, Expense,
    IncomeCategory, IncomeSubcategory, Income
)
from .serializers import (
    CategorySerializer, ProductSerializer, ProductListSerializer,
    StockTransactionSerializer, StockAdjustmentSerializer,
    ProductPrefixSerializer, ExpenseCategorySerializer, 
    ExpenseSubcategorySerializer, ExpenseSerializer, ExpenseCreateSerializer,
    IncomeCategorySerializer, IncomeSubcategorySerializer, IncomeSerializer, IncomeCreateSerializer
)


class CategoryViewSet(TenantViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class ProductViewSet(TenantViewSet):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'sku', 'barcode', 'category__name']
    ordering_fields = ['name', 'sku', 'selling_price', 'current_stock', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        category = self.request.query_params.get('category')
        low_stock = self.request.query_params.get('low_stock')

        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        if category:
            queryset = queryset.filter(category_id=category)
        if low_stock == 'true':
            queryset = queryset.filter(current_stock__lte=F('min_stock_level'))
        return queryset

    def perform_create(self, serializer):
        from django.db import IntegrityError
        from rest_framework.exceptions import ValidationError

        user = self.request.user
        company = user.company if (getattr(user, 'company_id', None) and not getattr(user, 'is_superuser', False)) else None
        
        try:
            if company:
                product = serializer.save(company=company)
            else:
                product = serializer.save()
        except IntegrityError as e:
            if 'name' in str(e).lower() and 'unique' in str(e).lower():
                raise ValidationError({"name": ["A product with this name already exists."]})
            if 'sku' in str(e).lower() and 'unique' in str(e).lower():
                raise ValidationError({"sku": ["A product with this SKU already exists."]})
            raise ValidationError({"detail": ["Database integrity error. Check for duplicate values."]})

        sku = product.sku
        if sku:
            prefixes = ProductPrefix.objects.filter(company=company)
            for p in prefixes:
                if sku.startswith(p.prefix):
                    num_str = sku[len(p.prefix):]
                    if num_str.isdigit():
                        num = int(num_str)
                        if num > p.current_number:
                            p.current_number = num
                            p.save()
                    break

    @action(detail=False, methods=['get'])
    def low_stock_alert(self, request):
        products = Product.objects.filter(
            is_active=True,
            current_stock__lte=F('min_stock_level')
        ).select_related('category')
        serializer = ProductListSerializer(products, many=True)
        return Response({'count': products.count(), 'results': serializer.data})

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        product = self.get_object()
        serializer = StockAdjustmentSerializer(data=request.data)
        if serializer.is_valid():
            quantity = serializer.validated_data['quantity']
            notes = serializer.validated_data.get('notes', '')
            with transaction.atomic():
                product.current_stock += quantity
                product.save()
                StockTransaction.objects.create(
                    product=product,
                    transaction_type='adjustment',
                    quantity=quantity,
                    notes=notes,
                    created_by=request.user
                )
            return Response({
                'message': f'Stock adjusted. New stock: {product.current_stock}',
                'current_stock': product.current_stock
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def stock_history(self, request, pk=None):
        product = self.get_object()
        transactions = StockTransaction.objects.filter(product=product).order_by('-created_at')
        page = self.paginate_queryset(transactions)
        if page is not None:
            serializer = StockTransactionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = StockTransactionSerializer(transactions, many=True)
        return Response(serializer.data)


class StockTransactionViewSet(ReadOnlyTenantViewSet):
    queryset = StockTransaction.objects.select_related('product', 'created_by').all()
    serializer_class = StockTransactionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['product__name', 'product__sku', 'transaction_type', 'reference_id']
    ordering_fields = ['created_at', 'quantity']

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product')
        transaction_type = self.request.query_params.get('transaction_type')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        return queryset

class ProductPrefixViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductPrefixSerializer

    def get_queryset(self):
        return ProductPrefix.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=True, methods=['get'])
    def next_sku(self, request, pk=None):
        prefix = self.get_object()
        next_num = max(prefix.start_number, prefix.current_number + 1)
        sku = f"{prefix.prefix}{str(next_num).zfill(prefix.padding)}"
        return Response({'sku': sku})

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ExpenseCategorySerializer

    def get_queryset(self):
        return ExpenseCategory.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class ExpenseSubcategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ExpenseSubcategorySerializer
    filterset_fields = ['category']

    def get_queryset(self):
        return ExpenseSubcategory.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class ExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_fields = ['subcategory', 'date']
    search_fields = ['remarks']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = Expense.objects.filter(company=self.request.user.company).select_related('subcategory__category', 'created_by')
        
        # Date range filtering
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
            
        # Category filtering
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(subcategory__category_id=category)
            
        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ExpenseCreateSerializer
        return ExpenseSerializer

    def perform_create(self, serializer):
        serializer.save(
            company=self.request.user.company,
            created_by=self.request.user
        )

class IncomeCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = IncomeCategorySerializer

    def get_queryset(self):
        return IncomeCategory.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class IncomeSubcategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = IncomeSubcategorySerializer
    filterset_fields = ['category']

    def get_queryset(self):
        return IncomeSubcategory.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class IncomeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_fields = ['subcategory', 'date']
    search_fields = ['remarks']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = Income.objects.filter(company=self.request.user.company).select_related('subcategory__category', 'created_by')
        
        # Date range filtering
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
            
        # Category filtering
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(subcategory__category_id=category)
            
        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return IncomeCreateSerializer
        return IncomeSerializer

    def perform_create(self, serializer):
        serializer.save(
            company=self.request.user.company,
            created_by=self.request.user
        )
