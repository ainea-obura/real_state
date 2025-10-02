import jsPDF from 'jspdf';

export interface PDFReportData {
  title: string;
  period: {
    from: string;
    to: string;
  };
  data: any;
}

export class PDFGenerator {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageHeight: number = 280;
  private margin: number = 20;

  constructor() {
    this.doc = new jsPDF();
  }

  private addHeader(title: string, period: { from: string; to: string }) {
    // Company name
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Trait Property Management Ltd', this.margin, this.currentY);
    this.currentY += 10;

    // Report title
    this.doc.setFontSize(14);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 8;

    // Period
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Period: ${period.from} to ${period.to}`, this.margin, this.currentY);
    this.currentY += 8;

    // Generated date
    this.doc.text(`Generated on: ${new Date().toLocaleDateString('en-US')}`, this.margin, this.currentY);
    this.currentY += 15;

    // Line separator
    this.doc.line(this.margin, this.currentY, 190, this.currentY);
    this.currentY += 10;
  }

  private addSection(title: string, items: { label: string; value: string }[], isSubsection: boolean = false) {
    // Section title
    this.doc.setFontSize(isSubsection ? 10 : 12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 6;

    // Items
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    
    items.forEach(item => {
      if (this.currentY > this.pageHeight) {
        this.doc.addPage();
        this.currentY = 20;
      }

      this.doc.text(item.label, this.margin + (isSubsection ? 10 : 0), this.currentY);
      this.doc.text(item.value, 150, this.currentY);
      this.currentY += 5;
    });

    this.currentY += 5;
  }

  private addTotal(label: string, value: string, isBold: boolean = true) {
    if (this.currentY > this.pageHeight) {
      this.doc.addPage();
      this.currentY = 20;
    }

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    // Add line above total
    this.doc.line(this.margin, this.currentY - 2, 190, this.currentY - 2);
    this.currentY += 3;
    
    this.doc.text(label, this.margin, this.currentY);
    this.doc.text(value, 150, this.currentY);
    this.currentY += 8;
  }

  generateProfitLossReport(data: any): void {
    this.addHeader('Profit & Loss Report', data.period);

    // Revenue section
    this.addSection('REVENUE', [
      { label: 'Total Revenue', value: data.revenue.total },
      { label: 'Rent', value: data.revenue.rent },
      { label: 'Services', value: data.revenue.services },
      { label: 'Utilities', value: data.revenue.utilities }
    ]);

    // Expenses section
    this.addSection('EXPENSES', [
      { label: 'Total Expenses', value: data.expenses.total },
      { label: 'Management Fees', value: data.expenses.management_fees },
      { label: 'Operating Expenses', value: data.expenses.operating_expenses }
    ]);

    // Totals
    this.addTotal('Gross Profit', data.gross_profit);
    this.addTotal('Net Income', data.net_income);

    this.download('profit-loss-report.pdf');
  }

  generateCashFlowReport(data: any): void {
    this.addHeader('Cash Flow Report', data.period);

    // Operating Activities
    this.addSection('OPERATING ACTIVITIES', [
      { label: 'Cash from Rent', value: data.operating_activities.cash_from_rent },
      { label: 'Cash from Services', value: data.operating_activities.cash_from_services },
      { label: 'Operating Expenses', value: data.operating_activities.operating_expenses }
    ]);
    this.addTotal('Net Operating Cash', data.operating_activities.net_operating_cash);

    // Investing Activities
    this.addSection('INVESTING ACTIVITIES', [
      { label: 'Net Investing Cash', value: data.investing_activities.net_investing_cash }
    ]);

    // Financing Activities
    this.addSection('FINANCING ACTIVITIES', [
      { label: 'Net Financing Cash', value: data.financing_activities.net_financing_cash }
    ]);

    // Final total
    this.addTotal('NET CASH FLOW', data.net_cash_flow);

    this.download('cash-flow-report.pdf');
  }

  generateBalanceSheetReport(data: any): void {
    this.addHeader('Balance Sheet Report', data.period);

    // Assets
    this.addSection('ASSETS', [
      { label: 'Current Assets', value: '' }
    ]);
    this.addSection('', [
      { label: 'Receivables', value: data.assets.current_assets.receivables },
      { label: 'Cash', value: data.assets.current_assets.cash }
    ], true);
    this.addTotal('Total Current Assets', data.assets.current_assets.total_current, false);

    this.addSection('', [
      { label: 'Fixed Assets', value: '' }
    ]);
    this.addSection('', [
      { label: 'Property', value: data.assets.fixed_assets.property },
      { label: 'Equipment', value: data.assets.fixed_assets.equipment }
    ], true);
    this.addTotal('Total Fixed Assets', data.assets.fixed_assets.total_fixed, false);
    this.addTotal('TOTAL ASSETS', data.assets.total_assets);

    // Liabilities
    this.addSection('LIABILITIES', [
      { label: 'Current Liabilities', value: '' }
    ]);
    this.addSection('', [
      { label: 'Payables', value: data.liabilities.current_liabilities.payables },
      { label: 'Accrued Expenses', value: data.liabilities.current_liabilities.accrued_expenses }
    ], true);
    this.addTotal('Total Current Liabilities', data.liabilities.current_liabilities.total_current, false);

    this.addSection('', [
      { label: 'Long-term Liabilities', value: '' }
    ]);
    this.addSection('', [
      { label: 'Loans', value: data.liabilities.long_term_liabilities.loans }
    ], true);
    this.addTotal('Total Long-term Liabilities', data.liabilities.long_term_liabilities.total_long_term, false);
    this.addTotal('TOTAL LIABILITIES', data.liabilities.total_liabilities);

    // Equity
    this.addSection('EQUITY', [
      { label: 'Retained Earnings', value: data.equity.retained_earnings }
    ]);
    this.addTotal('TOTAL EQUITY', data.equity.total_equity);

    this.download('balance-sheet-report.pdf');
  }

  private download(filename: string): void {
    this.doc.save(filename);
  }
}

// Utility functions for easy use
export const generateProfitLossPDF = (data: any) => {
  const generator = new PDFGenerator();
  generator.generateProfitLossReport(data);
};

export const generateCashFlowPDF = (data: any) => {
  const generator = new PDFGenerator();
  generator.generateCashFlowReport(data);
};

export const generateBalanceSheetPDF = (data: any) => {
  const generator = new PDFGenerator();
  generator.generateBalanceSheetReport(data);
};




