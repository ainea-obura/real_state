"use client";

import { AddCircleHalfDotIcon } from "hugeicons-react";
import {
  BedDouble,
  Building2,
  Calendar,
  Clock,
  Home,
  HomeIcon,
  Hotel,
  MapPin,
  Pencil,
  Search,
  SortAsc,
  SortDesc,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { createProperty } from "@/actions/projects";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { ProjectDetail, PropertyDetail } from "@/schema/projects/schema";

import { AddPropertyModal } from "./AddPropertyModal";

interface PropertyListProps {
  projectData: ProjectDetail;
  onPropertySelect?: (property: ProjectDetail["properties"][0]) => void;
}

const PROPERTY_TYPES = [
  { value: "all", label: "All Properties", icon: Building2 },
  { value: "villa", label: "Villa", icon: Home },
  { value: "apartment", label: "Apartment", icon: Hotel },
  { value: "house", label: "House", icon: HomeIcon },
  { value: "commercial", label: "Commercial", icon: Store },
] as const;

const PROPERTY_STATUS = [
  { value: "all", label: "All Status", color: "bg-gray-500" },
  { value: "available", label: "Available", color: "bg-green-500" },
  { value: "rented", label: "Rented", color: "bg-blue-500" },
  { value: "sold", label: "Sold", color: "bg-red-500" },
] as const;

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A-Z)", icon: SortAsc },
  { value: "name-desc", label: "Name (Z-A)", icon: SortDesc },
  { value: "units-asc", label: "Units (Low to High)", icon: SortAsc },
  { value: "units-desc", label: "Units (High to Low)", icon: SortDesc },
  { value: "floors-asc", label: "Floors (Low to High)", icon: SortAsc },
  { value: "floors-desc", label: "Floors (High to Low)", icon: SortDesc },
] as const;

const PropertyCard = ({
  property,
  created_at,
  projectAddress,
  onClick,
  onEdit,
  onDelete,
}: {
  property: ProjectDetail["properties"][0];
  created_at: string;
  projectAddress: string;
  onClick?: () => void;
  onEdit?: (property: ProjectDetail["properties"][0]) => void;
  onDelete?: (property: ProjectDetail["properties"][0]) => void;
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const formattedSize = property.size ? `${property.size} m²` : "N/A";
  const price = 1500; // This should come from your property data

  return (
    <>
      <Card
        className="group relative bg-white hover:shadow-lg overflow-hidden transition-all duration-300 ease-in-out cursor-pointer"
        onClick={onClick}
      >
        {/* Edit and Delete Buttons - Show on Hover */}
        <div className="top-4 left-4 z-10 absolute flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(property);
            }}
          >
            <Pencil className="mr-1 w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="mr-1 w-4 h-4" />
            Delete
          </Button>
        </div>

        <Link href={`/property/${property.id}`}>
          <div className="relative w-full aspect-[4/3] overflow-hidden">
            <Image
              src="/images/placeholder.jpg"
              alt={property.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

            {/* Price Tag */}
            <div className="bottom-4 left-4 absolute bg-black/70 px-3 py-1.5 rounded-full">
              <span className="font-semibold text-white">
                {formatCurrency(price)}
              </span>
            </div>
          </div>

          <div className="space-y-4 p-4">
            {/* Property Info */}
            <div>
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-semibold group-hover:text-primary text-lg line-clamp-1 transition-colors">
                  {property.name}
                </h3>
                <Badge variant="outline" className="capitalize shrink-0">
                  {property.property_type}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-gray-500 text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="line-clamp-1">{projectAddress}</span>
              </div>
            </div>

            {/* Property Stats */}
            <div className="gap-2 grid grid-cols-3">
              <div className="flex items-center gap-3 p-2 border-r">
                <div className="flex justify-center items-center bg-primary/10 rounded-md w-10 h-10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="text-start">
                  <p className="font-semibold text-lg">
                    {property.total_units || 0}
                  </p>
                  <p className="text-gray-500 text-sm">Units</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 border-r">
                <div className="flex justify-center items-center bg-primary/10 rounded-md w-10 h-10">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div className="text-start">
                  <p className="font-semibold text-lg">
                    {property.total_floors || 0}
                  </p>
                  <p className="text-gray-500 text-sm">Floors</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2">
                <div className="flex justify-center items-center bg-primary/10 rounded-md w-10 h-10">
                  <BedDouble className="w-5 h-5 text-primary" />
                </div>
                <div className="text-start">
                  <p className="font-semibold text-lg">
                    {property.total_rooms || 0}
                  </p>
                  <p className="text-gray-500 text-xs">Rooms</p>
                </div>
              </div>
            </div>
            <Separator />

            {/* Additional Details */}
            <div className="gap-3 grid grid-cols-2 text-sm">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="text-gray-500">Size:</span>
                <span className="font-medium">{formattedSize}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-gray-500">Year:</span>
                <span className="font-medium">2024</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-gray-500">Listed:</span>
                <span className="font-medium">{created_at}</span>
              </div>
            </div>
          </div>
        </Link>
        {/* Property Image */}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the property "{property.name}". This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                onDelete?.(property);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const PropertyList = ({ projectData, onPropertySelect }: PropertyListProps) => {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyType, setPropertyType] =
    useState<(typeof PROPERTY_TYPES)[number]["value"]>("all");
  const [status, setStatus] =
    useState<(typeof PROPERTY_STATUS)[number]["value"]>("all");
  const [sortBy, setSortBy] =
    useState<(typeof SORT_OPTIONS)[number]["value"]>("name-asc");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<
    ProjectDetail["properties"][0] | null
  >(null);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleAddPropertySuccess = async (data: PropertyDetail) => {
    try {
      await createProperty({
        ...data,
        project_node_id: projectData.node_id as string,
      });
      toast.success("Property created successfully");
      setIsAddModalOpen(false);
      setEditingProperty(null);
      // Refresh the project data or update the local state
    } catch (error) {
      
      toast.error("Failed to create property");
    }
  };

  const handleEditProperty = async (data: PropertyDetail) => {
    try {
      // Implement the updateProperty action
      // await updateProperty(data);
      toast.success("Property updated successfully");
      setIsAddModalOpen(false);
      setEditingProperty(null);
      // Refresh the project data or update the local state
    } catch (error) {
      
      toast.error("Failed to update property");
    }
  };

  const handleDeleteProperty = async (
    property: ProjectDetail["properties"][0]
  ) => {
    try {
      // Implement the deleteProperty action
      // await deleteProperty(property.id);
      toast.success("Property deleted successfully");
      // Refresh the project data or update the local state
    } catch (error) {
      
      toast.error("Failed to delete property");
    }
  };

  const filteredProperties = useMemo(() => {
    return projectData.properties
      .filter((property) => {
        const matchesSearch =
          property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          projectData.address.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType =
          propertyType === "all" || property.property_type === propertyType;
        // Remove status filtering for now since it's not in the schema
        const matchesStatus = true;

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name-asc":
            return a.name.localeCompare(b.name);
          case "name-desc":
            return b.name.localeCompare(a.name);
          case "units-asc":
            return (a.total_units || 0) - (b.total_units || 0);
          case "units-desc":
            return (b.total_units || 0) - (a.total_units || 0);
          case "floors-asc":
            return (a.total_floors || 0) - (b.total_floors || 0);
          case "floors-desc":
            return (b.total_floors || 0) - (a.total_floors || 0);
          default:
            return 0;
        }
      });
  }, [
    projectData.properties,
    projectData.address,
    searchQuery,
    propertyType,
    sortBy,
  ]);

  return (
    <div className="flex flex-col h-full">
      {/* Filters - Fixed at top */}
      <div className="flex-none">
        <div className="flex lg:flex-row flex-col justify-between gap-4 bg-primary-foreground p-3 sm:p-4 border rounded-md">
          <form onSubmit={handleSearch} className="flex-1 w-full max-w-[500px]">
            <div className="flex sm:flex-row flex-col gap-3">
              <div className="relative flex-1">
                <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-500 -translate-y-1/2" />
                <Input
                  placeholder="Search properties..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                className="!bg-primary sm:w-auto !h-11 text-white cursor-pointer"
              >
                Search
              </Button>
            </div>
          </form>

          <div className="flex sm:flex-row flex-col lg:items-center gap-3">
            <Select
              value={propertyType}
              onValueChange={(value) =>
                setPropertyType(
                  value as (typeof PROPERTY_TYPES)[number]["value"]
                )
              }
            >
              <SelectTrigger className="w-full sm:min-w-[180px] !h-11 cursor-pointer">
                <div className="flex items-center gap-2">
                  <SelectValue placeholder="Property Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    className="capitalize"
                  >
                    <div className="flex items-center gap-2">
                      <type.icon className="w-4 h-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as (typeof PROPERTY_STATUS)[number]["value"])
              }
            >
              <SelectTrigger className="w-full sm:min-w-[160px] !h-11 cursor-pointer">
                <div className="flex items-center gap-2">
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_STATUS.map((s) => (
                  <SelectItem
                    key={s.value}
                    value={s.value}
                    className="capitalize"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.color}`} />
                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) =>
                setSortBy(value as (typeof SORT_OPTIONS)[number]["value"])
              }
            >
              <SelectTrigger className="w-full sm:min-w-[200px] !h-11 cursor-pointer">
                <div className="flex items-center gap-2">
                  <SelectValue placeholder="Sort By" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="w-4 h-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="sm:w-auto !h-11 cursor-pointer"
            >
              <AddCircleHalfDotIcon className="mr-2 w-4 h-4" />
              Add Property
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 font-medium text-primary text-lg capitalize">
          Found {filteredProperties.length} properties
        </div>
      </div>

      {/* Property List - Scrollable */}
      <div className="flex-1 mt-6 min-h-0 overflow-y-auto">
        <div className="gap-4 sm:gap-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 pb-6">
          {filteredProperties.map((property, index) => {
            return (
              <PropertyCard
                key={`${property.name}-${property.property_type}-${index}`}
                property={property}
                created_at={projectData.created_at}
                projectAddress={projectData.address}
                onClick={() => onPropertySelect?.(property)}
                onEdit={(property) => {
                  setEditingProperty(property);
                  setIsAddModalOpen(true);
                }}
                onDelete={handleDeleteProperty}
              />
            );
          })}
        </div>

        {filteredProperties.length === 0 && (
          <div className="flex flex-col justify-center items-center py-16 text-gray-500">
            <Building2 className="mb-4 w-12 h-12 text-gray-400" />
            <p className="font-medium text-lg">No properties found</p>
            <p className="mt-1 text-sm">Try adjusting your search filters</p>
          </div>
        )}
      </div>

      {/* Add/Edit Property Modal */}
      <AddPropertyModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProperty(null);
        }}
        onSubmit={handleAddPropertySuccess}
        onEdit={handleEditProperty}
        editData={editingProperty}
      />
    </div>
  );
};

export default PropertyList;
