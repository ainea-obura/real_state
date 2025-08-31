import { z } from 'zod';

// Types
export type ProjectStatus = "ongoing" | "completed" | "planned" | "on-hold";
export type ProjectType = "residential" | "commercial" | "mixed-use";

// Property schema (matches PropertyDetailSerializer)
export const PropertyDetailSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string(),
  property_type: z.string(),
  size: z.string(),
  total_units: z.number(),
  total_floors: z.number(),
  total_rooms: z.number().optional(),
  description: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

// Project schema (used for both list and detail responses)
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  node: z.object({
    id: z.string().uuid(),
    name: z.string(),
    node_type: z.string(),
  }),
  project_code: z.string().optional(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  status: z.enum(["ongoing", "completed", "planned", "on-hold"] as const),
  description: z.string().optional(),
  project_type: z.enum(["residential", "commercial", "mixed-use"] as const),
  management_fee: z.string().optional(),
  location: z.object({
    lat: z.number().nullable(),
    long: z.number().nullable(),
    country: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
      })
      .nullable(),
    city: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
      })
      .nullable(),
    area: z.string().nullable(),
    address: z.string().nullable(),
  }),
  is_deleted: z.boolean().optional(),
  created_at: z.string(),
  structure_count: z.object({
    total_blocks: z.number(),
    total_houses: z.number(),
  }),
});

// Paginated response (matches CustomPageNumberPagination)
export const PaginatedProjectsSchema = z.object({
  count: z.number().nullable().optional(),
  // results can be a single object or an array
  results: z.union([z.array(ProjectSchema), ProjectSchema]),
});

// API Response schemas
export const ProjectsResponseSchema = z.object({
  error: z.boolean().optional(),
  message: z.string().nullable().optional(),
  data: PaginatedProjectsSchema,
});

// Infer types
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectDetail = z.infer<typeof ProjectSchema>;
export type PropertyDetail = z.infer<typeof PropertyDetailSchema>;
export type PaginatedProjects = z.infer<typeof PaginatedProjectsSchema>;
export type ProjectsResponse = z.infer<typeof ProjectsResponseSchema>;

/*
****************************
Property Types
****************************
*/
// Property Types
export const PROPERTY_TYPES = [
  "APT",
  "VILLA",
  "CONDO",
  "OFFICE",
  "RETAIL",
  "RESTAURANT",
  "MALL",
  "WAREHOUSE",
  "COLD",
  "OTHER",
] as const;

// Property Form Schema (for creating/updating properties)
export const PropertyFormSchema = z.object({
  project_node_id: z.string().uuid(),
  name: z.string().min(1, "Property name is required"),
  property_type: z.enum(PROPERTY_TYPES),
  size: z.string().min(1, "Size is required"),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Property API Response Schema
export const PropertyApiResponseSchema = z.object({
  isError: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    id: z.string().uuid(),
    node: z.object({
      id: z.string().uuid(),
      name: z.string(),
      property_type: z.enum(PROPERTY_TYPES),
      created_at: z.string(),
    }),
    size: z.string(),
    description: z.string().optional(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
  }),
});

// Type Exports
export type PropertyFormValues = z.infer<typeof PropertyFormSchema>;
export type PropertyApiResponse = z.infer<typeof PropertyApiResponseSchema>;

// Project Form Schema (for creating/updating projects)
export const ProjectFormSchema = z.object({
  node_name: z.string().min(1, "Project name is required"),
  country_id: z.string().uuid(),
  city: z.string().uuid(),
  area: z.string().min(1, "Area is required"),
  project_code: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(["ongoing", "completed", "planned", "on-hold"] as const),
  description: z.string().optional(),
  project_type: z.enum(["residential", "commercial", "mixed-use"] as const),
  lat: z.number(),
  long: z.number(),
});
