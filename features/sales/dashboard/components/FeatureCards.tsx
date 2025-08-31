import { AlertCircle, Building2, DollarSign, TrendingUp } from 'lucide-react';

import { fetchFeatureCards } from '@/actions/sales/featureCards';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { useQuery } from '@tanstack/react-query';

interface FeatureCardsProps {
  startDate?: string;
  endDate?: string;
  projectId?: string;
}

const FeatureCards = ({ startDate, endDate, projectId }: FeatureCardsProps) => {
  // Fetch feature cards data
  const {
    data: featureCardsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["feature-cards", startDate, endDate, projectId],
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
          <div key={i} className="bg-gray-100 rounded-lg h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  // Extract data with fallback to 0 values if no data or error
  const data = featureCardsData?.success ? featureCardsData.data : null;
  const total_listings = data?.total_listings || 0;
  const sold_units = data?.sold_units || 0;
  const total_revenue = data?.total_revenue || 0;
  const outstanding_payments = data?.outstanding_payments || 0;

  // Show error message as a banner above the cards instead of replacing them
  const showErrorBanner = error || !featureCardsData?.success;

  return (
    <div className="space-y-4">
      {/* Error Banner - only show if there's an error */}
      {showErrorBanner && (
        <div className="bg-yellow-50 p-3 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium text-sm">
              {featureCardsData?.message ||
                "Using fallback data - some information may be unavailable"}
            </span>
          </div>
        </div>
      )}

      {/* Feature Cards Grid */}
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={Building2}
          title="Total Listings"
          value={total_listings.toLocaleString()}
          desc="Active sale listings"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Sold Units"
          value={sold_units.toLocaleString()}
          desc="Total sold units"
        />
        <FeatureCard
          icon={DollarSign}
          title="Total Revenue"
          value={money(total_revenue)}
        />
        <FeatureCard
          icon={AlertCircle}
          title="Outstanding Payments"
          value={money(outstanding_payments)}
          desc="Unpaid from installments"
        />
      </div>
    </div>
  );
};

export default FeatureCards;
