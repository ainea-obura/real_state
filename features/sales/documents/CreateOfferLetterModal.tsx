import {
    Building2, CheckCircle2, ChevronLeft, ChevronRight, DollarSign, FileText, Loader2, Search, User,
    Users,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { createOfferLetter } from '@/actions/sales/createOfferLetter';
import { getAllTemplates } from '@/actions/sales/documentTemplates';
import { getProjectStructure, searchOwners, searchProjects } from '@/actions/sales/loadProjects';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';

import SelectPropertyStep from '../owner/components/stepsForOwnerAssigment/step1';
import SelectBuyerStep from '../owner/components/stepsForOwnerAssigment/step2';

// Zod schema for offer letter form validation
const offerLetterSchema = z.object({
  project: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["residential", "commercial", "mixed"]),
      location: z.string(),
      hasBlocks: z.boolean(),
      hasHouses: z.boolean(),
    })
    .nullable(),
  blocks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      projectId: z.string(),
      floors: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          blockId: z.string(),
          units: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              floorId: z.string(),
              type: z.string(),
              size: z.string(),
              price: z.number(),
              status: z.enum(["available", "booked", "sold"]),
            })
          ),
        })
      ),
    })
  ),
  units: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      floorId: z.string(),
      type: z.string(),
      size: z.string(),
      price: z.number(),
      status: z.enum(["available", "booked", "sold"]),
    })
  ),
  houses: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      projectId: z.string(),
      type: z.string(),
      size: z.string(),
      price: z.number(),
      status: z.enum(["available", "booked", "sold"]),
    })
  ),
  buyers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      phone: z.string(),
      photo: z.string().optional(),
    })
  ),
  templateId: z.string().min(1, "Offer letter template is required"),
  offerPrice: z.number().min(1, "Offer price is required"),
  downPayment: z.number().min(1, "Down payment is required"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
});

type OfferLetterFormData = z.infer<typeof offerLetterSchema>;

interface CreateOfferLetterModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: () => void;
  mode: "create" | "edit";
}

interface Project {
  id: string;
  name: string;
  type: "residential" | "commercial" | "mixed";
  location: string;
  hasBlocks: boolean;
  hasHouses: boolean;
}

interface Block {
  id: string;
  name: string;
  projectId: string;
  floors: Floor[];
}

interface Floor {
  id: string;
  name: string;
  blockId: string;
  units: Unit[];
}

interface Unit {
  id: string;
  name: string;
  floorId: string;
  type: string;
  size: string;
  price: number;
  status: "available" | "booked" | "sold";
}

interface House {
  id: string;
  name: string;
  projectId: string;
  type: string;
  size: string;
  price: number;
  status: "available" | "booked" | "sold";
}

interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
}

const steps = [
  { id: 1, title: "Select\nProperty", icon: Building2 },
  { id: 2, title: "Select\nBuyer", icon: Users },
  { id: 3, title: "Offer\nDetails", icon: DollarSign },
  { id: 4, title: "Review &\nCreate", icon: FileText },
];

export default function CreateOfferLetterModal({
  open,
  onClose,
  onUpload,
  mode,
}: CreateOfferLetterModalProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Handle modal close with data clearing
  const handleClose = () => {
    clearAllFormData();
    onClose();
  };

  // React Hook Form setup
  const form = useForm<OfferLetterFormData>({
    resolver: zodResolver(offerLetterSchema),
    defaultValues: {
      project: null,
      blocks: [],
      units: [],
      houses: [],
      buyers: [],
      templateId: "",
      offerPrice: 0,
      downPayment: 0,
      dueDate: "",
      notes: "",
    },
  });

  const {
    watch,
    setValue,
    formState: { errors },
  } = form;

  // Watch form values
  const selectedProject = watch("project");
  const selectedBlocks = watch("blocks");
  const selectedUnits = watch("units");
  const selectedHouses = watch("houses");
  const selectedBuyers = watch("buyers");
  const offerPrice = watch("offerPrice");
  const downPayment = watch("downPayment");

  // Search states
  const [projectSearch, setProjectSearch] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");

  // Transform API project data to local Project interface
  const transformApiProjectToProject = (apiProject: any): Project => {
    let projectType: "residential" | "commercial" | "mixed" = "mixed";
    if (apiProject.property_type === "residential") {
      projectType = "residential";
    } else if (apiProject.property_type === "commercial") {
      projectType = "commercial";
    }

    return {
      id: apiProject.id,
      name: apiProject.name,
      type: projectType,
      location: apiProject.project_detail?.address || "Location not specified",
      hasBlocks: apiProject.has_blocks,
      hasHouses: apiProject.has_houses,
    };
  };

  // Transform API owner data to local Buyer interface
  const transformApiOwnerToBuyer = (apiOwner: any): Buyer => {
    return {
      id: apiOwner.id,
      name: apiOwner.full_name,
      email: apiOwner.email,
      phone: apiOwner.phone,
      photo: apiOwner.avatar,
    };
  };

  // Use useQuery to search projects
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["searchProjects", projectSearch],
    queryFn: () => searchProjects({ q: projectSearch }),
    enabled: !!projectSearch && projectSearch.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use useQuery to get project structure when a project is selected
  const { data: projectStructureData, isLoading: isLoadingProjectStructure } =
    useQuery({
      queryKey: ["projectStructure", selectedProject?.id],
      queryFn: () => getProjectStructure(selectedProject!.id, false),
      enabled: !!selectedProject?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

  // Use useQuery to search owners with optimized settings
  const { data: ownersData, isLoading: isLoadingOwners } = useQuery({
    queryKey: ["searchOwners", ownerSearch],
    queryFn: () => searchOwners({ q: ownerSearch }),
    enabled: !!ownerSearch && ownerSearch.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch offer letter templates
  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useQuery({
    queryKey: ["offerLetterTemplates"],
    queryFn: async () => {
      console.log("Fetching offer letter templates...");
      const result = await getAllTemplates("offer_letter");
      console.log("Templates result:", result);
      return result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Create offer letter mutation
  const createOfferLetterMutation = useMutation({
    mutationFn: createOfferLetter,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Offer letter created successfully!");
        onUpload();
        handleClose();
      } else {
        toast.error(data.message || "Failed to create offer letter");
      }
    },
    onError: (error) => {
      console.error("Error creating offer letter:", error);
      toast.error("Failed to create offer letter. Please try again.");
    },
  });

  // Debug logging
  React.useEffect(() => {
    console.log("Templates data:", templatesData);
    console.log("Templates loading:", isLoadingTemplates);
    console.log("Templates error:", templatesError);
  }, [templatesData, isLoadingTemplates, templatesError]);

  // Get filtered projects from API response
  const filteredProjects: Project[] = useMemo(() => {
    if (!projectsData || projectsData.error) return [];
    return projectsData.data.results.map(transformApiProjectToProject);
  }, [projectsData]);

  // Transform API structure data to local interfaces
  const projectBlocks: Block[] = useMemo(() => {
    if (!projectStructureData || projectStructureData.error) return [];

    return projectStructureData.data.blocks.map((apiBlock: any) => ({
      id: apiBlock.id,
      name: apiBlock.name,
      projectId: selectedProject!.id,
      floors: apiBlock.floors
        .filter((apiFloor: any) => apiFloor.units && apiFloor.units.length > 0)
        .map((apiFloor: any) => ({
          id: apiFloor.id,
          name: apiFloor.name,
          blockId: apiBlock.id,
          units: apiFloor.units.map((apiUnit: any) => ({
            id: apiUnit.id,
            name: apiUnit.name,
            floorId: apiFloor.id,
            type: apiUnit.unit_detail?.unit_type || "Standard",
            size: apiUnit.unit_detail?.size || "Standard",
            price: apiUnit.unit_detail?.sale_price || 0,
            status: apiUnit.unit_detail?.status || "available",
          })),
        })),
    }));
  }, [projectStructureData, selectedProject]);

  const projectHouses: House[] = useMemo(() => {
    if (!projectStructureData || projectStructureData.error) return [];

    return projectStructureData.data.houses.map((apiHouse: any) => ({
      id: apiHouse.id,
      name: apiHouse.name,
      projectId: selectedProject!.id,
      type: apiHouse.house_detail?.name || "House",
      size: "Standard",
      price: 0, // API doesn't provide house price
      status: "available",
    }));
  }, [projectStructureData, selectedProject]);

  const projectUnits: Unit[] = useMemo(() => {
    if (!projectStructureData || projectStructureData.error) return [];

    const units: Unit[] = [];
    projectStructureData.data.blocks.forEach((apiBlock: any) => {
      apiBlock.floors.forEach((apiFloor: any) => {
        apiFloor.units.forEach((apiUnit: any) => {
          units.push({
            id: apiUnit.id,
            name: apiUnit.name,
            floorId: apiFloor.id,
            type: apiUnit.unit_detail?.unit_type || "Standard",
            size: apiUnit.unit_detail?.size || "Standard",
            price: apiUnit.unit_detail?.sale_price || 0,
            status: apiUnit.unit_detail?.status || "available",
          });
        });
      });
    });
    return units;
  }, [projectStructureData]);

  // Calculate total price for selected properties
  const totalPropertyPrice = (() => {
    if (selectedUnits.length > 0 || selectedHouses.length > 0) {
      return (
        selectedUnits.reduce((sum, unit) => sum + unit.price, 0) +
        selectedHouses.reduce((sum, house) => sum + house.price, 0)
      );
    }

    if (selectedProject) {
      let total = 0;

      if (selectedProject.hasBlocks) {
        projectBlocks.forEach((block) => {
          block.floors.forEach((floor) => {
            floor.units.forEach((unit) => {
              if (unit.status === "available") {
                total += unit.price;
              }
            });
          });
        });
      } else if (selectedProject.hasHouses) {
        projectHouses.forEach((house) => {
          if (house.status === "available") {
            total += house.price;
          }
        });
      }

      return total;
    }

    return 0;
  })();

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Function to clear all form data
  const clearAllFormData = () => {
    setValue("project", null);
    setValue("blocks", []);
    setValue("units", []);
    setValue("houses", []);
    setValue("buyers", []);
    setValue("templateId", "");
    setValue("offerPrice", 0);
    setValue("downPayment", 0);
    setValue("dueDate", "");
    setValue("notes", "");

    // Clear search states
    setProjectSearch("");
    setOwnerSearch("");

    // Reset to first step
    setCurrentStep(1);
  };

  const handleProjectSelect = (project: Project) => {
    setValue("project", project);
    setValue("blocks", []);
    setValue("units", []);
    setValue("houses", []);
    // Don't set offer price yet - wait for specific property selection
    setValue("offerPrice", 0);
    setValue("downPayment", 0);
  };

  const handleBuyerSelect = (buyer: Buyer) => {
    if (selectedBuyers.find((b) => b.id === buyer.id)) {
      setValue(
        "buyers",
        selectedBuyers.filter((b) => b.id !== buyer.id)
      );
    } else {
      setValue("buyers", [...selectedBuyers, buyer]);
    }
  };

  // Handle property selection and auto-populate offer price
  const handlePropertySelection = (units: Unit[], houses: House[]) => {
    setValue("units", units);
    setValue("houses", houses);

    // Calculate total price from selected properties
    const totalPrice =
      units.reduce((sum, unit) => sum + unit.price, 0) +
      houses.reduce((sum, house) => sum + house.price, 0);

    if (totalPrice > 0) {
      setValue("offerPrice", totalPrice);
      setValue("downPayment", Math.round(totalPrice * 0.2)); // Default 20% down payment
    }
  };

  const handleCreateOfferLetter = async () => {
    try {
      // Validate form
      const isValid = await form.trigger();
      // if (!isValid) {
      //   toast.error("Please fill in all required fields");
      //   return;
      // }

      // Get form data
      const formData = form.getValues();

      // Additional validation checks
      if (formData.units.length === 0 && formData.houses.length === 0) {
        toast.error("Please select at least one property");
        return;
      }

      if (formData.buyers.length === 0) {
        toast.error("Please select at least one buyer");
        return;
      }

      if (!formData.templateId) {
        toast.error("Please select a template");
        return;
      }

      if (!formData.offerPrice || formData.offerPrice <= 0) {
        toast.error("Please enter a valid offer price");
        return;
      }

      if (!formData.downPayment || formData.downPayment <= 0) {
        toast.error("Please enter a valid down payment");
        return;
      }

      if (!formData.dueDate) {
        toast.error("Please select a due date");
        return;
      }

      // Prepare data for API call
      const offerLetterData = {
        property_ids: [
          ...formData.units.map((unit) => unit.id),
          ...formData.houses.map((house) => house.id),
        ],
        buyer_ids: formData.buyers.map((buyer) => buyer.id),
        template_id: formData.templateId,
        offer_price: formData.offerPrice,
        down_payment: formData.downPayment,
        due_date: formData.dueDate,
        notes: formData.notes || "",
      };

      // Create offer letter using mutation
      createOfferLetterMutation.mutate(offerLetterData);
    } catch (error) {
      toast.error("Failed to create offer letter");
      console.error(error);
    }
  };

  const renderStepContent = () => {
    const setValueWrapper = (field: string, value: unknown) => {
      if (field === "project") setValue("project", value as Project | null);
      else if (field === "blocks") setValue("blocks", value as Block[]);
      else if (field === "units") {
        const units = value as Unit[];
        setValue("units", units);
        // Auto-populate offer price when units are selected
        if (units.length > 0) {
          const totalPrice = units.reduce((sum, unit) => sum + unit.price, 0);
          setValue("offerPrice", totalPrice);
          setValue("downPayment", Math.round(totalPrice * 0.2));
        }
      } else if (field === "houses") {
        const houses = value as House[];
        setValue("houses", houses);
        // Auto-populate offer price when houses are selected
        if (houses.length > 0) {
          const totalPrice = houses.reduce(
            (sum, house) => sum + house.price,
            0
          );
          setValue("offerPrice", totalPrice);
          setValue("downPayment", Math.round(totalPrice * 0.2));
        }
      } else if (field === "buyers") setValue("buyers", value as Buyer[]);
    };

    switch (currentStep) {
      case 1:
        return (
          <SelectPropertyStep
            selectedProject={selectedProject}
            projectSearch={projectSearch}
            selectedBlocks={selectedBlocks}
            selectedUnits={selectedUnits}
            selectedHouses={selectedHouses}
            projectBlocks={projectBlocks}
            filteredProjects={filteredProjects}
            mockHouses={projectHouses}
            mockBlocks={projectBlocks}
            isLoadingProjects={isLoadingProjects}
            setValue={setValueWrapper}
            setProjectSearch={setProjectSearch}
            handleProjectSelect={handleProjectSelect}
          />
        );
      case 2:
        return (
          <SelectBuyerStep
            ownerSearch={ownerSearch}
            selectedBuyers={selectedBuyers}
            mockBuyers={
              ownersData?.data?.results?.map(transformApiOwnerToBuyer) || []
            }
            isLoadingOwners={isLoadingOwners}
            setValue={setValueWrapper}
            setOwnerSearch={setOwnerSearch}
            handleBuyerSelect={handleBuyerSelect}
          />
        );
      case 3:
        return (
          <div className="space-y-6">
            {/* Template Selection - Full Width */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Offer Letter Template *
              </Label>

              <Select
                value={form.watch("templateId")}
                onValueChange={(value) => {
                  console.log("Template selected:", value);
                  setValue("templateId", value);
                }}
              >
                <SelectTrigger className="w-full h-11 bg-white border border-gray-300 hover:bg-gray-50">
                  <SelectValue
                    placeholder="Select an offer letter template"
                    className="text-gray-500"
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {isLoadingTemplates ? (
                    <div className="p-4 text-center text-gray-500">
                      <Loader2 className="mx-auto mb-2 w-6 h-6 animate-spin" />
                      <p>Loading templates...</p>
                    </div>
                  ) : templatesData?.data?.results?.length > 0 ? (
                    templatesData.data.results.map((template: any) => (
                      <SelectItem
                        key={template.id}
                        value={template.id}
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span>{template.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <FileText className="mx-auto mb-2 w-6 h-6 text-gray-400" />
                      <p>No offer letter templates found</p>
                      <p className="mt-1 text-xs">
                        Please create templates first
                      </p>
                    </div>
                  )}
                </SelectContent>
              </Select>

              {errors.templateId && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.templateId.message}
                </p>
              )}

              {/* Help Text */}
              <p className="text-xs text-gray-500">
                Select a template to generate the offer letter. Templates define
                the structure and content.
              </p>
            </div>

            {/* Three Column Layout */}
            <div className="grid grid-cols-3 gap-6">
              {/* First Column - Offer Price */}
              <div className="space-y-3">
                <Label>Offer Price (KES)</Label>
                <Input
                  type="number"
                  placeholder={
                    selectedUnits.length > 0 || selectedHouses.length > 0
                      ? "Auto-populated from property selection"
                      : "Select properties first"
                  }
                  value={offerPrice || ""}
                  onChange={(e) =>
                    setValue("offerPrice", Number(e.target.value))
                  }
                  className="w-full"
                  disabled={
                    selectedUnits.length === 0 && selectedHouses.length === 0
                  }
                />
                {errors.offerPrice && (
                  <p className="text-xs text-red-500">
                    {errors.offerPrice.message}
                  </p>
                )}
                {(selectedUnits.length > 0 || selectedHouses.length > 0) && (
                  <p className="text-xs text-green-600">
                    ✓ Price auto-populated from selected properties
                  </p>
                )}
              </div>

              {/* Second Column - Down Payment */}
              <div className="space-y-3">
                <Label>Down Payment (KES)</Label>
                <Input
                  type="number"
                  placeholder={
                    offerPrice > 0
                      ? "Auto-calculated (20% of offer price)"
                      : "Offer price required first"
                  }
                  value={downPayment || ""}
                  onChange={(e) =>
                    setValue("downPayment", Number(e.target.value))
                  }
                  className="w-full"
                  disabled={offerPrice === 0}
                />
                {errors.downPayment && (
                  <p className="text-xs text-red-500">
                    {errors.downPayment.message}
                  </p>
                )}
                {offerPrice > 0 && (
                  <p className="text-xs text-blue-600">
                    ✓ Auto-calculated as 20% of offer price
                  </p>
                )}
              </div>

              {/* Third Column - Due Date */}
              <div className="space-y-3">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.watch("dueDate")}
                  onChange={(e) => setValue("dueDate", e.target.value)}
                  className="w-full"
                  min={new Date().toISOString().split("T")[0]}
                />
                {errors.dueDate && (
                  <p className="text-xs text-red-500">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Notes - Full Row */}
            <div className="space-y-3">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any additional notes..."
                value={form.watch("notes")}
                onChange={(e) => setValue("notes", e.target.value)}
                className="w-full"
                rows={3}
                style={{ resize: "none" }}
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="space-y-2 text-center">
              <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                Review Offer Letter
              </h3>
              <p className="text-sm text-gray-600">
                Please review all details before creating the offer letter
              </p>
            </div>

            {/* Validation Summary */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="flex items-center mb-3 font-semibold text-blue-900">
                <CheckCircle2 className="mr-2 w-5 h-5" />
                Validation Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div
                    className={`flex items-center ${
                      selectedProject ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {selectedProject ? (
                      <CheckCircle2 className="mr-2 w-4 h-4" />
                    ) : (
                      <div className="mr-2 w-4 h-4 rounded-full border-2 border-red-600" />
                    )}
                    Project Selected
                  </div>
                  <div
                    className={`flex items-center ${
                      selectedUnits.length > 0 || selectedHouses.length > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {selectedUnits.length > 0 || selectedHouses.length > 0 ? (
                      <CheckCircle2 className="mr-2 w-4 h-4" />
                    ) : (
                      <div className="mr-2 w-4 h-4 rounded-full border-2 border-red-600" />
                    )}
                    Properties Selected (
                    {selectedUnits.length + selectedHouses.length})
                  </div>
                  <div
                    className={`flex items-center ${
                      selectedBuyers.length > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {selectedBuyers.length > 0 ? (
                      <CheckCircle2 className="mr-2 w-4 h-4" />
                    ) : (
                      <div className="mr-2 w-4 h-4 rounded-full border-2 border-red-600" />
                    )}
                    Buyers Selected ({selectedBuyers.length})
                  </div>
                </div>
                <div className="space-y-2">
                  <div
                    className={`flex items-center ${
                      form.watch("templateId")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {form.watch("templateId") ? (
                      <CheckCircle2 className="mr-2 w-4 h-4" />
                    ) : (
                      <div className="mr-2 w-4 h-4 rounded-full border-2 border-red-600" />
                    )}
                    Template Selected
                  </div>
                  <div
                    className={`flex items-center ${
                      offerPrice > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {offerPrice > 0 ? (
                      <CheckCircle2 className="mr-2 w-4 h-4" />
                    ) : (
                      <div className="mr-2 w-4 h-4 rounded-full border-2 border-red-600" />
                    )}
                    Offer Price Set
                  </div>
                  <div
                    className={`flex items-center ${
                      form.watch("dueDate") ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {form.watch("dueDate") ? (
                      <CheckCircle2 className="mr-2 w-4 h-4" />
                    ) : (
                      <div className="mr-2 w-4 h-4 rounded-full border-2 border-red-600" />
                    )}
                    Due Date Set
                  </div>
                </div>
              </div>
            </div>

            {/* Main Summary Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Project & Property Details */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center mb-4 space-x-3">
                  <div className="flex justify-center items-center w-10 h-10 bg-blue-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-blue-900">
                      Project Details
                    </h4>
                    <p className="text-sm text-blue-600">
                      Property Information
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="font-medium text-blue-700">
                      Project Name
                    </span>
                    <span className="font-semibold text-blue-900">
                      {selectedProject?.name || "Not selected"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="font-medium text-blue-700">
                      Properties
                    </span>
                    <span className="font-semibold text-blue-900">
                      {selectedUnits.length + selectedHouses.length} selected
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium text-blue-700">
                      Project Type
                    </span>
                    <span className="font-semibold text-blue-900 capitalize">
                      {selectedProject?.type || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Buyer Details */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <div className="flex items-center mb-4 space-x-3">
                  <div className="flex justify-center items-center w-10 h-10 bg-purple-100 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-purple-900">
                      Buyer Information
                    </h4>
                    <p className="text-sm text-purple-600">Client Details</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-purple-100">
                    <span className="font-medium text-purple-700">Buyers</span>
                    <span className="font-semibold text-purple-900">
                      {selectedBuyers.length} selected
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium text-purple-700">
                      Due Date
                    </span>
                    <span className="font-semibold text-purple-900">
                      {form.watch("dueDate") || "Not set"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center mb-4 space-x-3">
                <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-green-900">
                    Financial Summary
                  </h4>
                  <p className="text-sm text-green-600">
                    Pricing & Payment Details
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-green-100">
                    <span className="font-medium text-green-700">
                      Offer Price
                    </span>
                    <span className="text-lg font-bold text-green-900">
                      KES {offerPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium text-green-700">
                      Down Payment
                    </span>
                    <span className="text-lg font-bold text-green-900">
                      KES {downPayment.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-green-100">
                    <span className="font-medium text-green-700">
                      Remaining
                    </span>
                    <span className="text-lg font-bold text-green-900">
                      KES {(offerPrice - downPayment).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium text-green-700">
                      Payment %
                    </span>
                    <span className="text-lg font-bold text-green-900">
                      {Math.round((downPayment / offerPrice) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section (if exists) */}
            {form.watch("notes") && (
              <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                <div className="flex items-center mb-4 space-x-3">
                  <div className="flex justify-center items-center w-10 h-10 bg-amber-100 rounded-lg">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-amber-900">
                      Additional Notes
                    </h4>
                    <p className="text-sm text-amber-600">
                      Special Instructions
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-amber-100 bg-white/60">
                  <p className="text-sm leading-relaxed text-amber-900">
                    {form.watch("notes")}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="mt-10 p-0 min-w-4xl h-[calc(100vh-100px)] overflow-y-hidden">
        <Form {...form}>
          <DialogHeader className="flex flex-col flex-shrink-0 items-start px-4 py-2 border-b h-[140px]">
            <DialogTitle className="text-base font-semibold text-gray-900">
              Create Offer Letter
            </DialogTitle>
            <p className="mb-1 text-xs text-gray-600">
              Step {currentStep} of {steps.length}
            </p>
            {/* Stepper */}
            <div className="bg-gray-50 px-3 py-1.5 rounded-lg w-full">
              <div className="flex items-center">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex flex-1 justify-start items-center"
                  >
                    <div
                      className={`flex items-center justify-center w-5 h-5 rounded-full border-2 text-xs ${
                        step.id <= currentStep
                          ? "bg-primary border-primary text-white"
                          : "bg-white border-gray-300 text-gray-500"
                      }`}
                    >
                      {step.id < currentStep ? (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      ) : (
                        <step.icon className="w-2.5 h-2.5" />
                      )}
                    </div>
                    <span
                      className={`ml-1.5 text-xs font-medium truncate whitespace-pre-line text-left ${
                        step.id <= currentStep
                          ? "text-primary"
                          : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-1.5 ${
                          step.id < currentStep ? "bg-primary" : "bg-gray-300"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogHeader>

          {/* Content - Scrollable */}
          <ScrollArea className="flex-1 px-6 py-4 h-[calc(100vh-370px)]">
            {renderStepContent()}
          </ScrollArea>

          {/* Footer - Fixed */}
          <div className="flex flex-shrink-0 justify-between items-center bg-gray-50 px-4 py-3 border-t h-[80px]">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center space-x-2">
              {currentStep === steps.length ? (
                <Button
                  onClick={handleCreateOfferLetter}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={createOfferLetterMutation.isPending}
                >
                  {createOfferLetterMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Offer Letter"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="flex items-center space-x-2"
                  disabled={
                    (currentStep === 1 && !selectedProject) ||
                    (currentStep === 2 && selectedBuyers.length === 0) ||
                    (currentStep === 3 &&
                      (!offerPrice ||
                        !downPayment ||
                        !form.watch("dueDate") ||
                        !form.watch("templateId") ||
                        (selectedUnits.length === 0 &&
                          selectedHouses.length === 0)))
                  }
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
