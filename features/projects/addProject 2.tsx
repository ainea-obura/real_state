import { Alert02Icon } from "hugeicons-react";
import { useAtom } from "jotai";
import {
  Building2,
  CheckCheck,
  FolderPen,
  Home,
  Loader2,
  Plus,
  Users2,
} from "lucide-react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { getCities, getCountries } from "@/actions/misc";
import { createProject, updateProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProjectsResponse as SchemaProjectsResponse } from "@/schema/projects/schema";
import { isProjectModelOpen, selectedProjectAtom } from "@/store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { projectFormSchema, ProjectFormValues } from "./types";

const AddProject = () => {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom);
  const [open, setOpen] = useAtom(isProjectModelOpen);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      node_name: selectedProject?.data.node?.name || "",
      project_code: selectedProject?.data.project_code || "",
      status: selectedProject?.data.status || "planned",
      address: selectedProject?.data.location?.address || "",
      description: selectedProject?.data.description || "",
      project_type: selectedProject?.data.project_type || "residential",
      management_fee: selectedProject?.data.management_fee
        ? parseFloat(
            selectedProject.data.management_fee.replace(/[^\d.-]/g, "")
          )
        : undefined,
      start_date: selectedProject?.data.start_date
        ? new Date(selectedProject.data.start_date)
        : undefined,
      end_date: selectedProject?.data.end_date
        ? new Date(selectedProject.data.end_date)
        : undefined,
      country_id: selectedProject?.data.location?.country?.id || "",
      city: selectedProject?.data.location?.city?.id || "",
      area: selectedProject?.data.location?.area || "",
      lat: selectedProject?.data.location?.lat ?? undefined,
      long: selectedProject?.data.location?.long ?? undefined,
    },
    mode: "onChange",
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.reset({
        node_name: "",
        project_code: "",
        status: "planned",
        address: "",
        description: "",
        project_type: "residential",
        management_fee: undefined,
        start_date: undefined,
        end_date: undefined,
        country_id: "",
        city: "",
        area: "",
        lat: undefined,
        long: undefined,
      });
      setSelectedProject(null);
    }
  }, [open, form, setSelectedProject]);

  // Update form when selectedProject changes
  useEffect(() => {
    if (selectedProject) {
      form.reset({
        node_name: selectedProject.data.node?.name || "",
        project_code: selectedProject.data.project_code || "",
        status: selectedProject.data.status || "planned",
        address: selectedProject.data.location?.address || "",
        description: selectedProject.data.description || "",
        project_type: selectedProject.data.project_type || "residential",
        start_date: selectedProject.data.start_date
          ? new Date(selectedProject.data.start_date)
          : undefined,
        end_date: selectedProject.data.end_date
          ? new Date(selectedProject.data.end_date)
          : undefined,
        country_id: selectedProject.data.location?.country?.id || "",
        city: selectedProject.data.location?.city?.id || "",
        area: selectedProject.data.location?.area || "",
        lat: selectedProject.data.location?.lat ?? undefined,
        long: selectedProject.data.location?.long ?? undefined,
      });
    }
  }, [selectedProject, form]);

  // Fetch countries
  const { data: countries, isLoading: loadingCountries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const response = await getCountries();
      if (response.isError) throw new Error("Failed to load countries");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Watch selected country for city filtering
  const selectedCountryId = form.watch("country_id");

  // Fetch cities for selected country
  const { data: cities, isLoading: loadingCities } = useQuery({
    queryKey: ["cities", selectedCountryId],
    queryFn: async () => {
      const response = await getCities(selectedCountryId!);
      if (response.isError) throw new Error("Failed to load cities");
      return response.data;
    },
    enabled: !!selectedCountryId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { mutate: createProjectMutation, isPending } = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      const res = await createProject(data);
      if (res.error) {
        throw new Error(res.message || "Failed to create project");
      }
      return res;
    },
    onSuccess: (response: SchemaProjectsResponse) => {
      // Get all existing project queries
      const queries = queryClient.getQueriesData<SchemaProjectsResponse>({
        queryKey: ["projects"],
      });

      // Update all matching queries with the new project
      queries.forEach(([queryKey]) => {
        queryClient.setQueryData<SchemaProjectsResponse>(
          queryKey,
          (oldData) => {
            if (!oldData) {
              return {
                error: false,
                message: response.message,
                data: {
                  count: 1,
                  results: Array.isArray(response.data.results)
                    ? response.data.results
                    : [response.data.results],
                },
              };
            }

            // Ensure we have the new project data
            const newProject = Array.isArray(response.data.results)
              ? response.data.results[0]
              : response.data.results;

            // Ensure we have the existing projects as an array
            const existingProjects = Array.isArray(oldData.data.results)
              ? oldData.data.results
              : [oldData.data.results];

            // Add the new project to the beginning of the list
            const updatedResults = [newProject, ...existingProjects];

            return {
              ...oldData,
              data: {
                count: (oldData.data.count ?? 0) + 1,
                results: updatedResults,
              },
            };
          }
        );
      });

      toast.success("Project created successfully", {
        className: "bg-primary text-white",
        icon: <CheckCheck className="w-4 h-4" />,
      });

      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message, {
        className: "bg-destructive text-white",
        icon: <Alert02Icon className="w-4 h-4" />,
      });
    },
  });

  const { mutate: updateProjectMutation, isPending: isUpdating } = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      if (!selectedProject?.data.id) {
        throw new Error("Project ID is required for update");
      }
      const res = await updateProject(data, selectedProject.data.id);
      if (res.error) {
        throw new Error(res.message || "Failed to update project");
      }
      return res;
    },
    onSuccess: (response: SchemaProjectsResponse) => {
      // Get all existing project queries
      const queries = queryClient.getQueriesData<SchemaProjectsResponse>({
        queryKey: ["projects"],
      });

      // Update all matching queries with the updated project
      queries.forEach(([queryKey]) => {
        queryClient.setQueryData<SchemaProjectsResponse>(
          queryKey,
          (oldData) => {
            if (!oldData) return oldData;

            // Ensure we have the updated project data
            const updatedProject = Array.isArray(response.data.results)
              ? response.data.results[0]
              : response.data.results;

            if (!updatedProject) {
              return oldData;
            }

            // Ensure we have the existing projects as an array
            const existingProjects = Array.isArray(oldData.data.results)
              ? oldData.data.results
              : [oldData.data.results];

            // Replace the old project with the updated one
            const updatedResults = existingProjects.map((project) => {
              if (project.id === selectedProject?.data.id) {
                return updatedProject;
              }
              return project;
            });

            return {
              ...oldData,
              data: {
                ...oldData.data,
                results: updatedResults,
              },
            };
          }
        );
      });

      toast.success("Project updated successfully", {
        className: "bg-primary text-white",
        icon: <CheckCheck className="w-4 h-4" />,
      });

      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message, {
        className: "bg-destructive text-white",
        icon: <Alert02Icon className="w-4 h-4" />,
      });
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    if (selectedProject) {
      updateProjectMutation(data);
    } else {
      createProjectMutation(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* seleft align the center of the screen */}
      <DialogContent className="flex flex-col gap-0 p-0 max-w-[800px] max-h-[80vh]">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 border-b border-border/20">
          <DialogHeader>
            <DialogTitle className="font-semibold text-xl">
              {selectedProject ? (
                <div className="flex items-center gap-2">
                  <FolderPen className="w-5 h-5 text-primary" />
                  Edit Project
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Create New Project
                </div>
              )}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-muted-foreground">
              {selectedProject
                ? "Update your project details and management settings."
                : "Create a new project to organize your properties and manage them efficiently."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Form {...form}>
              <form
                id={selectedProject ? "editProjectForm" : "createProjectForm"}
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2"
              >
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="gap-4 grid grid-cols-2">
                    <FormField
                      control={form.control}
                      name="node_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter project name"
                              value={field.value || ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <div className="h-[18px]">
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="project_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Optional reference code"
                              {...field}
                            />
                          </FormControl>
                          <div className="h-[18px]">
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Project Details */}
                <div className="space-y-4">
                  <div className="gap-4 grid grid-cols-2">
                    <FormField
                      control={form.control}
                      name="project_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full !h-11">
                                <SelectValue placeholder="Select project type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="residential">
                                <div className="flex items-center gap-2">
                                  <Home className="w-4 h-4" />
                                  Residential
                                </div>
                              </SelectItem>
                              <SelectItem value="commercial">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4" />
                                  Commercial
                                </div>
                              </SelectItem>
                              <SelectItem value="mixed-use">
                                <div className="flex items-center gap-2">
                                  <Users2 className="w-4 h-4" />
                                  Mixed Use
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="h-[18px]">
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full !h-11">
                                <SelectValue placeholder="Select project status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="planned">
                                <div className="flex items-center gap-2">
                                  <span className="bg-blue-500 rounded-full w-2 h-2" />
                                  Planned
                                </div>
                              </SelectItem>
                              <SelectItem value="ongoing">
                                <div className="flex items-center gap-2">
                                  <span className="bg-yellow-500 rounded-full w-2 h-2" />
                                  Ongoing
                                </div>
                              </SelectItem>
                              <SelectItem value="completed">
                                <div className="flex items-center gap-2">
                                  <span className="bg-green-500 rounded-full w-2 h-2" />
                                  Completed
                                </div>
                              </SelectItem>
                              <SelectItem value="on-hold">
                                <div className="flex items-center gap-2">
                                  <span className="bg-red-500 rounded-full w-2 h-2" />
                                  On Hold
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="h-[18px]">
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  <div className="gap-4 grid grid-cols-2">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date (Optional)</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value ?? undefined}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <div className="h-[18px]">
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => {
                        const startDate = form.watch("start_date");
                        return (
                          <FormItem>
                            <FormLabel>End Date (Optional)</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value ?? undefined}
                                onChange={field.onChange}
                                minDate={startDate ?? undefined}
                              />
                            </FormControl>
                            <div className="h-[18px]">
                              <FormMessage />
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </div>

                {/* Address & Area */}
                <div className="gap-4 grid grid-cols-2">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter project address"
                            className="!h-11"
                            {...field}
                          />
                        </FormControl>
                        <div className="h-[18px]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter area name"
                            className="!h-11"
                            {...field}
                          />
                        </FormControl>
                        <div className="h-[18px]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Country & City */}
                <div className="gap-4 grid grid-cols-2">
                  <FormField
                    control={form.control}
                    name="country_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("city", "");
                          }}
                          value={field.value}
                          disabled={loadingCountries}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full !h-11">
                              <SelectValue
                                placeholder={
                                  loadingCountries
                                    ? "Loading countries..."
                                    : "Select country"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries?.map((country) => (
                              <SelectItem key={country.id} value={country.id}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="h-[18px]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedCountryId || loadingCities}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full !h-11">
                              <SelectValue
                                placeholder={
                                  !selectedCountryId
                                    ? "Select country first"
                                    : loadingCities
                                    ? "Loading cities..."
                                    : "Select city"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cities?.map((city) => (
                              <SelectItem key={city.id} value={city.id}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="h-[18px]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Lat & Long */}
                <div className="gap-4 grid grid-cols-2">
                  <FormField
                    control={form.control}
                    name="lat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Enter latitude (e.g. 25.2048)"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") {
                                field.onChange(undefined);
                              } else {
                                const parsed = parseFloat(value);
                                if (!isNaN(parsed)) {
                                  field.onChange(parsed);
                                }
                              }
                            }}
                          />
                        </FormControl>
                        <div className="h-[18px]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="long"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Enter longitude (e.g. 55.2708)"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") {
                                field.onChange(undefined);
                              } else {
                                const parsed = parseFloat(value);
                                if (!isNaN(parsed)) {
                                  field.onChange(parsed);
                                }
                              }
                            }}
                          />
                        </FormControl>
                        <div className="h-[18px]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add project description, notes, or any additional details"
                            className="h-24 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <div className="h-[18px]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Management Fee */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="management_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Management Fee</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Enter management fee (e.g. 500.00)"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") {
                                field.onChange(undefined);
                              } else {
                                const parsed = parseFloat(value);
                                if (!isNaN(parsed) && parsed >= 0) {
                                  field.onChange(parsed);
                                }
                              }
                            }}
                          />
                        </FormControl>
                        <div className="h-[18px]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 border-t border-border/20">
          <div className="flex justify-end items-center gap-4">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setOpen(false)}
              disabled={isPending || isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={selectedProject ? "editProjectForm" : "createProjectForm"}
              disabled={isPending || isUpdating}
            >
              {isPending || isUpdating ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  {selectedProject ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  {selectedProject ? (
                    <FolderPen className="mr-2 w-4 h-4" />
                  ) : (
                    <Plus className="mr-2 w-4 h-4" />
                  )}
                  {selectedProject ? "Update Project" : "Create Project"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddProject;
