import { Building2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { fetchPropertySummary } from '@/actions/reports';

import { PropertySummaryItem } from './schema';
import { extractNumericValue, formatCurrency } from './utils/moneyFormatting';

interface PropertyBreakdownTableProps {
  dateRange?: { from: Date; to?: Date };
}

export function PropertyBreakdownTable({
  dateRange,
}: PropertyBreakdownTableProps) {
  const [data, setData] = useState<PropertySummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchPropertySummary(dateRange)
      .then((res) => {
        if (mounted) {
          setData(res.results);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || "Failed to load property summary");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        Loading property summary...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex justify-center items-center h-32 text-red-600">
        {error}
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center h-32 text-muted-foreground">
        No property data available.
      </div>
    );
  }

  // Calculate totals using utility functions
  const totalIncome = data.reduce(
    (sum, p) => sum + extractNumericValue(p.total_income),
    0
  );
  const totalExpenses = data.reduce(
    (sum, p) => sum + extractNumericValue(p.total_expense),
    0
  );
  const totalNet = data.reduce((sum, p) => sum + extractNumericValue(p.net), 0);

  return (
    <div className="bg-white shadow-md mb-8 p-0 border rounded-2xl overflow-hidden transition-all duration-300">
      <div className="flex items-center gap-2 px-6 pt-6 pb-2">
        <Building2 className="w-5 h-5 text-primary/80" />
        <span className="font-semibold text-primary text-lg">
          Per Property Summary
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary/5 font-semibold text-primary text-left">
            <th className="px-6 py-3">Property Name</th>
            <th className="px-6 py-3">Total Income</th>
            <th className="px-6 py-3">Expenses</th>
            <th className="px-6 py-3">Net</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.property_id}
              className={
                i % 2 === 0
                  ? "bg-white border-b last:border-0"
                  : "bg-muted/50 border-b last:border-0"
              }
            >
              <td className="flex items-center gap-2 px-6 py-3 font-medium text-gray-900">
                <Building2 className="w-4 h-4 text-primary/60" />
                {row.property_name}
              </td>
              <td className="px-6 py-3 font-semibold text-green-700">
                {row.total_income}
              </td>
              <td className="px-6 py-3 font-semibold text-red-600">
                {row.total_expense}
              </td>
              <td className="px-6 py-3 font-bold text-primary">{row.net}</td>
            </tr>
          ))}
          <tr className="bg-primary/10 border-t">
            <td className="px-6 py-3 font-bold text-primary">Total</td>
            <td className="px-6 py-3 font-bold text-green-800">
              {formatCurrency(totalIncome)}
            </td>
            <td className="px-6 py-3 font-bold text-red-800">
              {formatCurrency(totalExpenses)}
            </td>
            <td className="px-6 py-3 font-bold text-primary">
              {formatCurrency(totalNet)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
