import { z } from "zod";

// Group Schema for table
export const groupSchema = z.object({
  id: z.number(),
  name: z.string(),
  user_count: z.number(),
  permission_count: z.number(),
  is_position_group: z.boolean(),
  position_name: z.string().optional(),
  created_at: z.string(),
  modified_at: z.string(),
});

// Permission Schema
export const permissionSchema = z.object({
  id: z.number(),
  name: z.string(),
  codename: z.string(),
  content_type: z.object({
    id: z.number(),
    app_label: z.string(),
    model: z.string(),
  }),
});

// Permission Category Schema
export const permissionCategorySchema = z.object({
  app_label: z.string(),
  model: z.string(),
  display_name: z.string(),
  permissions: z.array(permissionSchema),
});

// App-Model Relationship Schema
export const appModelSchema = z.object({
  app_label: z.string(),
  app_name: z.string(),
  models: z.array(z.object({
    model: z.string(),
    model_name: z.string(),
  })),
});

// Filter Schemas
export const permissionFilterSchema = z.object({
  app_label: z.string().optional(),
  model: z.string().optional(),
  search: z.string().optional(),
  checked_only: z.boolean().optional(),
  unchecked_only: z.boolean().optional(),
});

// Form Schemas
export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

export const updateGroupPermissionsSchema = z.object({
  group_id: z.number(),
  permission_ids: z.array(z.number()),
});

// Types
export type Group = z.infer<typeof groupSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type PermissionCategory = z.infer<typeof permissionCategorySchema>;
export type AppModel = z.infer<typeof appModelSchema>;
export type PermissionFilter = z.infer<typeof permissionFilterSchema>;
export type CreateGroup = z.infer<typeof createGroupSchema>;
export type UpdateGroupPermissions = z.infer<typeof updateGroupPermissionsSchema>; 