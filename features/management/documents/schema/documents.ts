// Type for a single contract template (document)
export interface Document {
  id: string;
  template_title: string;
  template_description: string | null;
  template_type: string;
  template_content: string;
  available_variables: Record<string, unknown>;
  is_active: boolean;
  is_default: boolean;
  version_number: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Data object containing count and results
export interface DocumentsData {
  count: number;
  results: Document[];
}

// Full API response type
export interface DocumentsApiResponse {
  error: boolean;
  message: string;
  data: DocumentsData;
}
