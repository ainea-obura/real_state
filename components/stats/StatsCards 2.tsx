import React from 'react';

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

const StatsCard = ({ 
  icon: Icon, 
  title, 
  value, 
  isLoading, 
  isError, 
  errorMessage 
}: StatsCardProps) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">Loading...</p>
          </div>
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-red-600">
              {errorMessage || "Error"}
            </p>
          </div>
          <Icon className="w-8 h-8 text-red-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-blue-500" />
      </div>
    </div>
  );
};

export default StatsCard; 