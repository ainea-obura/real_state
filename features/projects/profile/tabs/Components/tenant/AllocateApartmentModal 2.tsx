"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Building2, Home, Users } from 'lucide-react';
import { toast } from 'sonner';

import { getProjectStructure } from '@/actions/projects/structure';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { TenantUserCombobox } from '@/features/property/tenant-assignment/TenantUserCombobox';
import type { StructureNode } from '../schema/projectStructureSchema';
import { PropertyTenantCreateInputSchema } from '../schema/propertyTenantSchema';
import type { PropertyTenantCreateInput } from '../schema/propertyTenantSchema';
import { assignTenantToUnit } from '@/actions/clients/tenantDashboard';

interface AllocateApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onSubmit: (data: PropertyTenantCreateInput) => void;
  isLoading?: boolean;
  projectId: string;
}

const AllocateApartmentModal = ({
  isOpen,
  onClose,
  // onSubmit,
  isLoading = false,
  projectId,
}: AllocateApartmentModalProps) => {
  const [selectedStructureType, setSelectedStructureType] = useState<'BLOCK' | 'HOUSE' | ''>('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PropertyTenantCreateInput>({
    resolver: zodResolver(PropertyTenantCreateInputSchema),
    defaultValues: {
      block: '',
      floor: '',
      apartment: '',
      tenant_user: '',
    },
  });

  // Use React Query to fetch structure data
  const {
    data: structureData = [],
    isLoading: isLoadingStructure,
    error: structureError,
    refetch: refetchStructure,
  } = useQuery({
    queryKey: ['project-structure', projectId],
    queryFn: async () => {
      const response = await getProjectStructure(projectId);
      if (response.error) {
        throw new Error('Failed to fetch structure data');
      }
      return response.data.results;
    },
    enabled: false, // Don't fetch automatically
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSubmit = async (data: PropertyTenantCreateInput) => {
    setSubmitting(true);
    try {
      let payload: any = {
        property_type: selectedStructureType,
        tenant_user: data.tenant_user,
        contract_start: data.contract_start,
        contract_end: data.contract_end,
        rent_amount: data.rent_amount,
        currency: data.currency,
      };
      if (selectedStructureType === 'BLOCK') {
        payload.block = selectedBlock;
        payload.floor = selectedFloor;
        payload.unit = data.apartment;
      } else if (selectedStructureType === 'HOUSE') {
        payload.house = selectedHouse;
        payload.unit = data.apartment;
      }
      const result = await assignTenantToUnit(projectId, payload);
      if (!result.error) {
        toast.success(result.message || 'Tenant assigned successfully');
        onClose();
      } else {
        toast.error(result.message || 'Failed to assign tenant');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign tenant');
    } finally {
      setSubmitting(false);
    }
  };

  // Get blocks (nodes with type BLOCK)
  const blocks = structureData.filter((node: any) => node.node_type === 'BLOCK');

  // Get houses (nodes with type HOUSE)
  const houses = structureData.filter((node: any) => node.node_type === 'HOUSE');

  // Check if any structure type is available
  const hasBlocks = blocks.length > 0;
  const hasHouses = houses.length > 0;
  const hasAnyStructure = hasBlocks || hasHouses;

  // Get floors for selected block
  const getFloorsForBlock = (blockId: string) => {
    const block = structureData.find((node: any) => node.id === blockId);
    return (block as any)?.children?.filter((child: any) => child.node_type === 'FLOOR') || [];
  };

  // Get apartments for selected floor - FIXED: Look within the selected block's children
  const getApartmentsForFloor = (floorId: string) => {
    const selectedBlockNode = structureData.find((node: any) => node.id === selectedBlock);
    if (!selectedBlockNode) return [];
    
    const selectedFloorNode = (selectedBlockNode as any).children?.find((child: any) => child.id === floorId);
    return (selectedFloorNode as any)?.children?.filter((child: any) => child.node_type === 'UNIT') || [];
  };

  // Get apartments for selected house
  const getApartmentsForHouse = (houseId: string) => {
    const house = structureData.find((node: any) => node.id === houseId);
    return (house as any)?.children?.filter((child: any) => child.node_type === 'UNIT') || [];
  };

  const handleStructureTypeChange = (type: 'BLOCK' | 'HOUSE') => {
    setSelectedStructureType(type);
    setSelectedBlock('');
    setSelectedFloor('');
    setSelectedHouse('');
    form.setValue('block', '');
    form.setValue('floor', '');
    form.setValue('apartment', '');
  };

  const handleBlockChange = (blockId: string) => {
    setSelectedBlock(blockId);
    setSelectedFloor('');
    form.setValue('floor', '');
    form.setValue('apartment', '');
  };

  const handleFloorChange = (floorId: string) => {
    setSelectedFloor(floorId);
    form.setValue('apartment', '');
  };

  const handleHouseChange = (houseId: string) => {
    setSelectedHouse(houseId);
    form.setValue('apartment', '');
  };

  // Check if form is complete and valid
  const isFormComplete = () => {
    if (!hasAnyStructure) return false;
    
    if (selectedStructureType === 'BLOCK') {
      return selectedBlock && selectedFloor && form.getValues('apartment') && form.getValues('tenant_user');
    } else if (selectedStructureType === 'HOUSE') {
      return selectedHouse && form.getValues('apartment') && form.getValues('tenant_user');
    }
    
    return false;
  };

  useEffect(() => {
    if (isOpen) {
      refetchStructure();
    }
  }, [isOpen, refetchStructure]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center text-xl font-semibold">
            <Building2 className="w-5 h-5 text-primary" />
            Allocate Apartment
          </DialogTitle>
        </DialogHeader>

        {isLoadingStructure && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 w-8 h-8 rounded-full border-2 animate-spin border-primary border-t-transparent" />
            <p className="text-gray-500">Loading project structure...</p>
          </div>
        )}

        {structureError && !isLoadingStructure && (
          <div className="py-8 text-center">
            <Building2 className="mx-auto mb-4 w-12 h-12 text-red-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">Failed to Load Structure</h3>
            <p className="mb-4 text-gray-500">
              There was an error loading the project structure.
            </p>
            {/* Optionally, you can add a retry button here that just re-triggers the effect */}
          </div>
        )}

        {structureData.length > 0 && hasAnyStructure && !isLoadingStructure && !structureError && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className='grid grid-cols-1 space-y-6 md:grid-cols-2'>
                {/* Structure Type Selection */}
                <FormField
                  control={form.control}
                  name="block"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex gap-2 items-center w-full text-sm font-medium">
                        <Building2 className="w-4 h-4" />
                        Structure Type
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value: 'BLOCK' | 'HOUSE') => {
                            handleStructureTypeChange(value);
                          }}
                          value={selectedStructureType}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Choose structure type" />
                          </SelectTrigger>
                          <SelectContent>
                            {hasBlocks && <SelectItem value="BLOCK">Block</SelectItem>}
                            {hasHouses && <SelectItem value="HOUSE">House</SelectItem>}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Block Selection - Only show when BLOCK is selected */}
                {selectedStructureType === 'BLOCK' && (
                  <FormField
                    control={form.control}
                    name="block"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex gap-2 items-center w-full text-sm font-medium">
                          <Building2 className="w-4 h-4" />
                          Select Block
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              handleBlockChange(value);
                              field.onChange(value);
                            }}
                            value={selectedBlock}
                            disabled={isLoadingStructure}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Choose a block" />
                            </SelectTrigger>
                            <SelectContent>
                              {blocks.map((block: any) => (
                                <SelectItem key={block.id} value={block.id}>
                                  {block.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* House Selection - Only show when HOUSE is selected */}
                {selectedStructureType === 'HOUSE' && (
                  <FormField
                    control={form.control}
                    name="block"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex gap-2 items-center w-full text-sm font-medium">
                          <Building2 className="w-4 h-4" />
                          Select House
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              handleHouseChange(value);
                              field.onChange(value);
                            }}
                            value={selectedHouse}
                            disabled={isLoadingStructure}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Choose a house" />
                            </SelectTrigger>
                            <SelectContent>
                              {houses.map((house: any) => (
                                <SelectItem key={house.id} value={house.id}>
                                  {house.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Floor Selection - Only show when BLOCK is selected and block is chosen */}
                {selectedStructureType === 'BLOCK' && selectedBlock && (
                  <FormField
                    control={form.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex gap-2 items-center text-sm font-medium">
                          <Home className="w-4 h-4" />
                          Select Floor
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              handleFloorChange(value);
                              field.onChange(value);
                            }}
                            value={selectedFloor}
                            disabled={isLoadingStructure}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Choose a floor" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFloorsForBlock(selectedBlock).map((floor: any) => (
                                <SelectItem key={floor.id} value={floor.id}>
                                  {floor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Apartment Selection - Show for both BLOCK and HOUSE */}
                {((selectedStructureType === 'BLOCK' && selectedBlock && selectedFloor) ||
                  (selectedStructureType === 'HOUSE' && selectedHouse)) && (
                  <FormField
                    control={form.control}
                    name="apartment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex gap-2 items-center text-sm font-medium">
                          <Home className="w-4 h-4" />
                          Select Apartment
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingStructure}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Choose an apartment" />
                            </SelectTrigger>
                            <SelectContent>
                              {(selectedStructureType === 'BLOCK' 
                                ? getApartmentsForFloor(selectedFloor)
                                : getApartmentsForHouse(selectedHouse)
                              ).map((apartment: any) => (
                                <SelectItem key={apartment.id} value={apartment.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{apartment.name}</span>
                                    {apartment.apartment_details && (
                                      <span className="text-xs text-muted-foreground">
                                        {apartment.apartment_details.identifier} - {apartment.apartment_details.size}m²
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Tenant Selection with Search */}
                <FormField
                  control={form.control}
                  name="tenant_user"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex gap-2 items-center text-sm font-medium">
                        <Users className="w-4 h-4" />
                        Select Tenant
                      </FormLabel>
                      <FormControl>
                        <TenantUserCombobox
                          value={field.value}
                          onChange={field.onChange}
                          error={fieldState.error?.message}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-6 w-full border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || submitting || !isFormComplete()}
                  className="px-6 bg-primary hover:bg-primary/90"
                >
                  {submitting ? (
                    <div className="flex gap-2 items-center">
                      <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                      Allocating...
                    </div>
                  ) : (
                    'Allocate Apartment'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {structureData.length > 0 && !hasAnyStructure && (
          <div className="py-8 text-center">
            <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">No Structure Available</h3>
            <p className="mb-4 text-gray-500">
              This project doesn't have any blocks or houses configured yet.
            </p>
            <p className="text-sm text-gray-400">
              Please add structure to the project before allocating apartments.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AllocateApartmentModal;
