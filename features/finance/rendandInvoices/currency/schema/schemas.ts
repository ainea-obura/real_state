import { z } from "zod";

export const CurrencySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name is required and must be at least 2 characters"),
  code: z.string().min(2, "Code is required").max(10, "Code must be at most 10 characters"),
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol must be at most 10 characters"),
  decimalPlaces: z.coerce.number().int().min(0, "Must be 0 or more").max(6, "Must be 6 or less"),
  isDefault: z.boolean().optional(),
  usageCount: z.number().optional(),
});

export const CurrencyStatsSchema = z.object({
  totalCurrencies: z.number(),
  defaultCurrency: z.string(),
  mostUsedCurrency: z.string(),
  mostUsedCount: z.number(),
}); 