import { LucideIcon } from 'lucide-react';

import { Card, CardContent } from './ui/card';

interface StatisticsCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

const StatisticsCard = ({
  title,
  value,
  description,
  icon: Icon,
}: StatisticsCardProps) => {
  return (
    <Card className="relative bg-primary/5 hover:bg-primary/10 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-md">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col justify-between items-start">
                <h3 className="font-medium text-sm">{title}</h3>
                <span className="font-semibold text-2xl tracking-tight">
                  {value}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2">
            <p className="text-gray-500 text-xs">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatisticsCard;
