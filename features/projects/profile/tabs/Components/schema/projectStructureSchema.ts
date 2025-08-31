import { z } from "zod";

/** 1) ApartmentDetails for UNIT nodes */
const ApartmentDetailsSchema = z.object({
  management_mode: z.enum(["SERVICE_ONLY", "FULL_MANAGEMENT"]),
  status: z.enum(["available", "rented", "sold", "accupied_by_owner"]),
  identifier: z.string(),
  size: z.string(),
  sale_price: z.string().nullable(),
  rental_price: z.string().nullable(),
  description: z.string().nullable(),
  management_status: z.enum(["for_rent", "for_sale", "leased"]).nullable(),
  currency: z.string().uuid().nullable().optional(),
  unit_type: z.string().nullable().optional(),
  service_charge: z.string().nullable().optional(),
  custom_service_charge: z.string().nullable().optional(),
});

const VillaDetailsSchema = z.object({
  management_mode: z.enum(["SERVICE_ONLY", "FULL_MANAGEMENT"]),
  service_charge: z.string().nullable().optional(),
  custom_service_charge: z.string().nullable().optional(),
});

// RoomDetails schema for ROOM nodes
const RoomDetailsSchema = z.object({
  room_type: z.string(),
  size: z.string(),
  description: z.string().optional(),
});

/** 2) Recursive node schema */
const StructureNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      name: z.string(),
      node_type: z.enum([
        "BLOCK",
        "HOUSE",
        "FLOOR",
        "UNIT",
        "ROOM",
        "BASEMENT",
        "SLOT",
      ]),
      parent: z.string().nullable(),
      children: z.array(StructureNodeSchema).default([]),
      apartment_details: z.union([ApartmentDetailsSchema, z.null()]),
      villa_detail: z.union([VillaDetailsSchema, z.null()]),
      room_details: z.union([RoomDetailsSchema, z.null()]).optional(),
    })
    .refine(
      (node) =>
        node.node_type === "UNIT"
          ? node.apartment_details !== null
          : node.apartment_details === null,
      {
        message: "Only UNIT nodes may have non-null apartment_details",
        path: ["apartment_details"],
      }
    )
);

/** 3) Data wrapper exactly as the server sends it */
const DataSchema = z.object({
  count: z.number(),
  results: z.array(StructureNodeSchema),
});

/** 4) Full API response schema */
export const StructureApiResponseSchema = z.object({
  error: z.boolean(),
  data: DataSchema,
});

// TypeScript types
export type StructureNode = z.infer<typeof StructureNodeSchema>;
export type StructureApiResponse = z.infer<typeof StructureApiResponseSchema>;
