"use client";

import React from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
    ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';

export interface ChartLineMultipleProps {
  chartData: Array<Record<string, string | number>>;
  chartConfig: ChartConfig;
  title: string;
  description?: string;
  footer?: React.ReactNode;
}

export function ChartLineMultiple({
  chartData,
  chartConfig,
  footer,
}: ChartLineMultipleProps) {
  return (
    <Card className="bg-transparent shadow-none border-none">
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(1)}K`;
                }
                return value.toLocaleString();
              }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {Object.entries(chartConfig).map(([key, cfg]) =>
              typeof cfg.label === "string" ? (
                <Line
                  key={key}
                  dataKey={key}
                  type="monotone"
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={{ fill: cfg.color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  name={cfg.label}
                  connectNulls={false}
                />
              ) : null
            )}
          </LineChart>
        </ChartContainer>
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
