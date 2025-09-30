"use client";

import { Download, FileSpreadsheet, FileText, DollarSign } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { fetchCashFlowReport } from "@/actions/reports";
import { generateCashFlowPDF } from "@/lib/pdf-utils";

interface CashFlowReportCardProps {
  dateRange?: {
    from: Date;
    to?: Date;
  };
}

export function CashFlowReportCard({ dateRange }: CashFlowReportCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const loadReportData = async () => {
    if (reportData) return; // Don't reload if already loaded
    
    setIsLoading(true);
    try {
      const data = await fetchCashFlowReport(dateRange);
      setReportData(data);
    } catch (error) {
      toast.error("Failed to load Cash Flow report");
      console.error("Error loading Cash Flow report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!reportData) return;
    
    try {
      generateCashFlowPDF(reportData);
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
        ["Cash Flow Report"],
        [`Period: ${reportData.period.from} to ${reportData.period.to}`],
        [""],
        ["OPERATING ACTIVITIES"],
        ["Cash from Rent", reportData.operating_activities.cash_from_rent],
        ["Cash from Services", reportData.operating_activities.cash_from_services],
        ["Operating Expenses", reportData.operating_activities.operating_expenses],
        ["Net Operating Cash", reportData.operating_activities.net_operating_cash],
        [""],
        ["INVESTING ACTIVITIES"],
        ["Net Investing Cash", reportData.investing_activities.net_investing_cash],
        [""],
        ["FINANCING ACTIVITIES"],
        ["Net Financing Cash", reportData.financing_activities.net_financing_cash],
        [""],
        ["NET CASH FLOW", reportData.net_cash_flow]
      ];

      // Convert to CSV
      const csvContent = excelData.map(row => row.join(",")).join("\n");
      
      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `cash-flow-report-${reportData.period.from}.csv`);
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
          <DollarSign className="h-4 w-4 text-blue-600" />
          Cash Flow Report
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
              Click to load Cash Flow report data
            </p>
            <Button onClick={loadReportData} disabled={isLoading}>
              {isLoading ? "Loading..." : "Load Report"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-green-600">Operating Activities</h4>
                <div className="text-xs text-muted-foreground ml-4">
                  <div>Cash from Rent: {reportData.operating_activities.cash_from_rent}</div>
                  <div>Cash from Services: {reportData.operating_activities.cash_from_services}</div>
                  <div>Operating Expenses: {reportData.operating_activities.operating_expenses}</div>
                  <div className="font-medium text-green-600">
                    Net Operating Cash: {reportData.operating_activities.net_operating_cash}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-600">Investing Activities</h4>
                <div className="text-xs text-muted-foreground ml-4">
                  <div>Net Investing Cash: {reportData.investing_activities.net_investing_cash}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-purple-600">Financing Activities</h4>
                <div className="text-xs text-muted-foreground ml-4">
                  <div>Net Financing Cash: {reportData.financing_activities.net_financing_cash}</div>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Net Cash Flow:</span>
                <span className={`text-lg font-bold ${
                  reportData.net_cash_flow.includes('-') ? 'text-red-600' : 'text-green-600'
                }`}>
                  {reportData.net_cash_flow}
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
