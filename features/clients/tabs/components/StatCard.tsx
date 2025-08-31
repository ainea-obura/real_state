import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatCard = ({ 
  icon: Icon, 
  title, 
  value, 
  description, 
  trend, 
  className 
}: StatCardProps) => {
  return (
    <div className={cn(
      "rounded-lg p-6 shadow-md",
      "bg-[var(--secondary)] text-[var(--card-foreground)]",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {value}
          </p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "+" : "-"}{trend.value}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard; 