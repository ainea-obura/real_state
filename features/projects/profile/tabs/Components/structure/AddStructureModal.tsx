import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
    createBasementStructure, createBlockStructure, createHouseStructure,
} from '@/actions/projects/structure';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
    BlockFormData, FloorFormData, ParentStructure, RoomFormData, UnitFormData,
} from '../schema/AddStructureSchema';
import { HouseArrayFormData } from '../schema/HouseArraySchema';
import { StructureNode } from '../schema/projectStructureSchema';
import { BasementForm, BlockForm, HouseForm } from './StructureForms';
import StructureTypeSelector, { StructureType } from './StructureTypeSelector';

interface AddStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  existingStructures: ParentStructure[];
  onStructureUpdated: (newTree: StructureNode[]) => void;
  preselectType?: "block" | "house" | null;
}

type FormData = BlockFormData | FloorFormData | UnitFormData | RoomFormData;

const AddStructureModal = ({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  existingStructures,
  onStructureUpdated,
  preselectType,
}: AddStructureModalProps) => {
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedType, setSelectedType] = useState<StructureType | null>(null);

  useEffect(() => {
    if (
      isOpen &&
      preselectType &&
      (step !== "form" || selectedType !== preselectType)
    ) {
      setSelectedType(preselectType);
      setStep("form");
    }
  }, [isOpen, preselectType]);

  const queryClient = useQueryClient();

  const handleTypeSelect = (type: StructureType) => {
    setSelectedType(type);
    setStep("form");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedType(null);
  };

  const blockMutation = useMutation({
    mutationFn: async (data: BlockFormData) => {
      const response = await createBlockStructure(data, propertyId);
      if (response.error) {
        throw new Error("Failed to create block structure");
      }
      return response.data;
    },
    onSuccess: (response) => {
      toast.success("Block structure created successfully");
      let results: StructureNode[] = [];
      if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        response !== null &&
        "data" in response &&
        response.data &&
        typeof response.data === "object" &&
        "results" in response.data
      ) {
        results = response.data.results as StructureNode[];
      }
      onStructureUpdated(results);
      setStep("select");
      setSelectedType(null);
      onClose();
    },
    onError: () => {
      toast.error("Failed to create block structure");
    },
  });

  const houseMutation = useMutation({
    mutationFn: async (data: HouseArrayFormData) => {
      const response = await createHouseStructure(data, propertyId);
      if (response.error) {
        throw new Error("Failed to create house structure");
      }
      return response.data;
    },
    onSuccess: (response) => {
      toast.success("Block structure created successfully");
      let results: StructureNode[] = [];
      if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        response !== null &&
        "data" in response &&
        response.data &&
        typeof response.data === "object" &&
        "results" in response.data
      ) {
        results = response.data.results as StructureNode[];
      }
      onStructureUpdated(results);
      setStep("select");
      setSelectedType(null);
      onClose();
    },
    onError: () => {
      toast.error("Failed to create block structure");
    },
  });

  const basementMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await createBasementStructure(data, propertyId);
      if (response.error) {
        throw new Error("Failed to create parking structure");
      }
      return response.data;
    },
    onSuccess: (response) => {
      toast.success("Parking structure created successfully");
      let results: StructureNode[] = [];
      if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        response !== null &&
        "data" in response &&
        response.data &&
        typeof response.data === "object" &&
        "results" in response.data
      ) {
        results = response.data.results as StructureNode[];
      }
      onStructureUpdated(results);
      setStep("select");
      setSelectedType(null);
      onClose();
    },
    onError: () => {
      toast.error("Failed to create parking structure");
    },
  });

  const handleSubmit = async (data: FormData) => {
    if (selectedType === "block" && "blocks" in data) {
      blockMutation.mutate(data.blocks as BlockFormData);
      return;
    }
    if (selectedType === "house" && "houses" in data) {
      houseMutation.mutate(data.houses as HouseArrayFormData);
      return;
    }
    if (selectedType === "basement" && "basements" in data) {
      basementMutation.mutate(data.basements);
      return;
    }
  };

  const renderForm = () => {
    const commonProps = {
      propertyId,
      propertyName,
      parentStructures: existingStructures,
    };

    switch (selectedType) {
      case "block":
        return (
          <BlockForm
            onSubmit={handleSubmit as (data: any) => void}
            propertyId={propertyId}
            propertyName={propertyName}
            parentStructures={existingStructures}
          />
        );
      case "house":
        return (
          <HouseForm
            onSubmit={handleSubmit as (data: any) => void}
            {...commonProps}
          />
        );
      case "basement":
        return (
          <BasementForm
            onSubmit={handleSubmit as (data: any) => void}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  const getFormTitle = () => {
    switch (selectedType) {
      case "block":
        return "Add New Block";
      case "house":
        return "Add New House";
      case "basement":
        return "Add New Parking Structure";
      default:
        return "Add Structure";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="mt-10 sm:max-w-[600px]">
        <DialogHeader className="grid grid-cols-12">
          {step === "form" && (
            <Button
              size="icon"
              onClick={handleBack}
              aria-label="Back"
              tabIndex={0}
              role="button"
              className=""
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="space-y-2 col-span-9">
            <DialogTitle className={step === "form" ? "" : ""}>
              {step === "select" ? "Add Structure" : getFormTitle()}
            </DialogTitle>
            <DialogDescription>
              {step === "select"
                ? "Choose the type of structure you want to add to your property."
                : "Fill in the details for the new structure."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="py-4">
          {step === "select" ? (
            <StructureTypeSelector
              selectedType={selectedType}
              onSelect={handleTypeSelect}
            />
          ) : (
            renderForm()
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-end gap-2">
          {step === "select" && (
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStructureModal;
