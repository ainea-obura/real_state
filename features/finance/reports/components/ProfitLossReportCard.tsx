"use client";

import { Download, FileSpreadsheet, FileText, TrendingUp } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { fetchProfitLossReport } from "@/actions/reports";
import { generateProfitLossPDF } from "@/lib/pdf-utils";

interface ProfitLossReportCardProps {
  dateRange?: {
    from: Date;
    to?: Date;
  };
}

export function ProfitLossReportCard({ dateRange }: ProfitLossReportCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const loadReportData = async () => {
    if (reportData) return; // Don't reload if already loaded
    
    setIsLoading(true);
    try {
      const data = await fetchProfitLossReport(dateRange);
      setReportData(data);
    } catch (error) {
      toast.error("Failed to load Profit & Loss report");
      console.error("Error loading P&L report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!reportData) return;
    
    try {
      generateProfitLossPDF(reportData);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate PDF");
      console.error("Error generating PDF:", error);
    }
  };

  const handleDownloadExcel = () => {
    if (!reportData) return;
    
    try {
      // Create Excel data
      const excelData = [
        ["Profit & Loss Report"],
        [`Period: ${reportData.period.from} to ${reportData.period.to}`],
        [""],
        ["REVENUE"],
        ["Total Revenue", reportData.revenue.total],
        ["Rent", reportData.revenue.rent],
        ["Services", reportData.revenue.services],
        ["Utilities", reportData.revenue.utilities],
        [""],
        ["EXPENSES"],
        ["Total Expenses", reportData.expenses.total],
        ["Management Fees", reportData.expenses.management_fees],
        ["Operating Expenses", reportData.expenses.operating_expenses],
        [""],
        ["PROFIT"],
        ["Gross Profit", reportData.gross_profit],
        ["Net Income", reportData.net_income]
      ];

      // Convert to CSV
      const csvContent = excelData.map(row => row.join(",")).join("\n");
      
      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `profit-loss-report-${reportData.period.from}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Excel file downloaded successfully");
    } catch (error) {
      toast.error("Failed to download Excel file");
      console.error("Error downloading Excel:", error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-600" />
          Profit & Loss Report
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={!reportData}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadExcel}
            disabled={!reportData}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!reportData ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Click to load Profit & Loss report data
            </p>
            <Button onClick={loadReportData} disabled={isLoading}>
              {isLoading ? "Loading..." : "Load Report"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-green-600">Revenue</h4>
                <div className="text-xs text-muted-foreground">
                  <div>Total: {reportData.revenue.total}</div>
                  <div>Rent: {reportData.revenue.rent}</div>
                  <div>Services: {reportData.revenue.services}</div>
                  <div>Utilities: {reportData.revenue.utilities}</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-600">Expenses</h4>
                <div className="text-xs text-muted-foreground">
                  <div>Total: {reportData.expenses.total}</div>
                  <div>Management Fees: {reportData.expenses.management_fees}</div>
                  <div>Operating: {reportData.expenses.operating_expenses}</div>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Net Income:</span>
                <span className={`text-lg font-bold ${
                  reportData.net_income.includes('-') ? 'text-red-600' : 'text-green-600'
                }`}>
                  {reportData.net_income}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium">Gross Profit:</span>
                <span className="text-lg font-bold text-green-600">
                  {reportData.gross_profit}
                </span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Period: {reportData.period.from} to {reportData.period.to}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
