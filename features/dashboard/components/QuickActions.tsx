"use client";
import {
    AlertTriangle, Building2, Calendar, DollarSign, FileText, Plus, Receipt, Settings, Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { mockDashboardData } from '../schema/dashboard';

export const QuickActions = () => {
  const actions = mockDashboardData.quickActions;

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "Building2":
        return Building2;
      case "FileText":
        return FileText;
      case "Users":
        return Users;
      case "Receipt":
        return Receipt;
      case "DollarSign":
        return DollarSign;
      case "Calendar":
        return Calendar;
      case "AlertTriangle":
        return AlertTriangle;
      case "Settings":
        return Settings;
      default:
        return Plus;
    }
  };

  return (
    <Card className="relative bg-teal-50 hover:bg-teal-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="bg-teal-200 p-2 rounded-lg">
            <Plus className="w-5 h-5 text-teal-600" />
          </div>
          Quick Actions
        </CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const IconComponent = getIconComponent(action.icon);

          return (
            <Button
              key={index}
              variant="ghost"
              className="justify-start gap-3 hover:bg-teal-200/50 p-3 w-full h-auto transition-colors"
              onClick={() => (window.location.href = action.href)}
            >
              <div className={`p-2 rounded-lg ${action.color} bg-opacity-10`}>
                <IconComponent
                  className={`w-4 h-4 ${action.color.replace("bg-", "text-")}`}
                />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm">{action.title}</span>
                <span className="text-gray-500 text-xs">
                  {action.description}
                </span>
              </div>
            </Button>
          );
        })}

        <div className="pt-3 border-t border-teal-200">
          <Button variant="outline" className="w-full" size="sm">
            View All Actions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
