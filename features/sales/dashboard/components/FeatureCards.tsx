import { AlertCircle, Building2, DollarSign, TrendingUp } from 'lucide-react';

import FeatureCard from '@/features/property/tabs/components/featureCard';
import { fetchFeatureCards } from '@/actions/sales/featureCards';
import { useQuery } from '@tanstack/react-query';

interface FeatureCardsProps {
  startDate?: string;
  endDate?: string;
  projectId?: string;
}

const FeatureCards = ({ startDate, endDate, projectId }: FeatureCardsProps) => {
  // Fetch feature cards data
  const { data: featureCardsData, isLoading, error } = useQuery({
    queryKey: ['feature-cards', startDate, endDate, projectId],
    queryFn: () => fetchFeatureCards(startDate, endDate, projectId),
    enabled: true,
  });

  // Helper function to format money
  const money = (x: number | undefined) => {
    if (!x) return "—";
    return `KES ${x.toLocaleString()}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Error state
  if (error || !featureCardsData?.success) {
    return (
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-4 p-4 text-center text-red-500">
          {featureCardsData?.message || 'Failed to load feature cards data'}
        </div>
      </div>
    );
  }

  const { total_listings, sold_units, total_revenue, outstanding_payments } = featureCardsData?.data || {
    total_listings: 0,
    sold_units: 0,
    total_revenue: 0,
    outstanding_payments: 0
  };

  return (
    <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
      <FeatureCard
        icon={Building2}
        title="Total Listings"
        value={(total_listings || 0).toLocaleString()}
        desc="Active sale listings"
      />
      <FeatureCard
        icon={TrendingUp}
        title="Sold Units"
        value={(sold_units || 0).toLocaleString()}
        desc="Total sold units"
      />
      <FeatureCard
        icon={DollarSign}
        title="Total Revenue"
        value={money(total_revenue)}
        desc="Sum of confirmed sales"
      />
      <FeatureCard
        icon={AlertCircle}
        title="Outstanding Payments"
        value={money(outstanding_payments)}
        desc="Unpaid from installments"
      />
    </div>
  );
};

export default FeatureCards;
