import { useQuery } from '@tanstack/react-query';
import { getChoices } from '../api/choices';

export default function useChoices() {
  const { data, isLoading } = useQuery({
    queryKey: ['choices'],
    queryFn: () => getChoices().then(r => r.data),
    staleTime: Infinity, // enum choices never change at runtime
  });

  return {
    isLoading,
    paymentMethods: data?.payment_methods || [],
    paymentTypes: data?.payment_types || [],
    referenceTypes: data?.reference_types || [],
    returnTypes: data?.return_types || [],
    stockTransactionTypes: data?.stock_transaction_types || [],
    invoiceStatuses: data?.invoice_statuses || [],
    purchaseStatuses: data?.purchase_statuses || [],
    permissionCategories: data?.permission_categories || [],
  };
}
