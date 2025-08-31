export interface CurrencyResponse {
  id: string;
  name: string;
  code: string;
  symbol: string;
  decimal_places: number;
}

export interface CurrencyDropdownResponse extends Array<CurrencyResponse> {}