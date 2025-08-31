import { Coins, Star, TrendingUp } from 'lucide-react';

import FeatureCard from '@/features/property/tabs/components/featureCard';

interface CurrencyStatCardsProps {
  stats?: {
    totalCurrencies?: number;
    defaultCurrency?: string;
    mostUsedCurrency?: string;
    mostUsedCount?: number;
  };
}

const statCards = (stats: CurrencyStatCardsProps["stats"]) => [
  {
    icon: Coins,
    title: "Total Currencies",
    value: stats?.totalCurrencies ?? "-",
    desc: "All supported currencies",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100 text-blue-600",
  },
  {
    icon: Star,
    title: "Default Currency",
    value: stats?.defaultCurrency ?? "-",
    desc: "Used for new invoices",
    bg: "bg-yellow-50",
    iconBg: "bg-yellow-100 text-yellow-600",
  },
  {
    icon: TrendingUp,
    title: "Most Used",
    value: stats?.mostUsedCurrency ?? "-",
    desc: "Most frequent in transactions",
    bg: "bg-green-50",
    iconBg: "bg-green-100 text-green-600",
  },
  {
    icon: Coins,
    title: "Most Used Count",
    value: stats?.mostUsedCount ?? "-",
    desc: "Usage in invoices",
    bg: "bg-purple-50",
    iconBg: "bg-purple-100 text-purple-600",
  },
];

const CurrencyStatCards = ({ stats }: CurrencyStatCardsProps) => (
  <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
    {statCards(stats).map((card) => (
      <div key={card.title} className={card.bg + " rounded-lg"}>
        <FeatureCard
          icon={card.icon}
          title={card.title}
          value={card.value}
          desc={card.desc}
        />
      </div>
    ))}
  </div>
);

export default CurrencyStatCards; 