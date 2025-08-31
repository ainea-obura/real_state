import { fetchServiceSummaryReport } from '@/actions/reports';
import { useQuery } from '@tanstack/react-query';

import { ServiceSummaryReportFilters, ServiceSummaryReportResponse } from '../schema';

interface UseServiceSummaryReportOptions extends ServiceSummaryReportFilters {
  enabled?: boolean;
}

export const useServiceSummaryReport = (
  options: UseServiceSummaryReportOptions = {}
) => {
  const { project, month, year, enabled = true } = options;

  return useQuery<ServiceSummaryReportResponse["data"]>({
    queryKey: ["service-summary-report", project, month, year],
    queryFn: () => fetchServiceSummaryReport({ project, month, year }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
