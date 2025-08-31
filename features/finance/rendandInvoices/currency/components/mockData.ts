import { Currency, CurrencyStats } from "./types";

export const mockCurrencies: Currency[] = [
  {
    id: "1",
    name: "US Dollar",
    code: "USD",
    symbol: "$",
    decimalPlaces: 2,
    isDefault: true,
    usageCount: 120,
  },
  {
    id: "2",
    name: "Euro",
    code: "EUR",
    symbol: "€",
    decimalPlaces: 2,
    usageCount: 80,
  },
  {
    id: "3",
    name: "British Pound",
    code: "GBP",
    symbol: "£",
    decimalPlaces: 2,
    usageCount: 45,
  },
  {
    id: "4",
    name: "UAE Dirham",
    code: "AED",
    symbol: "د.إ",
    decimalPlaces: 2,
    usageCount: 60,
  },
  {
    id: "5",
    name: "Japanese Yen",
    code: "JPY",
    symbol: "¥",
    decimalPlaces: 0,
    usageCount: 10,
  },
];

export const mockCurrencyStats: CurrencyStats = {
  totalCurrencies: mockCurrencies.length,
  defaultCurrency: "US Dollar (USD)",
  mostUsedCurrency: "US Dollar (USD)",
  mostUsedCount: 120,
}; 