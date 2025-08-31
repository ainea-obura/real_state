import { LucideIcon } from 'lucide-react';

import FeatureCard from '../../property/tabs/components/featureCard';

interface Stat {
  icon?: LucideIcon;
  title: string;
  value: string | number;
  desc?: string;
}

interface StatisticsBarProps {
  stats: Stat[];
}

const StatisticsBar = ({ stats }: StatisticsBarProps) => (
  <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 mb-6">
    {stats.map((stat, i) => (
      <FeatureCard key={stat.title + i} {...stat} />
    ))}
  </div>
);

export default StatisticsBar;
