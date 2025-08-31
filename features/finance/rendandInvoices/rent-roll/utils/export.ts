import type { RentRollProperty } from "../schema";

// Types for export data
export interface ExportData {
  properties: RentRollProperty[];
  summary: {
    total_properties: number;
    occupied_properties: number;
    vacant_properties: number;
    rent_expected: string;
    total_expected: string;
    collected: string;
  };
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  exportDate: Date;
}

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Helper function to get status badge text
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    paid: "Paid",
    unpaid: "Unpaid",
    partial: "Partial",
    late: "Late",
    vacant: "Vacant",
  };
  return statusMap[status] || status;
};

// Helper function to generate filename with date range
const generateFilename = (
  format: string,
  dateRange?: { from?: Date; to?: Date }
) => {
  const baseName = "rent-roll";
  const date = new Date().toISOString().split("T")[0];

  if (dateRange?.from && dateRange?.to) {
    const fromDate = dateRange.from.toISOString().split("T")[0];
    const toDate = dateRange.to.toISOString().split("T")[0];
    return `${baseName}-${fromDate}-to-${toDate}.${format.toLowerCase()}`;
  }

  return `${baseName}-${date}.${format.toLowerCase()}`;
};

// Prepare data for CSV export
export const prepareCSVData = (data: ExportData): string => {
  const headers = [
    "Property",
    "Property Type",
    "Project",
    "Tenant",
    "Contact",
    "Lease Start",
    "Lease End",
    "Monthly Rent",
    "Due Date",
    "Next Due Date",
    "Balance",
    "Rent Amount",
    "Services",
    "Penalties",
    "Total Paid",
    "Status",
    "Payment Progress",
  ];

  const rows = data.properties.map((property) => [
    property.property,
    property.propertyType,
    property.projectName,
    property.tenantName,
    property.tenantContact || "-",
    formatDate(property.leaseStart),
    formatDate(property.leaseEnd),
    property.monthlyRent,
    formatDate(property.dueDate),
    formatDate(property.nextDueDate),
    property.balance,
    property.rentAmount,
    property.servicesAmount,
    property.penaltiesAmount,
    property.totalPaid,
    getStatusText(property.status),
    `${property.paymentProgress}%`,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csvContent;
};

// Prepare data for Excel export
export const prepareExcelData = (data: ExportData) => {
  // For Excel, we'll create a more structured format with multiple sheets
  const mainSheetData = data.properties.map((property) => ({
    Property: property.property,
    "Property Type": property.propertyType,
    Project: property.projectName,
    Tenant: property.tenantName,
    Contact: property.tenantContact || "-",
    "Lease Start": formatDate(property.leaseStart),
    "Lease End": formatDate(property.leaseEnd),
    "Monthly Rent": property.monthlyRent,
    "Due Date": formatDate(property.dueDate),
    "Next Due Date": formatDate(property.nextDueDate),
    Balance: property.balance,
    "Rent Amount": property.rentAmount,
    Services: property.servicesAmount,
    Penalties: property.penaltiesAmount,
    "Total Paid": property.totalPaid,
    Status: getStatusText(property.status),
    "Payment Progress": `${property.paymentProgress}%`,
  }));

  const summaryData = [
    {
      Metric: "Total Properties",
      Value: data.summary.total_properties,
    },
    {
      Metric: "Occupied Properties",
      Value: data.summary.occupied_properties,
    },
    {
      Metric: "Vacant Properties",
      Value: data.summary.vacant_properties,
    },
    {
      Metric: "Rent Expected",
      Value: parseFloat(data.summary.rent_expected),
    },
    {
      Metric: "Total Expected",
      Value: parseFloat(data.summary.total_expected),
    },
    {
      Metric: "Collected",
      Value: parseFloat(data.summary.collected),
    },
  ];

  return {
    mainSheet: mainSheetData,
    summarySheet: summaryData,
  };
};

// Prepare data for PDF export
export const preparePDFData = (data: ExportData) => {
  const summary = {
    totalProperties: data.summary.total_properties,
    occupiedProperties: data.summary.occupied_properties,
    vacantProperties: data.summary.vacant_properties,
    rentExpected: parseFloat(data.summary.rent_expected),
    totalExpected: parseFloat(data.summary.total_expected),
    collected: parseFloat(data.summary.collected),
    occupancyRate:
      data.summary.total_properties > 0
        ? Math.round(
            (data.summary.occupied_properties / data.summary.total_properties) *
              100
          )
        : 0,
    collectionRate:
      parseFloat(data.summary.total_expected) > 0
        ? Math.round(
            (parseFloat(data.summary.collected) /
              parseFloat(data.summary.total_expected)) *
              100
          )
        : 0,
  };

  const properties = data.properties.map((property) => ({
    property: property.property,
    propertyType: property.propertyType,
    project: property.projectName,
    tenant: property.tenantName,
    contact: property.tenantContact || "-",
    leaseStart: formatDate(property.leaseStart),
    leaseEnd: formatDate(property.leaseEnd),
    monthlyRent: property.monthlyRent,
    dueDate: formatDate(property.dueDate),
    nextDueDate: formatDate(property.nextDueDate),
    balance: property.balance,
    rentAmount: property.rentAmount,
    services: property.servicesAmount,
    penalties: property.penaltiesAmount,
    totalPaid: property.totalPaid,
    status: getStatusText(property.status),
    paymentProgress: `${property.paymentProgress}%`,
  }));

  return {
    summary,
    properties,
    exportDate: data.exportDate,
    dateRange: data.dateRange,
  };
};

// Export functions
export const exportToCSV = (data: ExportData) => {
  const csvContent = prepareCSVData(data);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", generateFilename("CSV", data.dateRange));
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (data: ExportData) => {
  // For Excel export, we'll use a library like xlsx
  // This is a placeholder - you'll need to install and import xlsx
  
  

  // TODO: Implement actual Excel export with xlsx library
  // import * as XLSX from 'xlsx';
  // const workbook = XLSX.utils.book_new();
  // const mainSheet = XLSX.utils.json_to_sheet(prepareExcelData(data).mainSheet);
  // const summarySheet = XLSX.utils.json_to_sheet(prepareExcelData(data).summarySheet);
  // XLSX.utils.book_append_sheet(workbook, mainSheet, "Rent Roll");
  // XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  // XLSX.writeFile(workbook, `rent-roll-${new Date().toISOString().split("T")[0]}.xlsx`);
};

export const exportToPDF = (data: ExportData) => {
  // For PDF export, we'll use a library like jsPDF
  // This is a placeholder - you'll need to install and import jsPDF
  
  

  // TODO: Implement actual PDF export with jsPDF library
  // import jsPDF from 'jspdf';
  // import 'jspdf-autotable';
  // const doc = new jsPDF();
  // const pdfData = preparePDFData(data);
  //
  // // Add title
  // doc.setFontSize(20);
  // doc.text("Rent Roll Report", 14, 22);
  //
  // // Add summary
  // doc.setFontSize(12);
  // doc.text(`Total Properties: ${pdfData.summary.totalProperties}`, 14, 40);
  // doc.text(`Occupied: ${pdfData.summary.occupiedProperties}`, 14, 50);
  // doc.text(`Vacant: ${pdfData.summary.vacantProperties}`, 14, 60);
  // doc.text(`Occupancy Rate: ${pdfData.summary.occupancyRate}%`, 14, 70);
  // doc.text(`Collection Rate: ${pdfData.summary.collectionRate}%`, 14, 80);
  //
  // // Add table
  // const tableData = pdfData.properties.map(p => [
  //   p.property, p.tenant, p.monthlyRent, p.balance, p.status
  // ]);
  // doc.autoTable({
  //   head: [['Property', 'Tenant', 'Rent', 'Balance', 'Status']],
  //   body: tableData,
  //   startY: 100,
  // });
  //
  // doc.save(`rent-roll-${new Date().toISOString().split("T")[0]}.pdf`);
};

// Main export function
export const exportRentRoll = (
  format: "CSV" | "Excel" | "PDF",
  data: ExportData
) => {
  try {
    // Validate data
    if (!data.properties || data.properties.length === 0) {
      throw new Error("No properties data available for export");
    }

    if (!data.summary) {
      throw new Error("No summary data available for export");
    }

    switch (format) {
      case "CSV":
        exportToCSV(data);
        break;
      case "Excel":
        exportToExcel(data);
        break;
      case "PDF":
        exportToPDF(data);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    
    throw error;
  }
};
