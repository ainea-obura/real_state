import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  User,
  Users,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import {
  fetchPaymentPlanTemplates,
  getProjectStructure,
  searchAgents,
  searchOwners,
  searchProjects,
} from "@/actions/sales/loadProjects";
import { createPropertySale } from "@/actions/sales/propertyAssignment";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";

import SelectPropertyStep from "./stepsForOwnerAssigment/step1";
import SelectBuyerStep from "./stepsForOwnerAssigment/step2";
import SelectAgentStep from "./stepsForOwnerAssigment/step3";
import PurchasePlanStep from "./stepsForOwnerAssigment/step4";
import PaymentPlanSummaryStep from "./stepsForOwnerAssigment/step5";

// Zod schema for form validation
const assignBuyerSchema = z.object({
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
  agent: z.string(),
  commission: z
    .union([z.number().min(0), z.string()])
    .refine((val) => val === "" || (typeof val === "number" && val > 0), {
      message: "Commission must be provided",
    }),
  commissionType: z.enum(["%", "fixed"]),
  listPrice: z.number().min(0),
  paymentPlan: z.string(),
  startDate: z.string().optional(),
  frequency: z.string(),
  installmentCount: z.number().min(1).max(120).optional(),
  downPayment: z.number().min(0).max(100).optional(),
  templateId: z.string().optional(),
});

type AssignBuyerFormData = z.infer<typeof assignBuyerSchema>;

interface AssignBuyerWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
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

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  commission: string;
}

interface PaymentPlan {
  id: string;
  name: string;
  periods: number;
  frequency: string;
  deposit: number;
}

const steps = [
  { id: 1, title: "Select\nProperty", icon: Building2 },
  { id: 2, title: "Select\nOwner", icon: Users },
  { id: 3, title: "Agent &\nCommission", icon: User },
  { id: 4, title: "Purchase\nTerms", icon: DollarSign },
  { id: 5, title: "Payment\nPlan", icon: CreditCard },
];

export default function AssignBuyerWizardModal({
  isOpen,
  onClose,
}: AssignBuyerWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Handle modal close with data clearing
  const handleClose = () => {
    clearAllFormData();
    onClose();
  };

  // React Hook Form setup
  const form = useForm<AssignBuyerFormData>({
    resolver: zodResolver(assignBuyerSchema),
    defaultValues: {
      project: null,
      blocks: [],
      units: [],
      houses: [],
      buyers: [],
      agent: "",
      commission: "",
      commissionType: "fixed",
      listPrice: 0,
      paymentPlan: "full", // Set default to "full"
      startDate: "",
      frequency: "monthly",
      installmentCount: 0,
      downPayment: 0,
      templateId: "",
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
  const selectedAgent = watch("agent");
  const commission = watch("commission");
  const commissionType = watch("commissionType");

  // Search states
  const [projectSearch, setProjectSearch] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [agentSearch, setAgentSearch] = useState("");

  // Mock data arrays for other entities (to be replaced with real APIs later)
  const mockBuyers: Buyer[] = [];

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

  // Transform API agent data to local Agent interface
  const transformApiAgentToAgent = (apiAgent: any): Agent => {
    return {
      id: apiAgent.id,
      name: apiAgent.full_name,
      email: apiAgent.email,
      phone: apiAgent.phone,
      commission: "0", // Default commission value
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
    retry: false, // Don't retry failed requests
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount
  });

  // Use useQuery to search agents with optimized settings
  const { data: agentsData, isLoading: isLoadingAgents } = useQuery({
    queryKey: ["searchAgents", agentSearch],
    queryFn: () => searchAgents({ q: agentSearch }),
    enabled: !!agentSearch && agentSearch.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry failed requests
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount
  });

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
        .filter((apiFloor: any) => apiFloor.units && apiFloor.units.length > 0) // Only show floors with units
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

  // Calculate total price for selected properties in KES
  const totalPropertyPrice = (() => {
    // If specific units/houses are selected, use those
    if (selectedUnits.length > 0 || selectedHouses.length > 0) {
      return (
        selectedUnits.reduce((sum, unit) => sum + unit.price, 0) +
        selectedHouses.reduce((sum, house) => sum + house.price, 0)
      );
    }

    // If no specific units/houses selected but project is selected, calculate all available units in the project
    if (selectedProject) {
      let total = 0;

      if (selectedProject.hasBlocks) {
        // Calculate total price of all available units in all blocks of the project
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
        // Calculate total price of all available houses in the project
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

  // Use useQuery to fetch payment plan templates
  const { data: paymentTemplatesData, isLoading: isLoadingPaymentTemplates } =
    useQuery({
      queryKey: ["paymentPlanTemplates", totalPropertyPrice],
      queryFn: () =>
        fetchPaymentPlanTemplates({
          featured: true, // Get featured templates by default
          property_price:
            totalPropertyPrice > 0 ? totalPropertyPrice : undefined,
        }),
      enabled: totalPropertyPrice > 0, // Only fetch when we have a property price
      staleTime: 10 * 60 * 1000, // 10 minutes
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    });

  // Use useMutation for creating property sales
  const createPropertySaleMutation = useMutation({
    mutationFn: createPropertySale,
    onSuccess: (data) => {
      if (data.success) {
        console.log("✅ Property sale created successfully!");
        console.log("Sale ID:", data.data.id);
        console.log("Total Properties:", data.data.total_properties);
        console.log("Total Buyers:", data.data.total_buyers);
        console.log("Total Sale Value:", data.data.total_sale_value);

        // Show success toast with green color
        toast.success("Property Sale Created Successfully!", {
          description: `${data.data.total_properties} properties • ${data.data.total_buyers} buyers`,
          duration: 5000,
        });

        // Close the modal after successful creation
        handleClose();
      } else {
        console.error("❌ Property sale creation failed:", data.message);
        // Type guard to ensure error property exists
        if ("error" in data) {
          console.error("Error details:", data.error);
        }

        // Show error toast with red color
        toast.error("Failed to Create Property Sale", {
          description: data.message,
          duration: 5000,
        });
      }
    },
    onError: (error) => {
      console.error("❌ Mutation error:", error);

      // Show error toast with red color
      toast.error("Unexpected Error", {
        description:
          "An unexpected error occurred while creating the property sale. Please try again.",
        duration: 5000,
      });
    },
  });

  // Transform API payment template data to local PaymentPlan interface
  const paymentTemplates: PaymentPlan[] = useMemo(() => {
    if (!paymentTemplatesData || paymentTemplatesData.error) return [];

    console.log("Raw API data:", paymentTemplatesData.data.results);

    const transformed = paymentTemplatesData.data.results.map(
      (template: any) => {
        console.log("Template being transformed:", template);
        console.log(
          "deposit_percentage value:",
          template.deposit_percentage,
          "Type:",
          typeof template.deposit_percentage
        );

        return {
          id: template.id,
          name: template.name,
          periods: template.periods,
          frequency: template.frequency,
          deposit: template.deposit_percentage,
        };
      }
    );

    console.log("Transformed templates:", transformed);
    return transformed;
  }, [paymentTemplatesData]);

  const handleNext = () => {
    if (currentStep < steps.length) {
      // Log data before moving to next step
      console.log(`=== STEP ${currentStep} DATA ===`);
      console.log("Current Form Values:", form.getValues());
      console.log("Selected Project:", selectedProject);
      console.log("Selected Blocks:", selectedBlocks);
      console.log("Selected Units:", selectedUnits);
      console.log("Selected Houses:", selectedHouses);
      console.log("Selected Buyers:", selectedBuyers);
      console.log("Selected Agent:", selectedAgent);
      console.log("Commission:", commission);
      console.log("Commission Type:", commissionType);
      console.log("Total Property Price:", totalPropertyPrice);
      console.log("Co-ownership Percentages:", coOwnershipPercentages);
      console.log("Total Percentage:", totalPercentage);
      console.log("========================");

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
    setValue("agent", "");
    setValue("commission", "");
    setValue("commissionType", "fixed");
    setValue("listPrice", 0);
    setValue("paymentPlan", "full");
    setValue("startDate", "");
    setValue("frequency", "monthly");
    setValue("installmentCount", 0);
    setValue("downPayment", 0);
    setValue("templateId", "");

    // Clear search states
    setProjectSearch("");
    setOwnerSearch("");
    setAgentSearch("");

    // Clear co-ownership percentages
    setCoOwnershipPercentages({});

    // Reset to first step
    setCurrentStep(1);
  };

  const handleProjectSelect = (project: Project) => {
    console.log("=== PROJECT SELECTED ===");
    console.log("Selected Project:", project);
    console.log("Project Type:", project.type);
    console.log("Has Blocks:", project.hasBlocks);
    console.log("Has Houses:", project.hasHouses);
    console.log("========================");

    setValue("project", project);
    setValue("blocks", []);
    setValue("units", []);
    setValue("houses", []);
    setValue("agent", "");
    setValue("commission", "");
    setValue("commissionType", "fixed");
    setValue("listPrice", 0);
    setValue("paymentPlan", "full");
    setValue("startDate", "");
    setValue("frequency", "monthly");
    setValue("installmentCount", 0);
    setValue("downPayment", 0);
    setValue("templateId", "");
  };

  const handleBlockSelect = (block: Block) => {
    console.log("=== BLOCK SELECTED ===");
    console.log("Selected Block:", block);
    console.log("Block Floors:", block.floors);
    console.log(
      "Total Units in Block:",
      block.floors.reduce((sum, floor) => sum + floor.units.length, 0)
    );
    console.log(
      "Available Units in Block:",
      block.floors.reduce(
        (sum, floor) =>
          sum +
          floor.units.filter((unit) => unit.status === "available").length,
        0
      )
    );
    console.log("========================");

    setValue("blocks", [...selectedBlocks, block]);
  };

  const handleBuyerSelect = (buyer: Buyer) => {
    console.log("=== BUYER SELECTION ===");
    console.log("Buyer:", buyer);
    console.log("Current Selected Buyers:", selectedBuyers);
    console.log(
      "Is Buyer Already Selected:",
      selectedBuyers.find((b) => b.id === buyer.id)
    );
    console.log("========================");

    // Check if buyer is already selected to prevent duplicates
    if (selectedBuyers.find((b) => b.id === buyer.id)) {
      // Remove buyer if already selected
      setValue(
        "buyers",
        selectedBuyers.filter((b) => b.id !== buyer.id)
      );
    } else {
      // Add buyer if not already selected
      setValue("buyers", [...selectedBuyers, buyer]);
    }
  };

  const handleAgentSelect = (agent: Agent) => {
    console.log("=== AGENT SELECTED ===");
    console.log("Selected Agent:", agent);
    console.log("Agent ID:", agent.id);
    console.log("Agent Commission:", agent.commission);
    console.log("========================");

    setValue("agent", agent.id);
  };

  // Co-ownership state
  const [coOwnershipPercentages, setCoOwnershipPercentages] = useState<
    Record<string, number>
  >({});

  // Template tracking state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Auto-assign 100% to single owner or initialize co-ownership
  React.useEffect(() => {
    if (selectedBuyers.length === 1) {
      // Single owner gets 100% automatically
      setCoOwnershipPercentages({ [selectedBuyers[0].id]: 100 });
    } else if (selectedBuyers.length > 1) {
      // Multiple owners - always distribute equally
      const equalPercentage = Math.floor(100 / selectedBuyers.length);
      const remainder = 100 % selectedBuyers.length;

      const newPercentages: Record<string, number> = {};
      selectedBuyers.forEach((buyer, index) => {
        newPercentages[buyer.id] =
          equalPercentage + (index < remainder ? 1 : 0);
      });

      setCoOwnershipPercentages(newPercentages);
    } else {
      // No owners selected - clear percentages
      setCoOwnershipPercentages({});
    }
  }, [selectedBuyers.length, selectedBuyers.map((b) => b.id).join(",")]);

  // Calculate co-ownership amounts and total percentage
  const totalPercentage = Object.values(coOwnershipPercentages).reduce(
    (sum, percentage) => sum + percentage,
    0
  );
  const isValidCoOwnership = totalPercentage === 100;

  // Calculate individual amounts based on percentages
  const getBuyerAmount = (buyerId: string) => {
    const percentage = coOwnershipPercentages[buyerId] || 0;
    return (totalPropertyPrice * percentage) / 100;
  };

  const handleCoOwnershipChange = (buyerId: string, percentage: number) => {
    console.log("=== CO-OWNERSHIP CHANGE ===");
    console.log("Buyer ID:", buyerId);
    console.log("New Percentage:", percentage);
    console.log("Previous Percentages:", coOwnershipPercentages);
    console.log("========================");

    if (percentage > 100) return; // Prevent exceeding 100%

    setCoOwnershipPercentages((prev) => ({
      ...prev,
      [buyerId]: percentage,
    }));
  };

  const handleTemplateChange = (templateId: string | null) => {
    console.log("=== TEMPLATE CHANGE ===");
    console.log("Template ID:", templateId);
    console.log("Previous Template ID:", selectedTemplateId);
    console.log("========================");

    setSelectedTemplateId(templateId);

    // If switching to custom mode, clear the template selection in the form
    if (templateId === null) {
      setValue("templateId", "");
      setIsCustomMode(true); // User is now in custom mode
    } else {
      setValue("templateId", templateId);
      setIsCustomMode(false); // User selected a template, not in custom mode
    }
  };

  // Function to handle when user manually changes values (should set to custom mode)
  const handleManualValueChange = () => {
    if (selectedTemplateId) {
      setIsCustomMode(true);
      setValue("templateId", ""); // Clear template selection
    }
  };

  // Helper function to create a setValue wrapper for step components
  const createSetValueWrapper = () => {
    return (field: string, value: unknown) => {
      // Type-safe way to set form values
      if (field === "project") setValue("project", value as Project | null);
      else if (field === "blocks") setValue("blocks", value as Block[]);
      else if (field === "units") setValue("units", value as Unit[]);
      else if (field === "houses") setValue("houses", value as House[]);
      else if (field === "buyers") setValue("buyers", value as Buyer[]);
      else if (field === "agent") setValue("agent", value as string);
      else if (field === "commission")
        setValue("commission", value as string | number);
      else if (field === "commissionType")
        setValue("commissionType", value as "%" | "fixed");
      else if (field === "listPrice") setValue("listPrice", value as number);
      else if (field === "paymentPlan")
        setValue("paymentPlan", value as string);
      else if (field === "startDate") setValue("startDate", value as string);
      else if (field === "frequency") setValue("frequency", value as string);
      else if (field === "installmentCount")
        setValue("installmentCount", value as number);
      else if (field === "downPayment")
        setValue("downPayment", value as number);
      else if (field === "templateId") setValue("templateId", value as string);
    };
  };

  const renderStepContent = () => {
    const setValueWrapper = createSetValueWrapper();

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
          <SelectAgentStep
            agentSearch={agentSearch}
            selectedAgent={selectedAgent}
            commission={typeof commission === "number" ? commission : 0}
            commissionType={commissionType}
            mockAgents={
              agentsData?.data?.results?.map(transformApiAgentToAgent) || []
            }
            isLoadingAgents={isLoadingAgents}
            setValue={setValueWrapper}
            setAgentSearch={setAgentSearch}
            handleAgentSelect={handleAgentSelect}
          />
        );
      case 4:
        return (
          <PurchasePlanStep
            totalPropertyPrice={totalPropertyPrice}
            selectedUnits={selectedUnits}
            selectedHouses={selectedHouses}
            selectedProject={selectedProject}
            selectedBuyers={selectedBuyers}
            coOwnershipPercentages={coOwnershipPercentages}
            totalPercentage={totalPercentage}
            setValue={setValueWrapper}
            handleCoOwnershipChange={handleCoOwnershipChange}
            getBuyerAmount={getBuyerAmount}
          />
        );
      case 5:
        return (
          <PaymentPlanSummaryStep
            form={form as any}
            totalPropertyPrice={totalPropertyPrice}
            mockPaymentPlans={paymentTemplates}
            setValue={setValueWrapper}
            isLoadingTemplates={isLoadingPaymentTemplates}
            onTemplateChange={handleTemplateChange}
            isCustomMode={isCustomMode}
            onManualValueChange={handleManualValueChange}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="mt-10 p-0 min-w-4xl h-[calc(100vh-100px)] overflow-y-hidden">
        <Form {...form}>
          <DialogHeader className="flex flex-col flex-shrink-0 items-start px-4 py-2 border-b h-[140px]">
            <DialogTitle className="font-semibold text-gray-900 text-base">
              Assign Buyer to Property
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
                <div className="flex flex-col items-center">
                  <Button
                    onClick={() => {
                      // Create complete JSON object for API
                      const apiPayload = {
                        // Property and buyer data - only ownership percentages
                        property_buyer_pairs:
                          selectedBuyers.length > 0
                            ? selectedUnits.flatMap((unit) =>
                                selectedBuyers.map((buyer) => ({
                                  property_node_id: unit.id,
                                  buyer_id: buyer.id,
                                  ownership_percentage:
                                    coOwnershipPercentages[buyer.id] || 100,
                                }))
                              )
                            : [],

                        // Total amounts for backend calculation
                        total_property_price: totalPropertyPrice,
                        total_down_payment:
                          form.watch("paymentPlan") === "full"
                            ? totalPropertyPrice
                            : (totalPropertyPrice *
                                (form.watch("downPayment") || 0)) /
                              100,

                        // Agent and commission data
                        agent_id: selectedAgent || null,
                        agent_commission_type: commissionType as "%" | "fixed",
                        agent_commission_rate:
                          commissionType === "%"
                            ? typeof commission === "number"
                              ? commission
                              : Number(commission) || 0
                            : null,
                        agent_commission_amount:
                          commissionType === "fixed"
                            ? typeof commission === "number"
                              ? commission
                              : Number(commission) || 0
                            : 0, // Always send a value for fixed type

                        // Payment plan data
                        payment_plan_start_date: form.watch("startDate") || "",
                        payment_plan_frequency: (form.watch("frequency") ||
                          "monthly") as
                          | "monthly"
                          | "quarterly"
                          | "semi-annual"
                          | "annual",
                        payment_plan_installment_count:
                          form.watch("installmentCount") || 0,
                        payment_plan_template_id:
                          form.watch("templateId") || null,

                        // Additional metadata
                        total_buyers: selectedBuyers.length,
                        total_units: selectedUnits.length,
                        total_houses: selectedHouses.length,
                        co_ownership_percentages: coOwnershipPercentages,
                        total_percentage: totalPercentage,

                        // Form validation status
                        is_valid:
                          totalPropertyPrice > 0 &&
                          (form.watch("paymentPlan") === "full" ||
                            (form.watch("paymentPlan") === "installments" &&
                              form.watch("installmentCount") > 0 &&
                              form.watch("downPayment") > 0)),
                      };

                      console.log("=== COMPLETE API PAYLOAD ===");
                      console.log(JSON.stringify(apiPayload, null, 2));
                      console.log("=== COMMISSION DEBUG ===");
                      console.log("commissionType:", commissionType);
                      console.log("commission value:", commission);
                      console.log("commission type:", typeof commission);
                      console.log(
                        "agent_commission_amount in payload:",
                        apiPayload.agent_commission_amount
                      );
                      console.log("==========================");

                      // Use the mutation to create the property sale
                      createPropertySaleMutation.mutate(apiPayload);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={
                      totalPropertyPrice === 0 ||
                      (form.watch("paymentPlan") === "installments" &&
                        (!form.watch("installmentCount") ||
                          !form.watch("downPayment") ||
                          Number(form.watch("installmentCount")) === 0 ||
                          Number(form.watch("downPayment")) === 0)) ||
                      createPropertySaleMutation.isPending
                    }
                  >
                    {createPropertySaleMutation.isPending
                      ? "Creating..."
                      : "Complete Assignment"}
                  </Button>
                  {/* Show reason why button is disabled */}
                  {(totalPropertyPrice === 0 ||
                    (form.watch("paymentPlan") === "installments" &&
                      (!form.watch("installmentCount") ||
                        !form.watch("downPayment") ||
                        Number(form.watch("installmentCount")) === 0 ||
                        Number(form.watch("downPayment")) === 0))) && (
                    <div className="mt-1 text-red-500 text-xs">
                      {totalPropertyPrice === 0
                        ? "Property value cannot be zero"
                        : "Please complete payment schedule details"}
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleNext}
                  className="flex items-center space-x-2"
                  disabled={
                    (currentStep === 1 && !selectedProject) ||
                    (currentStep === 2 && selectedBuyers.length === 0) ||
                    (currentStep === 3 &&
                      (!selectedAgent || !commission || commission === "")) ||
                    (currentStep === 4 && totalPercentage !== 100)
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
