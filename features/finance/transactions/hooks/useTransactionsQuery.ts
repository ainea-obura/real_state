import { fetchTransactionsList, TransactionsListParams } from '@/actions/finance/transactions';
import { useQuery } from '@tanstack/react-query';

export function useTransactionsQuery(params: TransactionsListParams) {
  return useQuery({
    queryKey: ["transactions", params],
    queryFn: () => fetchTransactionsList(params),
    // keepPreviousData: true,
  });
}
