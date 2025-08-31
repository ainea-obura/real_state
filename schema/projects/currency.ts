export interface CurrencyResponse {
  id: string;
  name: string;
  code: string;
  symbol: string;
  decimal_places: number;
  default?: boolean;
}

export interface CurrencyDropdownResponse extends Array<CurrencyResponse> {}