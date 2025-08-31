import { z } from 'zod';

// Forward declaration for recursion
export type MediaProjectNode = {
  id: string;
  name: string;
  node_type: string;
  property_type: string | null;
  children: MediaProjectNode[];
};

export const MediaProjectNodeSchema: z.ZodType<MediaProjectNode> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    node_type: z.string(),
    property_type: z.string().nullable(),
    children: z.array(MediaProjectNodeSchema),
  })
);

export const MediaProjectsResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    count: z.number(),
    results: z.array(MediaProjectNodeSchema),
  }),
});

export type MediaProjectsResponse = z.infer<typeof MediaProjectsResponseSchema>;

// Schema for a single image
export const MediaImageSchema = z.object({
  id: z.string().uuid(),
  file_type: z.literal("image"),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  media: z.string().url(),
  created_at: z.string(),
});

// Schema for a property with images and parent_path
export const MediaPropertyWithImagesSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  node_type: z.string(),
  property_type: z.string().nullable(),
  parent_path: z.string(),
  images: z.array(MediaImageSchema),
});

export type MediaPropertyWithImagesSchema = z.infer<
  typeof MediaPropertyWithImagesSchema
>;

// Response schema for reading all media files for a project
export const MediaReadAllResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    count: z.number(),
    results: z.array(MediaPropertyWithImagesSchema),
  }),
});

export type MediaReadAllResponse = z.infer<typeof MediaReadAllResponseSchema>;
