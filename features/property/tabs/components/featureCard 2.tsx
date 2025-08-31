import { LucideIcon } from 'lucide-react';
import { FC } from 'react';

interface FeatureCardProps {
  icon?: LucideIcon | FC;
  title: string;
  value: string | number;
  desc?: string;
}

const FeatureCard = ({ icon: Icon, title, value, desc }: FeatureCardProps) => {
  return (
    <div className="flex gap-4 items-center p-4 w-full rounded-lg border transition-all duration-300 ease-in-out cursor-pointer hover:bg-primary/10 hover:shadow-sm min-h-26">
      <div className="bg-primary/10 p-3.5 rounded-lg text-secondary-foreground">
        {Icon && <Icon className="w-5 h-5" />}
      </div>

      <div className="flex flex-col w-full min-w-0">
        <h1 className="text-sm font-medium text-gray-500 truncate">{title}</h1>
        {desc && <p className="text-sm text-gray-400 truncate">{desc}</p>}
        <p className="mt-0.5 font-semibold text-primary">{value}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
