// Currency type
export interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
  decimalPlaces: number;
  isDefault?: boolean;
  usageCount?: number;
}

// Stat cards type
export interface CurrencyStats {
  totalCurrencies: number;
  defaultCurrency: string;
  mostUsedCurrency: string;
  mostUsedCount: number;
} 