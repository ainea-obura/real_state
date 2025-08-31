import { FC } from 'react';
import { LucideIcon } from 'lucide-react';

interface PropertyStatCardProps {
  type: string;
  icon: LucideIcon;
  total: number;
  occupied: number;
  available: number;
}

const PropertyStatCard: FC<PropertyStatCardProps> = ({ type, icon: Icon, total, occupied, available }) => {
  const isTenants = type === 'Tenants';
  return (
    <div className="flex flex-col gap-3 p-4 w-full h-full rounded-md border transition-all duration-300 ease-in-out cursor-pointer hover:bg-primary/10 min-h-32">
      <div className="flex gap-3 items-center mb-2">
        <div className="p-4 rounded-md bg-primary/10 text-secondary-foreground">
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">{type}</span>
      </div>
      <div className="flex flex-row gap-2 justify-between text-center">
        <div className="flex-1">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{total}</div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500">{isTenants ? 'Active' : 'Occupied'}</div>
          <div className={`text-xl font-bold ${isTenants ? 'text-green-600' : 'text-yellow-600'}`}>{occupied}</div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500">{isTenants ? 'Inactive' : 'Available'}</div>
          <div className={`text-xl font-bold ${isTenants ? 'text-red-600' : 'text-green-600'}`}>{available}</div>
        </div>
      </div>
    </div>
  );
};

export default PropertyStatCard; 