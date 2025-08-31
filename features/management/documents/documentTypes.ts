export type DocumentCategory =
  | "contract"
  | "agreement"
  | "id"
  | "other"
  | "template";

export interface Document {
  id: string;
  title: string;
  description?: string;
  category: DocumentCategory;
  uploadedBy?: string;
  createdAt: string;
  url: string;
  // Contract template fields
  templateType?: string;
  versionNumber?: string;
  isActive?: boolean;
  isDefault?: boolean;
  updatedAt?: string;
  // Extra fields
  status?: string;
  tags?: string[];
  templateContent?: string;
}

export interface DocumentTableColumn {
  key: keyof Document | "actions";
  label: string;
  width?: string | number;
}
