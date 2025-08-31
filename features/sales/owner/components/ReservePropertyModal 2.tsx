import { Calendar, User } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  getProjectStructure,
  searchOwners,
  searchProjects,
} from "@/actions/sales/loadProjects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createPropertyReservation } from "../../../../actions/sales/propertyReservation";
import SelectPropertyStep from "./stepsForOwnerAssigment/step1";
import SelectBuyerStep from "./stepsForOwnerAssigment/step2";

interface ReservePropertyModalProps {
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
  status: string;
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

const ReservePropertyModal = ({
  isOpen,
  onClose,
}: ReservePropertyModalProps) => {
  const [formData, setFormData] = useState({
    endDate: "",
    depositFee: "",
    notes: "",
  });

  // Project and property selection states (same as step1)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<Block[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<Unit[]>([]);
  const [selectedHouses, setSelectedHouses] = useState<House[]>([]);
  const [projectSearch, setProjectSearch] = useState("");

  // Owner selection states (step 2)
  const [selectedBuyers, setSelectedBuyers] = useState<Buyer[]>([]);
  const [ownerSearch, setOwnerSearch] = useState("");

  // Get query client for invalidating queries
  const queryClient = useQueryClient();

  // Transform API project data to local Project interface
  const transformApiProjectToProject = (apiProject: {
    id: string;
    name: string;
    property_type?: string | null;
    project_detail?: { address?: string | null } | null;
    has_blocks?: boolean;
    has_houses?: boolean;
  }): Project => {
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
      hasBlocks: apiProject.has_blocks || false,
      hasHouses: apiProject.has_houses || false,
    };
  };

  // Transform API owner data to local Buyer interface
  const transformApiOwnerToBuyer = (apiOwner: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    avatar?: string | null;
  }): Buyer => {
    return {
      id: apiOwner.id,
      name: apiOwner.full_name,
      email: apiOwner.email,
      phone: apiOwner.phone,
      photo: apiOwner.avatar || undefined,
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
    retry: false, // Don't retry failed requests
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount
  });

  // Use useMutation for creating property reservations
  const createReservationMutation = useMutation({
    mutationFn: createPropertyReservation,
    onSuccess: (data: { success: boolean; message?: string }) => {
      if (data.success) {
        const propertyCount = selectedUnits.length + selectedHouses.length;
        const ownerCount = selectedBuyers.length;

        toast.success(
          `Successfully reserved ${propertyCount} propert${
            propertyCount > 1 ? "ies" : "y"
          } for ${ownerCount} owner${ownerCount > 1 ? "s" : ""}!`
        );

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["property-reservations"] });
        queryClient.invalidateQueries({ queryKey: ["owner-properties"] });

        // Close modal and reset form
        onClose();
        resetForm();
      } else {
        toast.error(data.message || "Failed to create reservation");
      }
    },
    onError: (error: Error) => {
      console.error("Error creating reservation:", error);
      toast.error("Failed to create reservation. Please try again.");
    },
  });

  // Get filtered projects from API response
  const filteredProjects: Project[] = useMemo(() => {
    if (!projectsData || projectsData.error) return [];
    return projectsData.data.results.map(transformApiProjectToProject);
  }, [projectsData]);

  // Transform API structure data to local interfaces
  const projectBlocks: Block[] = useMemo(() => {
    if (!projectStructureData || projectStructureData.error) return [];

    return projectStructureData.data.blocks.map(
      (apiBlock: {
        id: string;
        name: string;
        floors: Array<{
          id: string;
          name: string;
          units: Array<{
            id: string;
            name: string;
            unit_detail?: {
              unit_type?: string | null;
              size?: string | null;
              sale_price?: number | null;
              status?: string | null;
            } | null;
          }>;
        }>;
      }) => ({
        id: apiBlock.id,
        name: apiBlock.name,
        projectId: selectedProject!.id,
        floors: apiBlock.floors
          .filter((apiFloor) => apiFloor.units && apiFloor.units.length > 0) // Only show floors with units
          .map((apiFloor) => ({
            id: apiFloor.id,
            name: apiFloor.name,
            blockId: apiBlock.id,
            units: apiFloor.units.map((apiUnit) => ({
              id: apiUnit.id,
              name: apiUnit.name,
              floorId: apiFloor.id,
              type: apiUnit.unit_detail?.unit_type || "Standard",
              size: apiUnit.unit_detail?.size || "Standard",
              price: apiUnit.unit_detail?.sale_price || 0,
              status: apiUnit.unit_detail?.status || "available",
            })),
          })),
      })
    );
  }, [projectStructureData, selectedProject]);

  const projectHouses: House[] = useMemo(() => {
    if (!projectStructureData || projectStructureData.error) return [];

    return projectStructureData.data.houses.map(
      (apiHouse: {
        id: string;
        name: string;
        house_detail?: {
          name?: string | null;
        } | null;
      }) => ({
        id: apiHouse.id,
        name: apiHouse.name,
        projectId: selectedProject!.id,
        type: apiHouse.house_detail?.name || "House",
        size: "Standard",
        price: 0, // API doesn't provide house price
        status: "available",
      })
    );
  }, [projectStructureData, selectedProject]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handler for step1 component setValue calls
  const handleSetValue = (field: string, value: unknown) => {
    if (field === "project") setSelectedProject(value as Project | null);
    else if (field === "blocks") setSelectedBlocks(value as Block[]);
    else if (field === "units") setSelectedUnits(value as Unit[]);
    else if (field === "houses") setSelectedHouses(value as House[]);
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setSelectedBlocks([]);
    setSelectedUnits([]);
    setSelectedHouses([]);
    // Clear owner selection when project changes
    setSelectedBuyers([]);
    setOwnerSearch("");
  };

  const handleBuyerSelect = (buyer: Buyer) => {
    // Check if buyer is already selected to prevent duplicates
    if (selectedBuyers.find((b) => b.id === buyer.id)) {
      // Remove buyer if already selected
      setSelectedBuyers(selectedBuyers.filter((b) => b.id !== buyer.id));
    } else {
      // Add buyer if not already selected
      setSelectedBuyers([...selectedBuyers, buyer]);
    }
  };

  // Function to reset form and selections
  const resetForm = () => {
    setFormData({
      endDate: "",
      depositFee: "",
      notes: "",
    });
    setSelectedProject(null);
    setSelectedBlocks([]);
    setSelectedUnits([]);
    setSelectedHouses([]);
    setProjectSearch("");
    setSelectedBuyers([]);
    setOwnerSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get all selected property IDs
    const selectedPropertyIds: string[] = [];

    // Add units
    selectedUnits.forEach((unit) => {
      selectedPropertyIds.push(unit.id);
    });

    // Add houses
    selectedHouses.forEach((house) => {
      selectedPropertyIds.push(house.id);
    });

    if (selectedPropertyIds.length === 0) {
      toast.error("Please select at least one property to reserve");
      return;
    }

    if (selectedBuyers.length === 0) {
      toast.error("Please select at least one owner for the reservation");
      return;
    }

    // Create the backend data structure matching the API parameters
    const reservationData = {
      property_ids: selectedPropertyIds,
      owner_id: selectedBuyers[0]?.id, // Use first selected owner
      end_date: formData.endDate,
      deposit_fee: formData.depositFee
        ? parseFloat(formData.depositFee)
        : undefined,
      notes: formData.notes || undefined,
    };

    // Console log the backend data
    console.log("=== BACKEND DATA TO BE SENT ===");
    console.log("Property IDs:", reservationData.property_ids);
    console.log("Owner ID:", reservationData.owner_id);
    console.log("End Date:", reservationData.end_date);
    console.log("Deposit Fee:", reservationData.deposit_fee);
    console.log("Notes:", reservationData.notes);
    console.log("================================");

    // Use the mutation to create the reservation
    createReservationMutation.mutate(reservationData);
  };

  // Get total selected properties count
  const totalSelectedProperties = selectedUnits.length + selectedHouses.length;

  // Check if we should show the owner selection step
  const shouldShowOwnerSelection = totalSelectedProperties > 0;

  // Get loading state from mutation
  const isLoading = createReservationMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="mt-10 min-w-[800px] h-[calc(100vh-150px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Reserve Property
          </DialogTitle>
          <DialogDescription>
            Reserve propert{totalSelectedProperties > 1 ? "ies" : "y"} for a
            specific period with reservation details and fees.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Project & Property Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-medium text-gray-700 text-sm">
              <Calendar className="w-4 h-4" />
              Step 1: Project & Property Selection
            </div>

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
              setValue={handleSetValue}
              setProjectSearch={setProjectSearch}
              handleProjectSelect={handleProjectSelect}
            />

            {/* Selected Properties Summary */}
            {totalSelectedProperties > 0 && (
              <div className="bg-green-50 p-3 border border-green-200 rounded-md">
                <div className="flex justify-between items-center">
                  <div className="text-green-700 text-sm">
                    <span className="font-medium">
                      Selected Properties ({totalSelectedProperties}):
                    </span>
                    {selectedUnits.length > 0 && (
                      <div className="mt-1">
                        <span className="font-medium">Units:</span>{" "}
                        {selectedUnits.map((u) => u.name).join(", ")}
                      </div>
                    )}
                    {selectedHouses.length > 0 && (
                      <div className="mt-1">
                        <span className="font-medium">Houses:</span>{" "}
                        {selectedHouses.map((h) => h.name).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Owner Selection - Only show after properties are selected */}
          {shouldShowOwnerSelection && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                <User className="w-4 h-4" />
                Step 2: Owner Selection
              </div>

              <SelectBuyerStep
                ownerSearch={ownerSearch}
                selectedBuyers={selectedBuyers}
                mockBuyers={
                  ownersData?.data?.results?.map(transformApiOwnerToBuyer) || []
                }
                isLoadingOwners={isLoadingOwners}
                setValue={(field: string, value: unknown) => {
                  if (field === "buyers") setSelectedBuyers(value as Buyer[]);
                }}
                setOwnerSearch={setOwnerSearch}
                handleBuyerSelect={handleBuyerSelect}
              />

              {/* Selected Owners Summary */}
              {selectedBuyers.length > 0 && (
                <div className="bg-blue-50 p-3 border border-blue-200 rounded-md">
                  <div className="text-blue-700 text-sm">
                    <span className="font-medium">
                      Selected Owners ({selectedBuyers.length}):
                    </span>{" "}
                    {selectedBuyers.map((b) => b.name).join(", ")}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Reservation Details - Only show after owners are selected */}
          {shouldShowOwnerSelection && selectedBuyers.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 font-medium text-gray-700 text-sm">
                <Calendar className="w-4 h-4" />
                Step 3: Reservation Details
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange("endDate", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="depositFee">Deposit Fee (Optional)</Label>
                <Input
                  id="depositFee"
                  type="number"
                  placeholder="0.00"
                  value={formData.depositFee}
                  onChange={(e) =>
                    handleInputChange("depositFee", e.target.value)
                  }
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter any additional notes or special requirements..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                totalSelectedProperties === 0 ||
                selectedBuyers.length === 0 ||
                !formData.endDate
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />
                  Reserving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Reserve{" "}
                  {totalSelectedProperties > 1 ? "Properties" : "Property"}
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReservePropertyModal;
