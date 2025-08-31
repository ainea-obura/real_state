import { z } from "zod";

// For block parent: block, floor, apartment, room
export const BlockRoomSchema = z.object({
  block: z.string().uuid({ message: "Block ID is required" }),
  floor: z.string().uuid({ message: "Floor ID is required" }),
  apartment: z.string().uuid({ message: "Apartment ID is required" }),
  room: z.object({
    room_type: z.string().min(1, "Room type is required"),
    size: z.string().min(1, "Size is required"),
    description: z.string().max(500).optional(),
  }),
});

// For house parent: house, floor, room
export const HouseRoomSchema = z.object({
  house: z.string().uuid({ message: "House ID is required" }),
  floor: z.string().uuid({ message: "Floor ID is required" }),
  room: z.object({
    room_type: z.string().min(1, "Room type is required"),
    size: z.string().min(1, "Size is required"),
    description: z.string().max(500).optional(),
  }),
});

export const RoomSchema = z.union([BlockRoomSchema, HouseRoomSchema]);

export type BlockRoomFormData = z.infer<typeof BlockRoomSchema>;
export type HouseRoomFormData = z.infer<typeof HouseRoomSchema>;
export type RoomFormData = z.infer<typeof RoomSchema>;

export function getRoomSchemaByParentType(parentType: "BLOCK" | "HOUSE") {
  return parentType === "BLOCK" ? BlockRoomSchema : HouseRoomSchema;
}
