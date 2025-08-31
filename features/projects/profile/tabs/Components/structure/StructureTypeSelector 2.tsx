import { FloorPlanIcon, ParkingAreaCircleIcon } from 'hugeicons-react';
import { BedDouble, Building2, Home, Underline } from 'lucide-react';

import { cn } from '@/lib/utils';

export type StructureType = "block" | "house" | "basement";

interface StructureTypeSelectorProps {
  selectedType: StructureType | null;
  onSelect: (type: StructureType) => void;
}

const structureTypes = [
  {
    type: "block" as const,
    label: "Block",
    description: "Add a new block to your property",
    icon: Building2,
    gradient: "from-blue-500/10 via-blue-500/5 to-blue-600/10",
    hoverGradient:
      "hover:from-blue-500/20 hover:via-blue-500/15 hover:to-blue-600/20",
    iconColor: "text-blue-600",
    borderColor: "group-hover:border-blue-500/50",
  },
  {
    type: "house" as const,
    label: "House",
    description: "Create a new house",
    icon: FloorPlanIcon,
    gradient: "from-purple-500/10 via-purple-500/5 to-purple-600/10",
    hoverGradient:
      "hover:from-purple-500/20 hover:via-purple-500/15 hover:to-purple-600/20",
    iconColor: "text-purple-600",
    borderColor: "group-hover:border-purple-500/50",
  },
  {
    type: "basement" as const,
    label: "Parking",
    description: "Add a new parking structure",
    icon: ParkingAreaCircleIcon,
    gradient: "from-emerald-500/10 via-emerald-500/5 to-emerald-600/10",
    hoverGradient:
      "hover:from-emerald-500/20 hover:via-emerald-500/15 hover:to-emerald-600/20",
    iconColor: "text-emerald-600",
    borderColor: "group-hover:border-emerald-500/50",
  },
];

const StructureTypeSelector = ({
  selectedType,
  onSelect,
}: StructureTypeSelectorProps) => {
  return (
    <div className="gap-4 grid grid-cols-2 p-1">
      {structureTypes.map(
        ({
          type,
          label,
          description,
          icon: Icon,
          gradient,
          hoverGradient,
          iconColor,
          borderColor,
        }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={cn(
              "group flex flex-col items-start p-6 rounded-xl transition-all duration-300",
              "bg-gradient-to-br border border-transparent",
              gradient,
              hoverGradient,
              borderColor,
              selectedType === type && "ring-2 ring-primary ring-offset-2",
              "hover:scale-[1.02]"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl mb-4 flex items-center justify-center",
                "bg-white/90 backdrop-blur-sm shadow-sm",
                "transition-transform duration-300 group-hover:scale-110"
              )}
            >
              <Icon className={cn("w-6 h-6", iconColor)} />
            </div>

            <div className="text-left">
              <h3 className="mb-1.5 font-semibold text-gray-900">{label}</h3>
              <p className="text-gray-600 text-sm leading-snug">
                {description}
              </p>
            </div>

            {selectedType === type && (
              <div className="-bottom-0.5 left-1/2 absolute bg-primary rounded-full w-1 h-1 -translate-x-1/2" />
            )}
          </button>
        )
      )}
    </div>
  );
};

export default StructureTypeSelector;
