import {
    Building2, CheckCircle2, ChevronLeft, ChevronRight, DollarSign, FileText, Loader2, Users,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { createContract } from '@/actions/sales/createContract';
import { getAllTemplates } from '@/actions/sales/documentTemplates';
import { getProjectStructure, searchOwners, searchProjects } from '@/actions/sales/loadProjects';
import { searchOfferLetters } from '@/actions/sales/searchOfferLetters';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
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

// Zod schema for contract form validation
const contractSchema = z.object({
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
  offerLetterId: z.string().min(1, "Offer letter is required"),
  templateId: z.string().min(1, "Contract template is required"),
  notes: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractSchema>;

interface CreateContractModalProps {
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
  { id: 3, title: "Contract\nDetails", icon: DollarSign },
  { id: 4, title: "Review &\nCreate", icon: FileText },
];

export default function CreateContractModal({
  open,
  onClose,
  onUpload,
  mode,
}: CreateContractModalProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Handle modal close with data clearing
  const handleClose = () => {
    clearAllFormData();
    onClose();
  };

  // React Hook Form setup
  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      project: null,
      blocks: [],
      units: [],
      houses: [],
      buyers: [],
      offerLetterId: "",
      templateId: "",
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
  const selectedOfferLetterId = watch("offerLetterId");

  // Search states
  const [projectSearch, setProjectSearch] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");

  // Selected offer letter details
  const [selectedOfferLetterDetails, setSelectedOfferLetterDetails] =
    useState<any>(null);

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
  const { data: projectStructureData } = useQuery({
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

  // Fetch contract templates
  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useQuery({
    queryKey: ["contractTemplates"],
    queryFn: async () => {
      console.log("Fetching contract templates...");
      const result = await getAllTemplates("sales_agreement");
      console.log("Templates result:", result);
      return result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Fetch offer letters when buyers and properties are selected
  const {
    data: offerLettersData,
    isLoading: isLoadingOfferLetters,
    error: offerLettersError,
  } = useQuery({
    queryKey: ["offerLetters", selectedBuyers, selectedUnits, selectedHouses],
    queryFn: async () => {
      if (
        selectedBuyers.length === 0 ||
        (selectedUnits.length === 0 && selectedHouses.length === 0)
      ) {
        return null;
      }

      const buyerIds = selectedBuyers.map((buyer) => buyer.id);
      const propertyIds = [
        ...selectedUnits.map((unit) => unit.id),
        ...selectedHouses.map((house) => house.id),
      ];

      console.log("Fetching offer letters for:", { buyerIds, propertyIds });
      const result = await searchOfferLetters({
        owner_ids: buyerIds,
        property_ids: propertyIds,
      });
      console.log("Offer letters result:", result);
      return result;
    },
    enabled:
      selectedBuyers.length > 0 &&
      (selectedUnits.length > 0 || selectedHouses.length > 0),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Contract creation mutation
  const createContractMutation = useMutation({
    mutationFn: createContract,
    onSuccess: (data) => {
      if (data.success) {
        // Use backend message instead of hardcoded frontend message
        toast.success(data.message || "Contract created successfully!");
        onUpload();
        handleClose();
      } else {
        // Show detailed error message from backend
        const errorMessage = data.message || "Failed to create contract";
        if (data.details) {
          // Show specific field errors
          const fieldErrors = Object.entries(data.details)
            .map(
              ([field, errors]) =>
                `${field}: ${Array.isArray(errors) ? errors[0] : errors}`
            )
            .join(", ");
          toast.error(`${errorMessage} - ${fieldErrors}`);
        } else {
          toast.error(errorMessage);
        }
      }
    },
    onError: (error) => {
      toast.error("Failed to create contract");
      console.error("Contract creation error:", error);
    },
  });

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
    setValue("offerLetterId", "");
    setValue("templateId", "");
    setValue("notes", "");

    // Clear search states
    setProjectSearch("");
    setOwnerSearch("");

    // Clear selected offer letter details
    setSelectedOfferLetterDetails(null);

    // Reset to first step
    setCurrentStep(1);
  };

  const handleProjectSelect = (project: Project) => {
    setValue("project", project);
    setValue("blocks", []);
    setValue("units", []);
    setValue("houses", []);
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

  const handleCreateContract = async () => {
    try {
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

      if (!formData.offerLetterId) {
        toast.error("Please select an offer letter");
        return;
      }

      if (!formData.templateId) {
        toast.error("Please select a template");
        return;
      }

      // Prepare data for API call
      const contractData = {
        offer_letter_id: formData.offerLetterId,
        template_id: formData.templateId,
        notes: formData.notes || "",
        update_offer_letter_status: true, // Automatically update offer letter status
      };

      // Use mutation to create contract
      createContractMutation.mutate(contractData);
    } catch (error) {
      toast.error("Failed to create contract");
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
      } else if (field === "houses") {
        const houses = value as House[];
        setValue("houses", houses);
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
            filteredProjects={
              projectsData?.data?.results?.map(transformApiProjectToProject) ||
              []
            }
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
            {/* Two Column Layout for Dropdowns */}
            <div className="gap-6 grid grid-cols-2">
              {/* First Column - Offer Letter Selection */}
              <div className="space-y-3">
                <Label className="font-medium text-gray-700 text-sm">
                  Select Offer Letter *
                </Label>

                <Select
                  value={form.watch("offerLetterId")}
                  onValueChange={(value) => {
                    console.log("Offer letter selected:", value);
                    setValue("offerLetterId", value);

                    // Find and store the selected offer letter details
                    if (
                      offerLettersData?.success &&
                      offerLettersData.data.results
                    ) {
                      const selectedOffer = offerLettersData.data.results.find(
                        (offer) => offer.id === value
                      );
                      setSelectedOfferLetterDetails(selectedOffer || null);
                    }
                  }}
                >
                  <SelectTrigger className="bg-white hover:bg-gray-50 border border-gray-300 w-full !h-11">
                    <SelectValue
                      placeholder="Select an offer letter"
                      className="text-gray-500"
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {isLoadingOfferLetters ? (
                      <div className="p-4 text-gray-500 text-center">
                        <Loader2 className="mx-auto mb-2 w-6 h-6 animate-spin" />
                        <p>Loading offer letters...</p>
                      </div>
                    ) : offerLettersData?.success &&
                      offerLettersData.data.results.length > 0 ? (
                      offerLettersData.data.results.map((offerLetter) => (
                        <SelectItem
                          key={offerLetter.id}
                          value={offerLetter.id}
                          className="hover:bg-gray-100 cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {offerLetter.document_title}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {offerLetter.buyer_name} -{" "}
                                {offerLetter.property_name}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-gray-500 text-center">
                        <FileText className="mx-auto mb-2 w-6 h-6 text-gray-400" />
                        <p>No offer letters found</p>
                        <p className="mt-1 text-xs">
                          {selectedBuyers.length === 0 ||
                          (selectedUnits.length === 0 &&
                            selectedHouses.length === 0)
                            ? "Select buyers and properties first"
                            : "No offer letters match the selected criteria"}
                        </p>
                      </div>
                    )}
                  </SelectContent>
                </Select>

                {errors.offerLetterId && (
                  <p className="mt-1 text-red-500 text-xs">
                    {errors.offerLetterId.message}
                  </p>
                )}

                {/* Help Text */}
                <p className="text-gray-500 text-xs">
                  Select an existing offer letter to convert to a contract. The
                  offer details will be automatically populated.
                </p>
              </div>

              {/* Second Column - Contract Template Selection */}
              <div className="space-y-3">
                <Label className="font-medium text-gray-700 text-sm">
                  Contract Template *
                </Label>

                <Select
                  value={form.watch("templateId")}
                  onValueChange={(value) => {
                    console.log("Template selected:", value);
                    setValue("templateId", value);
                  }}
                >
                  <SelectTrigger className="bg-white hover:bg-gray-50 border border-gray-300 w-full !h-11">
                    <SelectValue
                      placeholder="Select a contract template"
                      className="text-gray-500"
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {isLoadingTemplates ? (
                      <div className="p-4 text-gray-500 text-center">
                        <Loader2 className="mx-auto mb-2 w-6 h-6 animate-spin" />
                        <p>Loading templates...</p>
                      </div>
                    ) : templatesData?.data?.results?.length > 0 ? (
                      templatesData.data.results.map((template: any) => (
                        <SelectItem
                          key={template.id}
                          value={template.id}
                          className="hover:bg-gray-100 cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span>{template.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-gray-500 text-center">
                        <FileText className="mx-auto mb-2 w-6 h-6 text-gray-400" />
                        <p>No contract templates found</p>
                        <p className="mt-1 text-xs">
                          Please create templates first
                        </p>
                      </div>
                    )}
                  </SelectContent>
                </Select>

                {errors.templateId && (
                  <p className="mt-1 text-red-500 text-xs">
                    {errors.templateId.message}
                  </p>
                )}

                {/* Help Text */}
                <p className="text-gray-500 text-xs">
                  Select a template to generate the contract. Templates define
                  the structure and content.
                </p>
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

            {/* Selected Offer Letter Details - Below Notes */}
            {selectedOfferLetterDetails && (
              <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                <h5 className="mb-3 font-medium text-blue-900 text-sm">
                  Offer Letter Details
                </h5>
                <div className="space-y-2 text-blue-800 text-xs">
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-medium">
                      {selectedOfferLetterDetails.price_formatted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Down Payment:</span>
                    <span className="font-medium">
                      {selectedOfferLetterDetails.down_payment_formatted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Due Date:</span>
                    <span className="font-medium">
                      {selectedOfferLetterDetails.due_date_formatted}
                    </span>
                  </div>
                </div>

                {/* Status Update Info */}
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center space-x-2 text-blue-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium text-xs">
                      When you create this contract, the offer letter status
                      will be automatically updated to "Accepted"
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="space-y-2 text-center">
              <div className="flex justify-center items-center bg-gradient-to-br from-green-400 to-green-600 mx-auto mb-4 rounded-full w-16 h-16">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-2xl">
                Review Contract
              </h3>
              <p className="text-gray-600 text-sm">
                Please review all details before creating the contract
              </p>
            </div>

            {/* Main Summary Cards */}
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
              {/* Project & Property Details */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border border-blue-200 rounded-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 text-lg">
                      Project Details
                    </h4>
                    <p className="text-blue-600 text-sm">
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
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 border border-purple-200 rounded-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex justify-center items-center bg-purple-100 rounded-lg w-10 h-10">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-900 text-lg">
                      Buyer Information
                    </h4>
                    <p className="text-purple-600 text-sm">Client Details</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-purple-100 border-b">
                    <span className="font-medium text-purple-700">Buyers</span>
                    <span className="font-semibold text-purple-900">
                      {selectedBuyers.length} selected
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium text-purple-700">
                      Offer Letter
                    </span>
                    <span className="font-semibold text-purple-900">
                      {form.watch("offerLetterId")
                        ? "Selected"
                        : "Not selected"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Offer Letter Summary Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 border border-green-200 rounded-xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex justify-center items-center bg-green-100 rounded-lg w-10 h-10">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900 text-lg">
                    Offer Letter Summary
                  </h4>
                  <p className="text-green-600 text-sm">
                    Details from selected offer letter
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-green-100 border-b">
                  <span className="font-medium text-green-700">
                    Offer Letter
                  </span>
                  <span className="font-bold text-green-900 text-lg">
                    {selectedOfferLetterDetails?.document_title ||
                      "Not selected"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-green-100 border-b">
                  <span className="font-medium text-green-700">Buyer</span>
                  <span className="font-bold text-green-900 text-lg">
                    {selectedOfferLetterDetails?.buyer_name || "Not selected"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-green-100 border-b">
                  <span className="font-medium text-green-700">Property</span>
                  <span className="font-bold text-green-900 text-lg">
                    {selectedOfferLetterDetails?.property_name ||
                      "Not selected"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-green-100 border-b">
                  <span className="font-medium text-green-700">Project</span>
                  <span className="font-bold text-green-900 text-lg">
                    {selectedOfferLetterDetails?.project_name || "Not selected"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-green-700">
                    Contract Template
                  </span>
                  <span className="font-bold text-green-900 text-lg">
                    {templatesData?.data?.results?.find(
                      (t) => t.id === form.watch("templateId")
                    )?.name || "Not selected"}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes Section (if exists) */}
            {form.watch("notes") && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 border border-amber-200 rounded-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex justify-center items-center bg-amber-100 rounded-lg w-10 h-10">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900 text-lg">
                      Additional Notes
                    </h4>
                    <p className="text-amber-600 text-sm">
                      Special Instructions
                    </p>
                  </div>
                </div>

                <div className="bg-white/60 p-4 border border-amber-100 rounded-lg">
                  <p className="text-amber-900 text-sm leading-relaxed">
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
            <DialogTitle className="font-semibold text-gray-900 text-base">
              Create Contract
            </DialogTitle>
            <p className="mb-1 text-gray-600 text-xs">
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
                        step.id <= currentStep ? "text-primary" : "text-red-500"
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
                  onClick={handleCreateContract}
                  disabled={createContractMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createContractMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Contract"
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
                      (!form.watch("offerLetterId") ||
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
