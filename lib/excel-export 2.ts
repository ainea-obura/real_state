import * as XLSX from 'xlsx';

export interface ServiceSummaryExcelData {
  summary: {
    totalCollected: string;
    totalExpense: string;
    totalManagementFee: string;
    balance: string;
  };
  services: Array<{
    name: string;
    type: string;
    frequency: string;
    billedTo: string;
    description: string;
    monthly_breakdown: Array<{
      month: number;
      month_name: string;
      year: number;
      value: string;
    }>;
    total: number;
    attached_projects: Array<{
      id: string;
      name: string;
    }>;
  }>;
  projectBreakdowns: {
    collections: Array<{ project: string; project_id: string; amount: string }>;
    expenses: Array<{ project: string; project_id: string; amount: string }>;
    managementFees: Array<{
      project: string;
      project_id: string;
      amount: string;
    }>;
    balance: Array<{ project: string; project_id: string; amount: string }>;
  };
  appliedFilters: {
    project: string;
    month: string;
    year: number;
  };
}

export const exportServiceSummaryToExcel = (data: ServiceSummaryExcelData) => {
  // Check if we're in browser environment
  if (typeof window === "undefined") {
    throw new Error("Excel export can only be used in browser environment");
  }

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary Statistics
  const summaryData = [
    ["Service Summary Report - Summary Statistics"],
    [""],
    ["Metric", "Amount"],
    ["Total Collected", data.summary.totalCollected],
    ["Total Expenses", data.summary.totalExpense],
    ["Management Fee", data.summary.totalManagementFee],
    ["Balance", data.summary.balance],
    [""],
    ["Filters Applied:"],
    [
      "Project",
      data.appliedFilters.project === "all"
        ? "All Projects"
        : data.appliedFilters.project,
    ],
    [
      "Month",
      data.appliedFilters.month === "all"
        ? "All Months"
        : data.appliedFilters.month,
    ],
    ["Year", data.appliedFilters.year],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary Statistics");

  // Sheet 2: Services Breakdown
  const servicesData = [];

  // Get all available months from services data
  const allMonths = new Set<string>();
  data.services.forEach((service) => {
    service.monthly_breakdown.forEach((item) => {
      allMonths.add(item.month_name);
    });
  });
  const monthNames = Array.from(allMonths).sort((a, b) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months.indexOf(a) - months.indexOf(b);
  });

  // Header row
  const headerRow = [
    "Service Name",
    "Type",
    "Frequency",
    "Billed To",
    "Description",
    ...monthNames,
    "Total",
  ];
  servicesData.push(headerRow);

  // Data rows
  data.services.forEach((service) => {
    const row = [
      service.name,
      service.type,
      service.frequency,
      service.billedTo,
      service.description,
    ];

    // Add monthly values
    monthNames.forEach((monthName) => {
      const monthData = service.monthly_breakdown.find(
        (item) => item.month_name === monthName
      );
      row.push(monthData ? monthData.value : "KES 0");
    });

    // Add total
    row.push(`KES ${service.total.toLocaleString()}`);

    servicesData.push(row);
  });

  // Add totals row
  const totalsRow = ["TOTAL", "", "", "", ""];
  monthNames.forEach((monthName) => {
    const monthTotal = data.services.reduce((sum, service) => {
      const monthData = service.monthly_breakdown.find(
        (item) => item.month_name === monthName
      );
      if (monthData) {
        const amount = parseFloat(monthData.value.replace(/[^\d.-]/g, "")) || 0;
        return sum + amount;
      }
      return sum;
    }, 0);
    totalsRow.push(`KES ${monthTotal.toLocaleString()}`);
  });

  const grandTotal = data.services.reduce(
    (sum, service) => sum + service.total,
    0
  );
  totalsRow.push(`KES ${grandTotal.toLocaleString()}`);
  servicesData.push(totalsRow);

  const servicesSheet = XLSX.utils.aoa_to_sheet(servicesData);
  XLSX.utils.book_append_sheet(workbook, servicesSheet, "Services Breakdown");

  // Sheet 3: Project Breakdowns
  const projectBreakdownData = [
    ["Service Summary Report - Project Breakdowns"],
    [""],
    ["Category", "Project", "Amount"],
  ];

  // Collections breakdown
  projectBreakdownData.push(["", "COLLECTIONS", ""]);
  data.projectBreakdowns.collections.forEach((item) => {
    projectBreakdownData.push(["", item.project, item.amount]);
  });

  projectBreakdownData.push(["", "", ""]);

  // Expenses breakdown
  projectBreakdownData.push(["", "EXPENSES", ""]);
  data.projectBreakdowns.expenses.forEach((item) => {
    projectBreakdownData.push(["", item.project, item.amount]);
  });

  projectBreakdownData.push(["", "", ""]);

  // Management Fees breakdown
  projectBreakdownData.push(["", "MANAGEMENT FEES", ""]);
  data.projectBreakdowns.managementFees.forEach((item) => {
    projectBreakdownData.push(["", item.project, item.amount]);
  });

  projectBreakdownData.push(["", "", ""]);

  // Balance breakdown
  projectBreakdownData.push(["", "BALANCE", ""]);
  data.projectBreakdowns.balance.forEach((item) => {
    projectBreakdownData.push(["", item.project, item.amount]);
  });

  const projectBreakdownSheet = XLSX.utils.aoa_to_sheet(projectBreakdownData);
  XLSX.utils.book_append_sheet(
    workbook,
    projectBreakdownSheet,
    "Project Breakdowns"
  );

  // Generate filename with current date and filters
  const date = new Date().toISOString().split("T")[0];
  const projectFilter =
    data.appliedFilters.project === "all"
      ? "All-Projects"
      : data.appliedFilters.project;
  const monthFilter =
    data.appliedFilters.month === "all"
      ? "All-Months"
      : data.appliedFilters.month;
  const filename = `Service-Summary-Report_${projectFilter}_${monthFilter}_${data.appliedFilters.year}_${date}.xlsx`;

  // Convert workbook to blob for browser download
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return filename;
};

// Generic function to export any report data to Excel
export const exportReportToExcel = (
  reportName: string,
  kpis: Record<string, any>,
  tableData: any[],
  dateRange?: { from: string; to: string }
) => {
  // Check if we're in browser environment
  if (typeof window === "undefined") {
    throw new Error("Excel export can only be used in browser environment");
  }

  const workbook = XLSX.utils.book_new();

  // Sheet 1: KPIs Summary
  const kpiData = [
    [`${reportName} - Key Performance Indicators`],
    [""],
    ["Metric", "Value"],
  ];

  // Add KPIs
  Object.entries(kpis).forEach(([key, value]) => {
    const formattedKey = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());

    let formattedValue = value;
    if (typeof value === "number") {
      if (
        key.toLowerCase().includes("rate") ||
        key.toLowerCase().includes("percent")
      ) {
        formattedValue = `${value.toFixed(1)}%`;
      } else if (
        key.toLowerCase().includes("amount") ||
        key.toLowerCase().includes("total") ||
        key.toLowerCase().includes("pending") ||
        key.toLowerCase().includes("paid")
      ) {
        formattedValue = `KES ${value.toLocaleString()}`;
      }
    }

    kpiData.push([formattedKey, formattedValue]);
  });

  // Add date range if provided
  if (dateRange) {
    kpiData.push(["", ""]);
    kpiData.push(["Date Range", `${dateRange.from} to ${dateRange.to}`]);
  }

  const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
  XLSX.utils.book_append_sheet(workbook, kpiSheet, "KPIs Summary");

  // Sheet 2: Detailed Data
  if (tableData && tableData.length > 0) {
    const tableHeaders = Object.keys(tableData[0]);
    const tableRows = [tableHeaders];

    tableData.forEach((row) => {
      const rowData = tableHeaders.map((header) => {
        const value = row[header];
        if (value && typeof value === "object") {
          // Handle nested objects (like agent info)
          if (value.name && value.phone && value.email) {
            return `${value.name} (${value.phone}, ${value.email})`;
          }
          return JSON.stringify(value);
        }
        return value;
      });
      tableRows.push(rowData);
    });

    const tableSheet = XLSX.utils.aoa_to_sheet(tableRows);
    XLSX.utils.book_append_sheet(workbook, tableSheet, "Detailed Data");
  }

  // Generate filename
  const date = new Date().toISOString().split("T")[0];
  const dateRangeStr = dateRange ? `_${dateRange.from}_to_${dateRange.to}` : "";
  const filename = `${reportName.replace(
    /\s+/g,
    "-"
  )}_${date}${dateRangeStr}.xlsx`;

  // Convert workbook to blob for browser download
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return filename;
};
