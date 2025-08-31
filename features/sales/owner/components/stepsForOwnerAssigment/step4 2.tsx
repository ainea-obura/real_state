import { Building2, Home, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

interface Project {
  id: string;
  name: string;
  type: "residential" | "commercial" | "mixed";
  location: string;
  hasBlocks: boolean;
  hasHouses: boolean;
}

interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
}

interface PurchasePlanStepProps {
  totalPropertyPrice: number;
  selectedUnits: Unit[];
  selectedHouses: House[];
  selectedProject: Project | null;
  selectedBuyers: Buyer[];
  coOwnershipPercentages: Record<string, number>;
  totalPercentage: number;
  setValue: (field: string, value: unknown) => void;
  handleCoOwnershipChange: (buyerId: string, percentage: number) => void;
  getBuyerAmount: (buyerId: string) => number;
}

const PurchasePlanStep = ({
  totalPropertyPrice,
  selectedUnits,
  selectedHouses,
  selectedProject,
  selectedBuyers,
  coOwnershipPercentages,
  totalPercentage,
  setValue,
  handleCoOwnershipChange,
  getBuyerAmount,
}: PurchasePlanStepProps) => {
  return (
    <div className="space-y-4">
      {/* Property Summary - Compact Design */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="p-4">
          <div className="flex justify-center items-center space-x-2 mb-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900 text-base">
              Property Summary
            </h4>
          </div>

          <div className="flex flex-col justify-start items-center gap-2 space-x-6">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-blue-900 text-sm">
                {selectedProject?.name || "Not selected"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-blue-900 text-sm capitalize">
                {selectedProject?.type || "N/A"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-bold text-blue-900 text-lg">
                KES {totalPropertyPrice.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Selected Properties - Compact List */}
          {(selectedUnits.length > 0 || selectedHouses.length > 0) && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="gap-2 grid grid-cols-2">
                {selectedUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className="flex items-center space-x-2 text-xs"
                  >
                    <Building2 className="w-3 h-3 text-blue-600" />
                    <span className="text-blue-800 truncate">{unit.name}</span>
                    <span className="font-medium text-blue-600">
                      KES {unit.price.toLocaleString()}
                    </span>
                  </div>
                ))}
                {selectedHouses.map((house) => (
                  <div
                    key={house.id}
                    className="flex items-center space-x-2 text-xs"
                  >
                    <Home className="w-3 h-3 text-blue-600" />
                    <span className="text-blue-800 truncate">{house.name}</span>
                    <span className="font-medium text-blue-600">
                      KES {house.price.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Co-ownership Section - 2-Column Layout */}
      {selectedBuyers.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-8 text-center">
          <div className="flex justify-center items-center bg-gray-100 mb-4 rounded-full w-16 h-16">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="mb-2 font-medium text-gray-900 text-lg">
            No Buyers Selected
          </h3>
          <p className="max-w-sm text-gray-500">
            Please go back to step 2 and select at least one buyer to continue
            with co-ownership setup.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-green-600" />
              <Label className="font-semibold text-base">
                Co-ownership Split
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <span
                className={`text-sm font-medium px-2 py-1 rounded-full ${
                  totalPercentage === 100
                    ? "bg-green-100 text-green-700"
                    : totalPercentage > 100
                    ? "bg-red-100 text-red-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {totalPercentage}%
              </span>
              {totalPercentage !== 100 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedBuyers.length === 1) {
                      setValue("coOwnershipPercentages", {
                        [selectedBuyers[0].id]: 100,
                      });
                    } else if (selectedBuyers.length > 1) {
                      const equalPercentage = Math.floor(
                        100 / selectedBuyers.length
                      );
                      const remainder = 100 % selectedBuyers.length;
                      const percentages: Record<string, number> = {};
                      selectedBuyers.forEach((buyer, index) => {
                        percentages[buyer.id] =
                          equalPercentage + (index < remainder ? 1 : 0);
                      });
                      setValue("coOwnershipPercentages", percentages);
                    }
                  }}
                  className="px-2 h-7 text-xs"
                >
                  Auto 100%
                </Button>
              )}
            </div>
          </div>

          {/* 2-Column Co-ownership Grid */}
          <div className="gap-3 grid grid-cols-2">
            {selectedBuyers.map((buyer) => (
              <Card
                key={buyer.id}
                className="bg-green-50 p-3 border border-green-200"
              >
                <div className="space-y-3">
                  {/* Buyer Info */}
                  <div className="flex items-center space-x-2">
                    <div className="flex justify-center items-center bg-green-100 rounded-full w-8 h-8">
                      {buyer.photo ? (
                        <img
                          src={buyer.photo}
                          alt={buyer.name}
                          className="rounded-full w-8 h-8 object-cover"
                        />
                      ) : (
                        <span className="font-medium text-green-700 text-sm">
                          {buyer.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {buyer.name}
                      </h4>
                      <p className="text-gray-600 text-xs truncate">
                        {buyer.email}
                      </p>
                    </div>
                  </div>

                  {/* Ownership Details */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">Ownership %</span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {coOwnershipPercentages[buyer.id] || 0}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">
                        Share Amount
                      </span>
                      <span className="font-semibold text-green-600 text-sm">
                        KES {getBuyerAmount(buyer.id).toLocaleString()}
                      </span>
                    </div>

                    {selectedBuyers.length > 1 && (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={coOwnershipPercentages[buyer.id] || 0}
                        onChange={(e) =>
                          handleCoOwnershipChange(
                            buyer.id,
                            Number(e.target.value)
                          )
                        }
                        className="h-8 text-sm text-center"
                        placeholder="%"
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Validation Message - Compact */}
          {totalPercentage !== 100 && (
            <div
              className={`p-2 rounded-lg text-xs ${
                totalPercentage > 100
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-orange-50 text-orange-700 border border-orange-200"
              }`}
            >
              {totalPercentage > 100
                ? `⚠️ Exceeds 100% by ${totalPercentage - 100}%`
                : `⚠️ Need ${100 - totalPercentage}% more to complete`}
              {selectedBuyers.length === 1 && (
                <span className="block opacity-75 mt-1 text-xs">
                  Single owner automatically gets 100%
                </span>
              )}
              {selectedBuyers.length > 1 && (
                <span className="block opacity-75 mt-1 text-xs">
                  Multiple owners: distribute percentages manually or use
                  &quot;Auto 100%&quot; button
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PurchasePlanStep;
