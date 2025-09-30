"use client";

import { Download, FileSpreadsheet, FileText, Scale } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { fetchBalanceSheetReport } from "@/actions/reports";
import { generateBalanceSheetPDF } from "@/lib/pdf-utils";

interface BalanceSheetReportCardProps {
  dateRange?: {
    from: Date;
    to?: Date;
  };
}

export function BalanceSheetReportCard({ dateRange }: BalanceSheetReportCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const loadReportData = async () => {
    if (reportData) return; // Don't reload if already loaded
    
    setIsLoading(true);
    try {
      const data = await fetchBalanceSheetReport(dateRange);
      setReportData(data);
    } catch (error) {
      toast.error("Failed to load Balance Sheet report");
      console.error("Error loading Balance Sheet report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!reportData) return;
    
    try {
      generateBalanceSheetPDF(reportData);
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
        ["Balance Sheet Report"],
        [`Period: ${reportData.period.from} to ${reportData.period.to}`],
        [""],
        ["ASSETS"],
        ["Current Assets"],
        ["Receivables", reportData.assets.current_assets.receivables],
        ["Cash", reportData.assets.current_assets.cash],
        ["Total Current Assets", reportData.assets.current_assets.total_current],
        [""],
        ["Fixed Assets"],
        ["Property", reportData.assets.fixed_assets.property],
        ["Equipment", reportData.assets.fixed_assets.equipment],
        ["Total Fixed Assets", reportData.assets.fixed_assets.total_fixed],
        [""],
        ["TOTAL ASSETS", reportData.assets.total_assets],
        [""],
        ["LIABILITIES"],
        ["Current Liabilities"],
        ["Payables", reportData.liabilities.current_liabilities.payables],
        ["Accrued Expenses", reportData.liabilities.current_liabilities.accrued_expenses],
        ["Total Current Liabilities", reportData.liabilities.current_liabilities.total_current],
        [""],
        ["Long-term Liabilities"],
        ["Loans", reportData.liabilities.long_term_liabilities.loans],
        ["Total Long-term Liabilities", reportData.liabilities.long_term_liabilities.total_long_term],
        [""],
        ["TOTAL LIABILITIES", reportData.liabilities.total_liabilities],
        [""],
        ["EQUITY"],
        ["Retained Earnings", reportData.equity.retained_earnings],
        ["TOTAL EQUITY", reportData.equity.total_equity]
      ];

      // Convert to CSV
      const csvContent = excelData.map(row => row.join(",")).join("\n");
      
      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `balance-sheet-report-${reportData.period.from}.csv`);
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
          <Scale className="h-4 w-4 text-purple-600" />
          Balance Sheet Report
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
              Click to load Balance Sheet report data
            </p>
            <Button onClick={loadReportData} disabled={isLoading}>
              {isLoading ? "Loading..." : "Load Report"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-green-600">Assets</h4>
                <div className="text-xs text-muted-foreground ml-4">
                  <div className="font-medium">Current Assets:</div>
                  <div className="ml-2">Receivables: {reportData.assets.current_assets.receivables}</div>
                  <div className="ml-2">Cash: {reportData.assets.current_assets.cash}</div>
                  <div className="ml-2 font-medium">Total Current: {reportData.assets.current_assets.total_current}</div>
                  
                  <div className="font-medium mt-2">Fixed Assets:</div>
                  <div className="ml-2">Property: {reportData.assets.fixed_assets.property}</div>
                  <div className="ml-2">Equipment: {reportData.assets.fixed_assets.equipment}</div>
                  <div className="ml-2 font-medium">Total Fixed: {reportData.assets.fixed_assets.total_fixed}</div>
                  
                  <div className="font-bold mt-2">Total Assets: {reportData.assets.total_assets}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-600">Liabilities</h4>
                <div className="text-xs text-muted-foreground ml-4">
                  <div className="font-medium">Current Liabilities:</div>
                  <div className="ml-2">Payables: {reportData.liabilities.current_liabilities.payables}</div>
                  <div className="ml-2">Accrued Expenses: {reportData.liabilities.current_liabilities.accrued_expenses}</div>
                  <div className="ml-2 font-medium">Total Current: {reportData.liabilities.current_liabilities.total_current}</div>
                  
                  <div className="font-medium mt-2">Long-term Liabilities:</div>
                  <div className="ml-2">Loans: {reportData.liabilities.long_term_liabilities.loans}</div>
                  <div className="ml-2 font-medium">Total Long-term: {reportData.liabilities.long_term_liabilities.total_long_term}</div>
                  
                  <div className="font-bold mt-2">Total Liabilities: {reportData.liabilities.total_liabilities}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-600">Equity</h4>
                <div className="text-xs text-muted-foreground ml-4">
                  <div>Retained Earnings: {reportData.equity.retained_earnings}</div>
                  <div className="font-bold">Total Equity: {reportData.equity.total_equity}</div>
                </div>
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
