'use client';

import { useState } from 'react';
import { Calendar, Download, FileText, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SalesSummaryReport from './SalesSummaryReport';
import SalesFinancialReport from './SalesFinancialReport';

const SalesReportsPage = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: new Date() // Today
  });

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setDateRange(prev => ({ ...prev, from: newDate }));
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setDateRange(prev => ({ ...prev, to: newDate }));
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download
    console.log('Download PDF for date range:', dateRange);
  };

  const handleDownloadExcel = () => {
    // TODO: Implement Excel download
    console.log('Download Excel for date range:', dateRange);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive sales analytics and financial statements
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleDownloadExcel}>
            <FileText className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Date Range Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Period
          </CardTitle>
          <CardDescription>
            Select the date range for your sales reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateRange.from.toISOString().split('T')[0]}
                onChange={handleDateFromChange}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateRange.to?.toISOString().split('T')[0] || ''}
                onChange={handleDateToChange}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Sales Summary
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Financial Statement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Summary Report</CardTitle>
              <CardDescription>
                Overview of apartment status, occupancy rates, and key sales metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesSummaryReport dateRange={dateRange} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Financial Statement</CardTitle>
              <CardDescription>
                Detailed financial analysis, revenue breakdown, and performance trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesFinancialReport dateRange={dateRange} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesReportsPage;




