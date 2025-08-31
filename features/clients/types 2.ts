import { z } from 'zod';

// --- Types ---
export const UserTypeEnum = z.enum(["tenant", "owner", "agent"]);
export const UserStatusEnum = z.enum(["active", "suspended", "blocked"]);

export const ClientDetailSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional().nullable(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  type: UserTypeEnum,
  is_active: z.boolean(),
  is_tenant_verified: z.boolean().optional(),
  is_owner_verified: z.boolean().optional(),
  created_at: z.string(),
  modified_at: z.string(),
});

export const ClientFormSchema = z.object({
  email: z.string().optional().nullable(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().min(5, "Phone number must be at least 5 characters"),
  gender: z.enum(["Male", "Female"]),
});

export const PaginatedClientsSchema = z.object({
  count: z.number(),
  results: z.array(ClientDetailSchema),
});

export const ClientsResponseSchema = z.object({
  error: z.boolean().optional(),
  isError: z.boolean().optional(),
  message: z.string().nullable().optional(),
  data: PaginatedClientsSchema,
});

export const ClientDetailResponseSchema = z.object({
  error: z.boolean().optional(),
  isError: z.boolean().optional(),
  message: z.string().nullable().optional(),
  data: ClientDetailSchema,
});

// Types
export type ClientFormValues = z.infer<typeof ClientFormSchema>;
export type ClientDetail = z.infer<typeof ClientDetailSchema>;
export type PaginatedClients = z.infer<typeof PaginatedClientsSchema>;
export type ClientsResponse = z.infer<typeof ClientsResponseSchema>;
export type ClientDetailResponse = z.infer<typeof ClientDetailResponseSchema>; 