# Finance Reports

This directory contains the finance reports components that display financial summaries and property breakdowns.

## Money Formatting

The backend already formats money values with currency symbols before sending them to the frontend. For example:
- `"KES 1,234"` for Kenyan Shillings
- `"$1,234"` for US Dollars

### Key Points:

1. **Backend Pre-formatting**: All money values come from the backend already formatted with currency symbols and proper number formatting.

2. **No Re-formatting**: The frontend should NOT re-format these values. Display them as-is from the backend.

3. **Totals Calculation**: When calculating totals, use the utility functions in `utils/moneyFormatting.ts` to extract numeric values and format the result.

### Utility Functions

Use the utility functions in `utils/moneyFormatting.ts`:

- `extractNumericValue(formattedString)`: Extract numeric value from formatted currency string
- `formatCurrency(amount, currency)`: Format a number as currency string
- `calculateTotal(formattedAmounts, currency)`: Calculate total from array of formatted amounts
- `isValidCurrencyFormat(value)`: Validate currency format

### Example Usage

```typescript
import { extractNumericValue, formatCurrency } from './utils/moneyFormatting';

// Backend sends: "KES 1,234"
const income = "KES 1,234";

// Extract numeric value for calculations
const numericValue = extractNumericValue(income); // 1234

// Format total for display
const total = formatCurrency(numericValue); // "KES 1,234"
```

### Components

- `ReportSummaryCards.tsx`: Displays summary cards with pre-formatted values
- `PropertyBreakdownTable.tsx`: Shows property breakdown with totals calculation
- `reports.tsx`: Main reports page
- `ReportActions.tsx`: Export and action buttons

### Schema

The schema in `schema/index.ts` documents that money values are pre-formatted strings from the backend. 