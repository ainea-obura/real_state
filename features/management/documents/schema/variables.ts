// Document Variable Type
export interface DocumentVariable {
  variable_name: string;
  display_name: string;
  category: string;
  data_type: string;
  is_required: boolean;
  description: string;
}

// Data object containing count and results
export interface DocumentVariablesData {
  count: number;
  results: DocumentVariable[];
}

// Full API response type
export interface DocumentVariablesApiResponse {
  error: boolean;
  message: string;
  data: DocumentVariablesData;
}
