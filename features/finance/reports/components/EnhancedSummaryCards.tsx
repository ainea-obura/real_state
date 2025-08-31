"use client";

import { Banknote, FileText, Package } from 'lucide-react';
import React from 'react';

import FeatureCard from '@/features/property/tabs/components/featureCard';

interface SummaryData {
  // Financial Metrics
  totalIncome: string;
  totalExpenses: string;
  netProfit: string;
}

interface EnhancedSummaryCardsProps {
  data: SummaryData;
  isLoading?: boolean;
}

export function EnhancedSummaryCards({
  data,
  isLoading = false,
}: EnhancedSummaryCardsProps) {
  const cards = [
    {
      title: "Total Collections",
      value: data.totalIncome,
      icon: Banknote,
      desc: "All revenue streams",
    },
    {
      title: "Total Expenditures",
      value: data.totalExpenses,
      icon: Package,
      desc: "All operational costs",
    },
    {
      title: "Balance",
      value: data.netProfit,
      icon: FileText,
      desc: "Net profit after expenses",
    },
  ];

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="mb-4 text-center">
          <p className="text-muted-foreground text-sm">
            🔄 Refreshing financial data...
          </p>
        </div>
        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-4 p-4 border rounded-lg w-full min-h-26">
                <div className="bg-gray-200 p-3.5 rounded-lg w-5 h-5"></div>
                <div className="flex flex-col w-full min-w-0">
                  <div className="bg-gray-200 mb-2 rounded h-4"></div>
                  <div className="bg-gray-200 mb-2 rounded h-8"></div>
                  <div className="bg-gray-200 rounded h-3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon;

          return (
            <FeatureCard
              key={index}
              icon={Icon}
              title={card.title}
              value={card.value}
              desc={card.desc}
            />
          );
        })}
      </div>
    </div>
  );
}
