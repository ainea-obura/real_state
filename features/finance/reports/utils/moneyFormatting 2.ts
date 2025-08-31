/**
 * Utility functions for money formatting in reports
 * The backend already formats money with currency symbols, so we handle pre-formatted values
 */

/**
 * Extract numeric value from a formatted currency string
 * @param formattedString - String like "KES 1,234" or "$1,234"
 * @returns numeric value
 */
export const extractNumericValue = (formattedString: string): number => {
  if (!formattedString) return 0;
  // Remove currency symbols, commas, and spaces, then parse as number
  const numericString = formattedString.replace(/[^\d.-]/g, "");
  return parseFloat(numericString) || 0;
};

/**
 * Format a number as currency string (for totals calculation)
 * @param amount - Numeric amount
 * @param currency - Currency code (default: KES)
 * @returns formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = "KES"
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Calculate total from an array of formatted currency strings
 * @param formattedAmounts - Array of formatted currency strings
 * @returns formatted total
 */
export const calculateTotal = (
  formattedAmounts: string[],
  currency: string = "KES"
): string => {
  const total = formattedAmounts.reduce((sum, amount) => {
    return sum + extractNumericValue(amount);
  }, 0);
  return formatCurrency(total, currency);
};

/**
 * Validate if a string is a properly formatted currency value
 * @param value - String to validate
 * @returns boolean
 */
export const isValidCurrencyFormat = (value: string): boolean => {
  if (!value) return false;
  // Check if it contains currency symbols and numbers
  return (
    /^[A-Z]{3}\s[\d,]+$/.test(value.trim()) ||
    /^[\$€£¥]\s?[\d,]+$/.test(value.trim())
  );
};
