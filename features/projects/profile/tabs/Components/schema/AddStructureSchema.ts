import { z } from "zod";

export const BlockSchema = z.object({
  name: z.string().min(1, "Block name is required"),
  node_type: z.enum(["BLOCK"]),
  description: z.string().optional(),
});

export const FloorSchema = z.object({
  parent_id: z.string().min(1, "Parent structure is required"),
  parent_type: z.enum(["PROPERTY", "BLOCK"]),
  number: z.number().min(0, "Floor number must be positive"),
  node_type: z.enum(["FLOOR"]),
  description: z.string().optional(),
});

export const UnitSchema = z.object({
  parent_id: z.string().min(1, "Parent structure is required"),
  parent_type: z.enum(["PROPERTY", "FLOOR"]),
  identifier: z.string().min(1, "Unit identifier is required"),
  size: z.string().min(1, "Unit size is required"),
  management_mode: z.enum(["SERVICE_ONLY", "FULL_MANAGEMENT"]),
  status: z.enum(["available", "rented", "sold"]),
  sale_price: z.number().min(0, "Sale price must be positive"),
  rental_price: z.number().min(0, "Rental price must be positive").optional(),
  node_type: z.enum(["UNIT"]),
  description: z.string().optional(),
});

export const RoomSchema = z.object({
  parent_id: z.string().min(1, "Parent unit is required"),
  room_type: z.enum(["bedroom", "kitchen", "bathroom", "living_room", "wc"]),
  size: z.string().min(1, "Room size is required"),
  node_type: z.enum(["ROOM"]),
  description: z.string().optional(),
});

export type BlockFormData = z.infer<typeof BlockSchema>;
export type FloorFormData = z.infer<typeof FloorSchema>;
export type UnitFormData = z.infer<typeof UnitSchema>;
export type RoomFormData = z.infer<typeof RoomSchema>;

export interface ParentStructure {
  id: string;
  name: string;
  type: "PROPERTY" | "BLOCK" | "FLOOR" | "UNIT";
}
