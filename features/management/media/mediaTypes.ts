// Media file type
export interface MediaItem {
  id: string;
  url: string;
  title?: string;
  description?: string;
  fileType: MediaFileType;
  category: MediaCategory;
  isFeatured?: boolean;
  order?: number;
  nodeId: string;
  nodeType: PropertyNodeType;
  createdAt: string;
  // Hierarchy info
  unitName?: string;
  floorNumber?: string;
  blockName?: string;
  projectName?: string;
  imageCount?: number;
}

export type MediaFileType = "image" | "video" | "document";
export type MediaCategory =
  | "main"
  | "floor_plan"
  | "interior"
  | "exterior"
  | "document"
  | "thumbnail"
  | "other";

export type PropertyNodeType =
  | "PROJECT"
  | "BLOCK"
  | "FLOOR"
  | "UNIT"
  | "VILLA"
  | "HOUSE";

export interface PropertyNode {
  id: string;
  name: string;
  nodeType: PropertyNodeType;
  parentId?: string;
}
