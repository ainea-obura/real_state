import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createRoomStructure, editRoomStructure } from '@/actions/projects/structure';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';

import { StructureApiResponse } from '../schema/projectStructureSchema';
import { getRoomSchemaByParentType, RoomFormData } from '../schema/roomStructureView';

// Update StructureNode type to match new schema: include room_details
type StructureNode = {
  id: string;
  name: string;
  node_type: string;
  parent: string | null;
  children: StructureNode[];
  apartment_details?: unknown;
  villa_detail?: unknown;
  room_details?: {
    room_type: string;
    size: string;
    description?: string;
  } | null;
  description?: string;
  created_at?: string;
  status?: string;
};

// Room type options (can be extended)
const ROOM_TYPES = [
  "bedroom",
  "bathroom",
  "kitchen",
  "living_room",
  "dining_room",
  "study",
  "storage",
  "balcony",
  "terrace",
  "garage",
  "basement",
  "attic",
  "laundry",
  "pantry",
  "gym",
  "maid_room",
  "other",
];

interface RoomModelProps {
  isOpen: boolean;
  onClose: () => void;
  parentType: "BLOCK" | "HOUSE";
  parentId: string;
  projectId: string;
  floorId?: string;
  apartmentId?: string; // Only for BLOCK
  floors: { id: string; name: string }[];
  apartments?: StructureNode[]; // Only for BLOCK - StructureNode array
  onRoomCreated?: (
    newStructure?: StructureApiResponse["data"]["results"]
  ) => void;
  onCancel?: () => void; // Callback to close parent modal
  editMode?: boolean;
  initialValues?: any;
}

const RoomModel = ({
  isOpen,
  onClose,
  parentType,
  parentId,
  floorId,
  apartmentId,
  floors,
  projectId,
  apartments,
  onRoomCreated,
  onCancel,
  editMode = false,
  initialValues,
}: RoomModelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const schema = getRoomSchemaByParentType(parentType);

  const form = useForm<any>({
    resolver: zodResolver(schema as any),
    defaultValues:
      initialValues ||
      (parentType === "BLOCK"
        ? {
            block: parentId,
            floor: floorId || "",
            apartment: apartmentId || "",
            room: { room_type: "", size: "", description: "" },
          }
        : {
            house: parentId,
            floor: floorId || "",
            room: { room_type: "", size: "", description: "" },
          }),
  });

  useEffect(() => {
    if (editMode && initialValues) {
      // Always use room_details for prepopulation if present
      const patchedInitialValues = { ...initialValues };
      if (initialValues.room_details) {
        patchedInitialValues.room = {
          room_type: initialValues.room_details.room_type || "",
          size: initialValues.room_details.size || "",
          description: initialValues.room_details.description || "",
        };
      }
      form.reset(patchedInitialValues);
    }
  }, [editMode, initialValues]);

  // Watch floor selection to filter apartments
  const selectedFloor = form.watch("floor");

  // Filter apartments based on selected floor
  const filteredApartments =
    apartments?.filter((apt) => {
      // Filter apartments that belong to the selected floor
      return apt.parent === selectedFloor;
    }) || [];

  const roomMutation = useMutation({
    mutationFn: async (data: RoomFormData) => {
      const res = await createRoomStructure(data, projectId);
      if (res.error) {
        // Handle different error response types
        const errorMessage =
          "message" in res ? res.message : "Failed to create room";
        throw new Error(errorMessage);
      }
      return res;
    },
    onSuccess: (response) => {
      toast.success("Room created successfully");
      setIsLoading(false);

      // Clear only room fields, keep floor and apartment selection
      form.setValue("room.room_type", "");
      form.setValue("room.size", "");
      form.setValue("room.description", "");

      // Update cache with full structure from server like unit creation
      const newStructure =
        response.data && "results" in response.data
          ? response.data.results
          : [];
      onRoomCreated?.(newStructure);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create room");
      setIsLoading(false);
    },
  });

  // Add mutation for editing room
  const editRoomMutation = useMutation({
    mutationFn: async (data: RoomFormData) => {
      // You must have a room id for editing
      if (!initialValues?.id) throw new Error("Missing room id");
      const res = await editRoomStructure(data, projectId, initialValues.id);
      if (res.error) {
        const errorMessage =
          "message" in res ? res.message : "Failed to update room";
        throw new Error(errorMessage);
      }
      return res;
    },
    onSuccess: (response) => {
      toast.success("Room updated successfully");
      setIsLoading(false);
      const newStructure =
        response.data && "results" in response.data
          ? response.data.results
          : [];
      onRoomCreated?.(newStructure);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update room");
      setIsLoading(false);
    },
  });

  const onSubmit = async (data: RoomFormData) => {
    setIsLoading(true);
    if (editMode) {
      editRoomMutation.mutate(data);
      return;
    }
    roomMutation.mutate(data);
  };

  const handleCancel = () => {
    // Reset form to clear all data
    form.reset({
      block: parentType === "BLOCK" ? parentId : undefined,
      house: parentType === "HOUSE" ? parentId : undefined,
      floor: floorId || "",
      apartment: apartmentId || "",
      room: { room_type: "", size: "", description: "" },
    });
    // Close the room modal
    onClose();
    // Close the parent stats modal
    onCancel?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit Room" : "Add Room"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Hidden parent ID */}
            {parentType === "BLOCK" ? (
              <input type="hidden" {...form.register("block")} />
            ) : (
              <input type="hidden" {...form.register("house")} />
            )}
            {/* Floor dropdown */}
            <FormField
              control={form.control}
              name="floor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Clear apartment selection when floor changes
                      if (parentType === "BLOCK") {
                        form.setValue("apartment", "");
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full !h-11">
                        <SelectValue placeholder="Select a floor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {floors.map((floor) => (
                        <SelectItem key={floor.id} value={floor.id}>
                          {floor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Apartment dropdown for BLOCK */}
            {parentType === "BLOCK" && apartments && (
              <FormField
                control={form.control}
                name="apartment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apartment *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={filteredApartments.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full !h-11">
                          <SelectValue
                            placeholder={
                              filteredApartments.length === 0
                                ? "No apartments available"
                                : "Select an apartment"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredApartments.length > 0 ? (
                          filteredApartments.map((apt) => (
                            <SelectItem key={apt.id} value={apt.id}>
                              {apt.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-muted-foreground text-sm">
                            No apartments available for this floor
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {/* Room fields */}
            <FormField
              control={form.control}
              name="room.room_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full !h-11">
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="room.size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 15x12, 20x15" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="room.description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter room description..."
                      className="h-24 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading || roomMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || roomMutation.isPending}
              >
                {isLoading || roomMutation.isPending
                  ? editMode
                    ? "Updating..."
                    : "Creating..."
                  : editMode
                  ? "Update"
                  : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RoomModel;
