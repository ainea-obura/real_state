import { AlarmClock, Banknote, Building2, Calendar, FileText, Package } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { fetchReportSummary } from '@/actions/reports';
import FeatureCard from '@/features/property/tabs/components/featureCard';

interface ReportSummaryCardsProps {
  dateRange?: { from: Date; to?: Date };
}

export function ReportSummaryCards({ dateRange }: ReportSummaryCardsProps) {
  const [data, setData] = useState<null | any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchReportSummary(dateRange)
      .then((res) => {
        if (mounted) {
          setData(res.results[0]);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || "Failed to load summary");
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
        Loading summary...
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
  if (!data) return null;

  const cards = [
    {
      icon: Banknote,
      title: "Total Income Collected",
      value: data.total_income, // Already formatted with currency from backend
      desc: "All properties",
    },
    {
      icon: Package,
      title: "Total Expenses",
      value: data.total_expense, // Already formatted with currency from backend
      desc: "All properties",
    },
    {
      icon: FileText,
      title: "Net Profit",
      value: data.net_profit, // Already formatted with currency from backend
      desc: "After expenses",
    },
    {
      icon: Calendar,
      title: "Number of Paid Rents",
      value: data.paid_rents, // String representation from backend
      desc: "This period",
    },
    {
      icon: AlarmClock,
      title: "Overdue Payments",
      value: data.overdue_payments, // String representation from backend
      desc: "Needs attention",
    },
    {
      icon: Building2,
      title: "Properties Covered",
      value: data.properties_managed, // String representation from backend
      desc: "Active",
    },
  ];

  return (
    <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-8">
      {cards.map((card, i) => (
        <div
          key={card.title + i}
          className="bg-white hover:bg-primary/10 shadow-md hover:shadow-lg p-0 border rounded-2xl transition-all duration-300"
        >
          <FeatureCard {...card} />
        </div>
      ))}
    </div>
  );
}
