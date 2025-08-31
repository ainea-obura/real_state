import { z } from 'zod';

// Schema for individual property selection
export const PropertySelectionSchema = z.object({
  id: z.string().min(1, "Property ID is required"),
  name: z.string().min(1, "Property name is required"),
  type: z.enum(["UNIT", "HOUSE"], {
    required_error: "Property type is required",
  }),
  parentBlock: z.string().optional(),
  status: z.enum(["pending", "assigned", "error"]),
});

// Schema for owner assignment form
export const OwnerAssignmentSchema = z.object({
  ownerId: z.string().min(1, "Owner selection is required"),
  properties: z
    .array(PropertySelectionSchema)
    .min(1, "At least one property must be selected"),
  projectId: z.string().optional(), // Optional project context
});

// Type inference
export type OwnerAssignmentFormData = z.infer<typeof OwnerAssignmentSchema>;
export type PropertySelection = z.infer<typeof PropertySelectionSchema>;

// Validation messages
export const ownerAssignmentMessages = {
  ownerRequired: "Please select an owner",
  propertiesRequired: "Please select at least one property",
  ownerNotFound: "Selected owner not found",
  propertyNotFound: "One or more selected properties not found",
} as const;
