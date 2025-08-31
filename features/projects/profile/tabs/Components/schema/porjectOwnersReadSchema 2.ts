import { z } from 'zod';

// Property data schema - matches _get_property_data method
export const PropertyDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  node_type: z.enum(["BLOCK", "HOUSE", "UNIT", "FLOOR", "ROOM"]),
  parent_name: z.string().nullable(),
  nested_units: z.number().int().min(0),
  nested_rooms: z.number().int().min(0),
  nested_floors: z.number().int().min(0),
});

// Project owner schema - matches the owner data structure
export const ProjectOwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  owned_properties: z.array(PropertyDataSchema),
  status: z.enum(["active", "inactive"]),
});

// Main response schema - matches the API response structure
export const ProjectOwnersReadSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number().int().min(0),
    results: z.array(
      z.object({
        project_owners: z.array(ProjectOwnerSchema),
      })
    ),
  }),
});

// Type exports for TypeScript usage
export type PropertyData = z.infer<typeof PropertyDataSchema>;
export type ProjectOwner = z.infer<typeof ProjectOwnerSchema>;
export type ProjectOwnersRead = z.infer<typeof ProjectOwnersReadSchema>;

// Validation functions for server actions
export const validateProjectOwnersResponse = (
  data: unknown
): ProjectOwnersRead => {
  return ProjectOwnersReadSchema.parse(data);
};

export const validateProjectOwner = (data: unknown): ProjectOwner => {
  return ProjectOwnerSchema.parse(data);
};

export const validatePropertyData = (data: unknown): PropertyData => {
  return PropertyDataSchema.parse(data);
};
