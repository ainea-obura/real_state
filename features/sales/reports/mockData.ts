export interface SalesPerformanceData {
  kpis: {
    unitsSold: number;
    averageSalePrice: number;
    totalRevenue: number;
    averageTimeToClose: number;
  };
  monthlyData: Array<{
    month: string;
    unitsSold: number;
    revenue: number;
    averagePrice: number;
  }>;
  salesRecords: Array<{
    id: string;
    propertyName: string;
    salePrice: number;
    soldDate: string;
    timeToClose: number;
    project: string;
  }>;
}

export interface SalesTeamPerformanceData {
  kpis: {
    totalDealsClosed: number;
    conversionRate: number;
    avgDealSize: number;
    pipelineVelocity: number;
  };
  salespeople: Array<{
    name: string;
    contracted: number;
    offersSent: number;
    won: number;
    lost: number;
    conversionPercent: number;
    avgDealSize: number;
    revenue: number;
  }>;
}

export interface FinancialCollectionsData {
  kpis: {
    expectedPeriod: number;
    collectedPeriod: number;
    collectionRate: number;
    overdueAmount: number;
  };
  monthlyData: Array<{
    month: string;
    expected: number;
    collected: number;
    overdue: number;
    collectionRate: number;
  }>;
  collectionRecords: Array<{
    id: string;
    projectName: string;
    expectedAmount: number;
    collectedAmount: number;
    dueDate: string;
    status: "on-time" | "overdue" | "partial";
    overdueDays: number;
  }>;
}

export interface OutstandingPaymentsFollowupsData {
  kpis: {
    overdueInvoicesCount: number;
    overdueAmountTotal: number;
    avgDaysOverdue: number;
    leadsWithoutFollowup: number;
  };
  overduePayments: Array<{
    id: string;
    invoiceNumber: string;
    buyer: string;
    buyerPhone: string;
    buyerEmail: string;
    projectName: string;
    propertyInfo: string;
    salesperson: string;
    salespersonPhone: string;
    salespersonEmail: string;
    dueDate: string;
    daysOverdue: number;
    amount: number;
    followUpStatus: string;
    lastReminder: string;
  }>;
}

export const mockSalesPerformanceData: SalesPerformanceData = {
  kpis: {
    unitsSold: 47,
    averageSalePrice: 8500000,
    totalRevenue: 399500000,
    averageTimeToClose: 23,
  },
  monthlyData: [
    { month: "Jan", unitsSold: 3, revenue: 24000000, averagePrice: 8000000 },
    { month: "Feb", unitsSold: 5, revenue: 42500000, averagePrice: 8500000 },
    { month: "Mar", unitsSold: 4, revenue: 34000000, averagePrice: 8500000 },
    { month: "Apr", unitsSold: 6, revenue: 51000000, averagePrice: 8500000 },
    { month: "May", unitsSold: 7, revenue: 59500000, averagePrice: 8500000 },
    { month: "Jun", unitsSold: 5, revenue: 42500000, averagePrice: 8500000 },
    { month: "Jul", unitsSold: 4, revenue: 34000000, averagePrice: 8500000 },
    { month: "Aug", unitsSold: 6, revenue: 51000000, averagePrice: 8500000 },
    { month: "Sep", unitsSold: 3, revenue: 25500000, averagePrice: 8500000 },
    { month: "Oct", unitsSold: 2, revenue: 17000000, averagePrice: 8500000 },
    { month: "Nov", unitsSold: 1, revenue: 8500000, averagePrice: 8500000 },
    { month: "Dec", unitsSold: 1, revenue: 8500000, averagePrice: 8500000 },
  ],
  salesRecords: [
    {
      id: "S001",
      propertyName: "Luxury Villa A",
      salePrice: 12000000,
      soldDate: "2025-01-15",
      timeToClose: 18,
      project: "Green Valley",
    },
    {
      id: "S002",
      propertyName: "Apartment 3B",
      salePrice: 7500000,
      soldDate: "2025-01-22",
      timeToClose: 25,
      project: "City Heights",
    },
    {
      id: "S003",
      propertyName: "Townhouse 7",
      salePrice: 8500000,
      soldDate: "2025-01-30",
      timeToClose: 22,
      project: "Riverside",
    },
    {
      id: "S004",
      propertyName: "Penthouse 12",
      salePrice: 15000000,
      soldDate: "2025-02-05",
      timeToClose: 30,
      project: "Sky Tower",
    },
    {
      id: "S005",
      propertyName: "Duplex 4",
      salePrice: 9500000,
      soldDate: "2025-02-12",
      timeToClose: 20,
      project: "Garden Court",
    },
    {
      id: "S006",
      propertyName: "Villa B",
      salePrice: 11000000,
      soldDate: "2025-02-18",
      timeToClose: 28,
      project: "Green Valley",
    },
    {
      id: "S007",
      propertyName: "Apartment 5C",
      salePrice: 7800000,
      soldDate: "2025-02-25",
      timeToClose: 24,
      project: "City Heights",
    },
    {
      id: "S008",
      propertyName: "Townhouse 9",
      salePrice: 8200000,
      soldDate: "2025-03-03",
      timeToClose: 19,
      project: "Riverside",
    },
    {
      id: "S009",
      propertyName: "Penthouse 15",
      salePrice: 14500000,
      soldDate: "2025-03-10",
      timeToClose: 32,
      project: "Sky Tower",
    },
    {
      id: "S010",
      propertyName: "Duplex 6",
      salePrice: 9200000,
      soldDate: "2025-03-17",
      timeToClose: 21,
      project: "Garden Court",
    },
  ],
};

export const mockSalesTeamPerformanceData: SalesTeamPerformanceData = {
  kpis: {
    totalDealsClosed: 47,
    conversionRate: 68.5,
    avgDealSize: 8500000,
    pipelineVelocity: 18,
  },
  salespeople: [
    {
      name: "Asha Noor",
      contracted: 25,
      offersSent: 18,
      won: 12,
      lost: 6,
      conversionPercent: 66.7,
      avgDealSize: 9200000,
      revenue: 110400000,
    },
    {
      name: "Brian Otieno",
      contracted: 18,
      offersSent: 14,
      won: 9,
      lost: 5,
      conversionPercent: 64.3,
      avgDealSize: 7800000,
      revenue: 70200000,
    },
    {
      name: "Chen Li",
      contracted: 22,
      offersSent: 16,
      won: 11,
      lost: 5,
      conversionPercent: 68.8,
      avgDealSize: 8900000,
      revenue: 97900000,
    },
    {
      name: "Deka Farah",
      contracted: 20,
      offersSent: 15,
      won: 10,
      lost: 5,
      conversionPercent: 66.7,
      avgDealSize: 8100000,
      revenue: 81000000,
    },
    {
      name: "Elena Rodriguez",
      contracted: 16,
      offersSent: 12,
      won: 8,
      lost: 4,
      conversionPercent: 66.7,
      avgDealSize: 7600000,
      revenue: 60800000,
    },
  ],
};

export const mockFinancialCollectionsData: FinancialCollectionsData = {
  kpis: {
    expectedPeriod: 125000000,
    collectedPeriod: 108500000,
    collectionRate: 86.8,
    overdueAmount: 16500000,
  },
  monthlyData: [
    {
      month: "Jan",
      expected: 12000000,
      collected: 10500000,
      overdue: 1500000,
      collectionRate: 87.5,
    },
    {
      month: "Feb",
      expected: 12500000,
      collected: 11000000,
      overdue: 1500000,
      collectionRate: 88.0,
    },
    {
      month: "Mar",
      expected: 13000000,
      collected: 11200000,
      overdue: 1800000,
      collectionRate: 86.2,
    },
    {
      month: "Apr",
      expected: 13500000,
      collected: 11800000,
      overdue: 1700000,
      collectionRate: 87.4,
    },
    {
      month: "May",
      expected: 14000000,
      collected: 12200000,
      overdue: 1800000,
      collectionRate: 87.1,
    },
    {
      month: "Jun",
      expected: 14500000,
      collected: 12500000,
      overdue: 2000000,
      collectionRate: 86.2,
    },
    {
      month: "Jul",
      expected: 15000000,
      collected: 12800000,
      overdue: 2200000,
      collectionRate: 85.3,
    },
    {
      month: "Aug",
      expected: 15500000,
      collected: 13200000,
      overdue: 2300000,
      collectionRate: 85.2,
    },
    {
      month: "Sep",
      expected: 16000000,
      collected: 13500000,
      overdue: 2500000,
      collectionRate: 84.4,
    },
    {
      month: "Oct",
      expected: 16500000,
      collected: 13800000,
      overdue: 2700000,
      collectionRate: 83.6,
    },
    {
      month: "Nov",
      expected: 17000000,
      collected: 14000000,
      overdue: 3000000,
      collectionRate: 82.4,
    },
    {
      month: "Dec",
      expected: 17500000,
      collected: 14200000,
      overdue: 3300000,
      collectionRate: 81.1,
    },
  ],
  collectionRecords: [
    {
      id: "FC001",
      projectName: "Green Valley Phase 1",
      expectedAmount: 25000000,
      collectedAmount: 22000000,
      dueDate: "2025-01-15",
      status: "partial",
      overdueDays: 0,
    },
    {
      id: "FC002",
      projectName: "City Heights Tower A",
      expectedAmount: 18000000,
      collectedAmount: 18000000,
      dueDate: "2025-01-20",
      status: "on-time",
      overdueDays: 0,
    },
    {
      id: "FC003",
      projectName: "Riverside Complex",
      expectedAmount: 22000000,
      collectedAmount: 19500000,
      dueDate: "2025-01-25",
      status: "partial",
      overdueDays: 0,
    },
    {
      id: "FC004",
      projectName: "Sky Tower Penthouse",
      expectedAmount: 30000000,
      collectedAmount: 30000000,
      dueDate: "2025-02-01",
      status: "on-time",
      overdueDays: 0,
    },
    {
      id: "FC005",
      projectName: "Garden Court Villas",
      expectedAmount: 20000000,
      collectedAmount: 17000000,
      dueDate: "2025-02-05",
      status: "overdue",
      overdueDays: 15,
    },
  ],
};

export const mockOutstandingPaymentsFollowupsData: OutstandingPaymentsFollowupsData =
  {
    kpis: {
      overdueInvoicesCount: 24,
      overdueAmountTotal: 28500000,
      avgDaysOverdue: 18,
      leadsWithoutFollowup: 12,
    },
    overduePayments: [
      {
        id: "OP001",
        invoiceNumber: "INV-2025-001",
        buyer: "John Mwangi",
        buyerPhone: "+254 700 123 456",
        buyerEmail: "john.mwangi@email.com",
        projectName: "Green Valley",
        propertyInfo: "Villa A",
        salesperson: "Asha Noor",
        salespersonPhone: "+254 700 111 111",
        salespersonEmail: "asha.noor@company.com",
        dueDate: "2025-01-15",
        daysOverdue: 25,
        amount: 2500000,
        followUpStatus: "Needs Follow-up",
        lastReminder: "2025-01-20",
      },
      {
        id: "OP002",
        invoiceNumber: "INV-2025-002",
        buyer: "Mary Wangari",
        buyerPhone: "+254 700 234 567",
        buyerEmail: "mary.wangari@email.com",
        projectName: "City Heights",
        propertyInfo: "Block A, Floor 3, Unit B",
        salesperson: "Brian Otieno",
        salespersonPhone: "+254 700 222 222",
        salespersonEmail: "brian.otieno@company.com",
        dueDate: "2025-01-20",
        daysOverdue: 20,
        amount: 1800000,
        followUpStatus: "Payment Promised",
        lastReminder: "2025-01-25",
      },
      {
        id: "OP003",
        invoiceNumber: "INV-2025-003",
        buyer: "Peter Njoroge",
        buyerPhone: "+254 700 345 678",
        buyerEmail: "peter.njoroge@email.com",
        projectName: "Riverside",
        propertyInfo: "Townhouse 7",
        salesperson: "Chen Li",
        salespersonPhone: "+254 700 333 333",
        salespersonEmail: "chen.li@company.com",
        dueDate: "2025-01-25",
        daysOverdue: 15,
        amount: 2200000,
        followUpStatus: "Needs Follow-up",
        lastReminder: "2025-01-30",
      },
      {
        id: "OP004",
        invoiceNumber: "INV-2025-004",
        buyer: "Zara Ahmed",
        buyerPhone: "+254 700 456 789",
        buyerEmail: "zara.ahmed@email.com",
        projectName: "Sky Tower",
        propertyInfo: "Floor 12, Penthouse",
        salesperson: "Deka Farah",
        salespersonPhone: "+254 700 444 444",
        salespersonEmail: "deka.farah@company.com",
        dueDate: "2025-02-01",
        daysOverdue: 10,
        amount: 3000000,
        followUpStatus: "Payment Promised",
        lastReminder: "2025-02-05",
      },
      {
        id: "OP005",
        invoiceNumber: "INV-2025-005",
        buyer: "Liam Kariuki",
        buyerPhone: "+254 700 567 890",
        buyerEmail: "liam.kariuki@email.com",
        projectName: "Garden Court",
        propertyInfo: "Block B, Duplex 4",
        salesperson: "Elena Rodriguez",
        salespersonPhone: "+254 700 555 555",
        salespersonEmail: "elena.rodriguez@company.com",
        dueDate: "2025-02-05",
        daysOverdue: 5,
        amount: 2000000,
        followUpStatus: "Needs Follow-up",
        lastReminder: "2025-02-10",
      },
      {
        id: "OP006",
        invoiceNumber: "INV-2025-006",
        buyer: "Sarah Kimani",
        buyerPhone: "+254 700 678 901",
        buyerEmail: "sarah.kimani@email.com",
        projectName: "Green Valley",
        propertyInfo: "Villa B",
        salesperson: "Asha Noor",
        salespersonPhone: "+254 700 111 111",
        salespersonEmail: "asha.noor@company.com",
        dueDate: "2025-01-10",
        daysOverdue: 30,
        amount: 2800000,
        followUpStatus: "Overdue Follow-up",
        lastReminder: "2025-01-15",
      },
      {
        id: "OP007",
        invoiceNumber: "INV-2025-007",
        buyer: "David Ochieng",
        buyerPhone: "+254 700 789 012",
        buyerEmail: "david.ochieng@email.com",
        projectName: "City Heights",
        propertyInfo: "Block B, Floor 5, Unit C",
        salesperson: "Brian Otieno",
        salespersonPhone: "+254 700 222 222",
        salespersonEmail: "brian.otieno@company.com",
        dueDate: "2025-01-12",
        daysOverdue: 28,
        amount: 1900000,
        followUpStatus: "Overdue Follow-up",
        lastReminder: "2025-01-18",
      },
      {
        id: "OP008",
        invoiceNumber: "INV-2025-008",
        buyer: "Grace Wanjiku",
        buyerPhone: "+254 700 890 123",
        buyerEmail: "grace.wanjiku@email.com",
        projectName: "Riverside",
        propertyInfo: "Townhouse 9",
        salesperson: "Chen Li",
        salespersonPhone: "+254 700 333 333",
        salespersonEmail: "chen.li@company.com",
        dueDate: "2025-01-15",
        daysOverdue: 25,
        amount: 2100000,
        followUpStatus: "Overdue Follow-up",
        lastReminder: "2025-01-20",
      },
      {
        id: "OP009",
        invoiceNumber: "INV-2025-009",
        buyer: "Michael Odhiambo",
        buyerPhone: "+254 700 901 234",
        buyerEmail: "michael.odhiambo@email.com",
        projectName: "Sky Tower",
        propertyInfo: "Floor 15, Penthouse",
        salesperson: "Deka Farah",
        salespersonPhone: "+254 700 444 444",
        salespersonEmail: "deka.farah@company.com",
        dueDate: "2025-01-18",
        daysOverdue: 22,
        amount: 3200000,
        followUpStatus: "Overdue Follow-up",
        lastReminder: "2025-01-23",
      },
      {
        id: "OP010",
        invoiceNumber: "INV-2025-010",
        buyer: "Faith Akinyi",
        buyerPhone: "+254 700 012 345",
        buyerEmail: "faith.akinyi@email.com",
        projectName: "Garden Court",
        propertyInfo: "Block C, Duplex 6",
        salesperson: "Elena Rodriguez",
        salespersonPhone: "+254 700 555 555",
        salespersonEmail: "elena.rodriguez@company.com",
        dueDate: "2025-01-20",
        daysOverdue: 20,
        amount: 2400000,
        followUpStatus: "Overdue Follow-up",
        lastReminder: "2025-01-25",
      },
    ],
  };

export interface AgentPayoutsSummaryData {
  kpis: {
    accruedUnpaid: number;
    approvedReady: number;
    paidPeriod: number;
    avgCommissionRate: number;
  };
  agentPayouts: Array<{
    id: string;
    agent: string;
    agentPhone: string;
    agentEmail: string;
    projectName: string;
    propertyInfo: string;
    pending: number;
    paid: number;
    paidDate: string;
  }>;
}

export const mockAgentPayoutsSummaryData: AgentPayoutsSummaryData = {
  kpis: {
    accruedUnpaid: 12500000,
    approvedReady: 8500000,
    paidPeriod: 6800000,
    avgCommissionRate: 12.5,
  },
  agentPayouts: [
    {
      id: "AP001",
      agent: "Asha Noor",
      agentPhone: "+254 700 111 111",
      agentEmail: "asha.noor@company.com",
      projectName: "Green Valley",
      propertyInfo: "Villa A",
      pending: 2800000,
      paid: 2500000,
      paidDate: "2025-01-15",
    },
    {
      id: "AP002",
      agent: "Brian Otieno",
      agentPhone: "+254 700 222 222",
      agentEmail: "brian.otieno@company.com",
      projectName: "City Heights",
      propertyInfo: "Block A, Floor 3, Unit B",
      pending: 2200000,
      paid: 2000000,
      paidDate: "2025-01-20",
    },
    {
      id: "AP003",
      agent: "Chen Li",
      agentPhone: "+254 700 333 333",
      agentEmail: "chen.li@company.com",
      projectName: "Riverside",
      propertyInfo: "Townhouse 7",
      pending: 2500000,
      paid: 2200000,
      paidDate: "2025-01-18",
    },
    {
      id: "AP004",
      agent: "Deka Farah",
      agentPhone: "+254 700 444 444",
      agentEmail: "deka.farah@company.com",
      projectName: "Sky Tower",
      propertyInfo: "Floor 12, Penthouse",
      pending: 1800000,
      paid: 1600000,
      paidDate: "2025-01-22",
    },
    {
      id: "AP005",
      agent: "Elena Rodriguez",
      agentPhone: "+254 700 555 555",
      agentEmail: "elena.rodriguez@company.com",
      projectName: "Garden Court",
      propertyInfo: "Block B, Duplex 4",
      pending: 1500000,
      paid: 1300000,
      paidDate: "2025-01-25",
    },
  ],
};

// Helper function to filter data by date range
export const filterDataByDateRange = (
  data: SalesPerformanceData,
  fromDate: string,
  toDate: string
): SalesPerformanceData => {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  const filteredRecords = data.salesRecords.filter((record) => {
    const recordDate = new Date(record.soldDate);
    return recordDate >= from && recordDate <= to;
  });

  // Recalculate KPIs based on filtered data
  const filteredKpis = {
    unitsSold: filteredRecords.length,
    averageSalePrice:
      filteredRecords.length > 0
        ? Math.round(
            filteredRecords.reduce((sum, record) => sum + record.salePrice, 0) /
              filteredRecords.length
          )
        : 0,
    totalRevenue: filteredRecords.reduce(
      (sum, record) => sum + record.salePrice,
      0
    ),
    averageTimeToClose:
      filteredRecords.length > 0
        ? Math.round(
            filteredRecords.reduce(
              (sum, record) => sum + record.timeToClose,
              0
            ) / filteredRecords.length
          )
        : 0,
  };

  // Group filtered records by month
  const monthlyMap = new Map<
    string,
    { unitsSold: number; revenue: number; averagePrice: number }
  >();

  filteredRecords.forEach((record) => {
    const month = new Date(record.soldDate).toLocaleDateString("en-US", {
      month: "short",
    });
    const existing = monthlyMap.get(month) || {
      unitsSold: 0,
      revenue: 0,
      averagePrice: 0,
    };

    existing.unitsSold += 1;
    existing.revenue += record.salePrice;
    existing.averagePrice = Math.round(existing.revenue / existing.unitsSold);

    monthlyMap.set(month, existing);
  });

  const filteredMonthlyData = Array.from(monthlyMap.entries()).map(
    ([month, data]) => ({
      month,
      unitsSold: data.unitsSold,
      revenue: data.revenue,
      averagePrice: data.averagePrice,
    })
  );

  return {
    kpis: filteredKpis,
    monthlyData: filteredMonthlyData,
    salesRecords: filteredRecords,
  };
};
