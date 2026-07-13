from django.db import migrations
from decimal import Decimal


def cleanup_cancelled_credit_logs(apps, schema_editor):
    CreditLog = apps.get_model('sales', 'CreditLog')
    Customer = apps.get_model('sales', 'Customer')

    stale_logs = CreditLog.objects.filter(invoice__status='cancelled')
    for log in stale_logs:
        if log.customer_id and log.remaining_balance > 0:
            try:
                customer = Customer.objects.get(pk=log.customer_id)
                customer.credit_balance = max(
                    customer.credit_balance - log.remaining_balance,
                    Decimal('0')
                )
                customer.save()
            except Customer.DoesNotExist:
                pass
        log.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0006_alter_salesinvoice_invoice_date'),
    ]

    operations = [
        migrations.RunPython(cleanup_cancelled_credit_logs, migrations.RunPython.noop),
    ]
