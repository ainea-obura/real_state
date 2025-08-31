import { z } from 'zod';

// Zod schema for a single document
export const DocumentSchema = z.object({
  id: z.string(),
  template_title: z.string(),
  template_description: z.string().nullable(),
  template_type: z.string(),
  template_content: z.string(),
  available_variables: z.record(z.unknown()),
  is_active: z.boolean(),
  is_default: z.boolean(),
  version_number: z.string(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DocumentApi = z.infer<typeof DocumentSchema>;

// Zod schema for paginated documents response
export const DocumentsDataSchema = z.object({
  count: z.number(),
  results: z.array(DocumentSchema),
});
export const DocumentsApiResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: DocumentsDataSchema,
});
export type DocumentsApiResponse = z.infer<typeof DocumentsApiResponseSchema>;

// Zod schema for create document response (single document)
export const DocumentCreateApiResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: DocumentSchema,
});
export type DocumentCreateApiResponse = z.infer<
  typeof DocumentCreateApiResponseSchema
>;
