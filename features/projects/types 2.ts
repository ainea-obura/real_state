import { z } from 'zod';

// Project form schema matching backend requirements
export const projectFormSchema = z.object({
  node_name: z.string().min(1, "Project name is required"),
  project_code: z.string().optional(),
  country_id: z.string().uuid("Country is required"),
  city: z.string().uuid("City is required"),
  area: z.string().min(1, "Area is required"),
  address: z.string().min(1, "Address is required"),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  status: z.enum(["ongoing", "completed", "planned", "on-hold"], {
    required_error: "Status is required",
  }),
  description: z.string().optional(),
  project_type: z.enum(["residential", "commercial", "mixed-use"], {
    required_error: "Project type is required",
  }),
  management_fee: z.number().min(0, "Management fee must be 0 or greater").optional(),
  lat: z.number({ required_error: "Latitude is required" }),
  long: z.number({ required_error: "Longitude is required" }),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

// API request type with formatted dates
export interface ProjectApiRequest
  extends Omit<ProjectFormValues, "start_date" | "end_date"> {
  start_date: string | null;
  end_date: string | null;
}

// API response type for single project
export interface ProjectApiResponse {
  isError: boolean;
  message: string;
  data: {
    node_id: string;
    name: string;
    node_type: "PROJECT";
    created_at: string;
    id: number;
    country: {
      id: string;
      name: string;
    };
    city: {
      id: string;
      name: string;
    };
    area: string;
    address: string;
    start_date: string | null;
    end_date: string | null;
    status: "ongoing" | "completed" | "planned" | "on-hold";
    project_type: "residential" | "commercial" | "mixed-use";
    total_properties: number;
    total_units: number;
  };
}

// API response type for project list
export interface ProjectsResponse {
  isError: boolean;
  message: string | null;
  data: {
    count: number;
    results: ProjectApiResponse["data"][];
  };
}
