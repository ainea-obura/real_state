import { ParkingAreaCircleIcon } from "hugeicons-react";
import { Building2, Home, Layers, Plus } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";

import { ParentStructure } from "../schema/AddStructureSchema";
import { BasementSchema } from "../schema/basementSchema";
import {
  BlockArrayFormData,
  BlockArraySchema,
} from "../schema/BlockArraySchema";
import { HouseArraySchema } from "../schema/HouseArraySchema";

interface StructureFormProps<T> {
  onSubmit: (data: T, editMode?: boolean) => void;
  parentStructures?: ParentStructure[];
  propertyId: string;
  propertyName: string;
  editMode?: boolean;
  initialValues?: Partial<T>;
}

export const BlockForm = ({
  onSubmit,
  propertyId,
  propertyName,
  parentStructures,
  editMode = false,
  initialValues,
}: StructureFormProps<BlockArrayFormData>) => {
  const form = useForm<BlockArrayFormData>({
    resolver: zodResolver(BlockArraySchema),
    defaultValues: initialValues || {
      blocks: [{ name: "", floors: 0 }],
    },
  });

  useEffect(() => {
    if (editMode && initialValues) {
      form.reset(initialValues);
    }
  }, [editMode, initialValues]);

  // useFieldArray for stable keys & no focus loss
  const { fields, append } = useFieldArray({
    control: form.control,
    name: "blocks",
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => onSubmit(data, editMode))}
        className="flex flex-col space-y-6 h-full"
      >
        <ScrollArea className="flex-1 bg-gradient-to-br from-gray-50/50 to-blue-50/30 p-4 rounded-xl max-h-[420px]">
          <div className="gap-6 grid grid-cols-2">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="gap-4 grid grid-cols-1 bg-white/50 backdrop-blur-sm p-4 border border-gray-200/60 rounded-md transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">
                    Block {idx + 1}
                  </h3>
                </div>

                <FormField
                  control={form.control}
                  name={`blocks.${idx}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={`Enter block ${idx + 1} name`}
                          className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 transition-colors duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`blocks.${idx}.floors`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                        <Layers className="w-4 h-4 text-green-500" />
                        Number of Floors
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={String(field.value)}
                          onValueChange={(val) => field.onChange(Number(val))}
                        >
                          <SelectTrigger className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 w-full !h-11 transition-colors duration-200">
                            <SelectValue placeholder="Select floors" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 101 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i} {i === 1 ? "Floor" : "Floors"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}

            {!editMode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ name: "", floors: 0 })}
                className="group flex flex-col justify-center items-center gap-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 shadow-sm hover:shadow-md border-2 border-blue-300/60 hover:border-blue-400 border-dashed rounded-xl h-full min-h-[140px] text-blue-600 hover:text-blue-700 transition-all duration-300"
              >
                <div className="flex justify-center items-center bg-blue-100 group-hover:bg-blue-200 rounded-full w-12 h-12 transition-colors duration-300">
                  <Plus className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-center">
                  <span className="font-semibold text-blue-700">Add Block</span>
                  <p className="mt-1 text-blue-500 text-xs">Create new block</p>
                </div>
              </Button>
            )}
          </div>
        </ScrollArea>
        <div className="pt-2">
          <Button type="submit" className="w-full h-11">
            <Building2 className="mr-2 w-5 h-5" />
            {editMode ? "Update Block" : "Create Blocks"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export const HouseForm = ({
  onSubmit,
  propertyId,
  propertyName,
  parentStructures,
  editMode = false,
  initialValues,
}: StructureFormProps<{
  houses: {
    name: string;
    floors: number;
    management_mode: "FULL_MANAGEMENT" | "SERVICE_ONLY";
    service_charge?: number;
  }[];
}>) => {
  const form = useForm<{
    houses: {
      name: string;
      floors: number;
      management_mode: "FULL_MANAGEMENT" | "SERVICE_ONLY";
      service_charge?: number;
    }[];
  }>({
    resolver: zodResolver(z.object({ houses: HouseArraySchema })),
    defaultValues: initialValues || {
      houses: [
        {
          name: "",
          floors: undefined,
          management_mode: "FULL_MANAGEMENT",
          service_charge: undefined,
        },
      ],
    },
  });

  useEffect(() => {
    if (editMode && initialValues) {
      form.reset(initialValues);
    }
  }, [editMode, initialValues]);

  const { fields, append } = useFieldArray({
    control: form.control,
    name: "houses",
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => onSubmit(data, editMode))}
        className="flex flex-col space-y-6 h-full"
      >
        <ScrollArea className="flex-1 bg-gradient-to-br from-gray-50/50 to-green-50/30 p-4 rounded-xl max-h-[420px]">
          <div className={editMode ? "space-y-6" : "gap-6 grid grid-cols-2"}>
            {fields.map((field, idx) =>
              !editMode ? (
                <div
                  key={field.id}
                  className="bg-white/50 backdrop-blur-sm p-4 border border-gray-200/60 rounded-md transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Home className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-800">
                      House {idx + 1}
                    </h3>
                  </div>
                  <div className="gap-4 grid grid-cols-1">
                    {/* Management Mode */}
                    <FormField
                      control={form.control}
                      name={`houses.${idx}.management_mode` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                            <ParkingAreaCircleIcon className="w-4 h-4 text-indigo-500" />
                            Management Mode
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 w-full !h-11 transition-colors duration-200">
                                <SelectValue placeholder="Select management mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SERVICE_ONLY">
                                  Service Only
                                </SelectItem>
                                <SelectItem value="FULL_MANAGEMENT">
                                  Full Management
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* House Name */}
                    <FormField
                      control={form.control}
                      name={`houses.${idx}.name` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                            <Home className="w-4 h-4 text-green-500" />
                            Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={`Enter house ${idx + 1} name`}
                              className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 transition-colors duration-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Number of Floors */}
                    <FormField
                      control={form.control}
                      name={`houses.${idx}.floors` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                            <Layers className="w-4 h-4 text-green-500" />
                            Number of Floors
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={String(field.value)}
                              onValueChange={(val) =>
                                field.onChange(Number(val))
                              }
                            >
                              <SelectTrigger className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 w-full !h-11 transition-colors duration-200">
                                <SelectValue placeholder="Select floors" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 101 }, (_, i) => (
                                  <SelectItem key={i} value={String(i)}>
                                    {i} {i === 1 ? "Floor" : "Floors"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Service Cost */}
                    <FormField
                      control={form.control}
                      name={`houses.${idx}.service_charge` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-gray-700 text-sm">
                            Service Charge
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                              placeholder="Enter service charge"
                              className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 transition-colors duration-200"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ) : (
                <div
                  key={field.id}
                  className="gap-4 grid grid-cols-1 md:grid-cols-2"
                >
                  {/* Management Mode */}
                  <FormField
                    control={form.control}
                    name={`houses.${idx}.management_mode` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                          <ParkingAreaCircleIcon className="w-4 h-4 text-indigo-500" />
                          Management Mode
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 w-full !h-11 transition-colors duration-200">
                              <SelectValue placeholder="Select management mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SERVICE_ONLY">
                                Service Only
                              </SelectItem>
                              <SelectItem value="FULL_MANAGEMENT">
                                Full Management
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* House Name */}
                  <FormField
                    control={form.control}
                    name={`houses.${idx}.name` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                          <Home className="w-4 h-4 text-green-500" />
                          Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={`Enter house ${idx + 1} name`}
                            className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 transition-colors duration-200"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Number of Floors */}
                  <FormField
                    control={form.control}
                    name={`houses.${idx}.floors` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                          <Layers className="w-4 h-4 text-green-500" />
                          Number of Floors
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={String(field.value)}
                            onValueChange={(val) => field.onChange(Number(val))}
                          >
                            <SelectTrigger className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 w-full !h-11 transition-colors duration-200">
                              <SelectValue placeholder="Select floors" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 101 }, (_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {i} {i === 1 ? "Floor" : "Floors"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Service Cost */}
                  <FormField
                    control={form.control}
                    name={`houses.${idx}.service_charge` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-gray-700 text-sm">
                          Service Charge
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value)
                              )
                            }
                            placeholder="Enter service charge"
                            className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 transition-colors duration-200"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )
            )}
            {!editMode && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({
                    name: "",
                    floors: 0,
                    management_mode: "FULL_MANAGEMENT",
                    service_charge: undefined,
                  })
                }
                className="group flex flex-col justify-center items-center gap-3 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 shadow-sm hover:shadow-md border-2 border-green-300/60 hover:border-green-400 border-dashed rounded-xl h-full min-h-[140px] text-green-600 hover:text-green-700 transition-all duration-300"
              >
                <div className="flex justify-center items-center bg-green-100 group-hover:bg-green-200 rounded-full w-12 h-12 transition-colors duration-300">
                  <Plus className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-center">
                  <span className="font-semibold text-green-700">
                    Add House
                  </span>
                  <p className="mt-1 text-green-500 text-xs">
                    Create new house
                  </p>
                </div>
              </Button>
            )}
          </div>
        </ScrollArea>
        <div className="pt-2">
          <Button type="submit" className="w-full h-11">
            <Home className="mr-2 w-5 h-5" />
            {editMode ? "Update House" : "Create Houses"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export const BasementForm = ({
  onSubmit,
}: StructureFormProps<{ basements: { name: string; slots: number }[] }>) => {
  const form = useForm<{ basements: { name: string; slots: number }[] }>({
    resolver: zodResolver(z.object({ basements: BasementSchema })),
    defaultValues: {
      basements: [{ name: "", slots: 0 }],
    },
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: "basements",
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => onSubmit(data))}
        className="flex flex-col space-y-6 h-full"
      >
        <ScrollArea className="flex-1 bg-gradient-to-br from-gray-50/50 to-purple-50/30 p-4 rounded-xl max-h-[420px]">
          <div className="gap-6 grid grid-cols-2">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="gap-4 grid grid-cols-1 bg-white/50 backdrop-blur-sm p-4 border border-purple-200/60 rounded-md transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ParkingAreaCircleIcon className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-800">
                    Parking {idx + 1}
                  </h3>
                </div>
                <FormField
                  control={form.control}
                  name={`basements.${idx}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                        <ParkingAreaCircleIcon className="w-4 h-4 text-purple-500" />
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={`Enter Parking ${idx + 1} name`}
                          className="border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 transition-colors duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`basements.${idx}.slots`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        Number of Slots
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={field.value === 0 ? "" : field.value}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? 0 : Number(e.target.value)
                            )
                          }
                          placeholder="Enter number of slots"
                          className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-colors duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ name: "", slots: 0 })}
              className="group flex flex-col justify-center items-center gap-3 hover:bg-gradient-to-br hover:from-purple-50 hover:to-indigo-50 shadow-sm hover:shadow-md border-2 border-purple-300/60 hover:border-purple-400 border-dashed rounded-xl h-full min-h-[140px] text-purple-600 hover:text-purple-700 transition-all duration-300"
            >
              <div className="flex justify-center items-center bg-purple-100 group-hover:bg-purple-200 rounded-full w-12 h-12 transition-colors duration-300">
                <ParkingAreaCircleIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-center">
                <span className="font-semibold text-purple-700">
                  Add Parking
                </span>
                <p className="mt-1 text-purple-500 text-xs">
                  Create new Parking
                </p>
              </div>
            </Button>
          </div>
        </ScrollArea>
        <div className="pt-2">
          <Button type="submit" className="w-full h-11">
            <ParkingAreaCircleIcon className="mr-2 w-5 h-5" />
            Create Parkings
          </Button>
        </div>
      </form>
    </Form>
  );
};
