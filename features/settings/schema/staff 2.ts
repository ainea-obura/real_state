import { z } from "zod";

// Position Schema for dropdown
export const positionDropdownSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
});

// Staff Schema
export const staffSchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string().min(1, "First name is required").max(255, "First name must be less than 255 characters"),
  last_name: z.string().min(1, "Last name is required").max(255, "Last name must be less than 255 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Phone number must be at least 7 digits"),
  position: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).nullable(),
  is_active: z.boolean().default(true),
  is_deleted: z.boolean().default(false),
  created_at: z.string().optional(),
  modified_at: z.string().optional(),
});

// Staff Form Schema (for create/edit forms)
export const staffFormSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(255, "First name must be less than 255 characters"),
  last_name: z.string().min(1, "Last name is required").max(255, "Last name must be less than 255 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .optional()
    .refine((value) => {
      if (!value || value.trim() === "") return true; // Allow empty
      // Basic phone validation - at least 7 digits, can include +, spaces, dashes, parentheses
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ""));
    }, "Please enter a valid phone number"),
  position_id: z.string().uuid("Please select a position"),
});

// Staff Response Schema
export const staffResponseSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  position: positionDropdownSchema.nullable(),
  is_active: z.boolean(),
  is_deleted: z.boolean(),
  created_at: z.string(),
  modified_at: z.string(),
});

// Staff Table Item Schema
export const staffTableItemSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  position: positionDropdownSchema.nullable(),
  is_active: z.boolean(),
  is_deleted: z.boolean(),
  group_count: z.number(),
  permission_count: z.number(),
  created_at: z.string(),
  modified_at: z.string(),
});

// Staff List Response Schema
export const staffListResponseSchema = z.object({
  count: z.number(),
  results: z.array(staffTableItemSchema),
});

// Positions List Response Schema (for dropdown)
export const positionsDropdownResponseSchema = z.object({
  count: z.number(),
  results: z.array(positionDropdownSchema),
});

// User Permissions Schema
export const userGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  permission_count: z.number(),
});

export const userPermissionSchema = z.object({
  id: z.number(),
  name: z.string(),
  codename: z.string(),
  content_type: z.object({
    app_label: z.string(),
    model: z.string(),
  }),
});

export const userPermissionCategorySchema = z.object({
  app_label: z.string(),
  model: z.string(),
  display_name: z.string(),
  permissions: z.array(userPermissionSchema),
});

export const userPermissionsSchema = z.object({
  groups: z.array(userGroupSchema),
  direct_permissions: z.array(userPermissionSchema),
  all_permissions: z.array(userPermissionSchema),
});

// Export types
export type Staff = z.infer<typeof staffSchema>;
export type StaffForm = z.infer<typeof staffFormSchema>;
export type StaffResponse = z.infer<typeof staffResponseSchema>;
export type StaffTableItem = z.infer<typeof staffTableItemSchema>;
export type StaffListResponse = z.infer<typeof staffListResponseSchema>;
export type PositionDropdown = z.infer<typeof positionDropdownSchema>;
export type PositionsDropdownResponse = z.infer<typeof positionsDropdownResponseSchema>;
export type UserPermissions = z.infer<typeof userPermissionsSchema>;
