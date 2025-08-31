import { Building2, Calendar, DollarSign, FileText, Users, X } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface OwnershipTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOwner?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    ownershipPercentage: number;
  };
  property?: {
    id: string;
    project: string;
    block: string;
    unit: string;
    floor: string;
    type: string;
    size: string;
    currentValue: number;
  };
}

interface NewOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  ownershipPercentage: number;
}

export default function OwnershipTransferModal({
  isOpen,
  onClose,
  currentOwner,
  property,
}: OwnershipTransferModalProps) {
  const [transferType, setTransferType] = useState<"full" | "partial">("full");
  const [newOwners, setNewOwners] = useState<NewOwner[]>([]);
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [transferReason, setTransferReason] = useState<string>("");
  const [stampDuty, setStampDuty] = useState<number>(0);
  const [legalFees, setLegalFees] = useState<number>(0);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>("");

  const mockNewOwners = [
    {
      id: "1",
      name: "Ahmed Al Mansouri",
      email: "ahmed@email.com",
      phone: "+971 50 123 4567",
    },
    {
      id: "2",
      name: "Fatima Al Zaabi",
      email: "fatima@email.com",
      phone: "+971 55 987 6543",
    },
    {
      id: "3",
      name: "Omar Al Falasi",
      email: "omar@email.com",
      phone: "+971 52 456 7890",
    },
  ];

  const handleAddNewOwner = () => {
    const owner = mockNewOwners.find((o) => o.id === selectedNewOwner);
    if (owner && !newOwners.find((o) => o.id === owner.id)) {
      setNewOwners([...newOwners, { ...owner, ownershipPercentage: 0 }]);
      setSelectedNewOwner("");
    }
  };

  const handleRemoveNewOwner = (ownerId: string) => {
    setNewOwners(newOwners.filter((o) => o.id !== ownerId));
  };

  const handleOwnershipChange = (ownerId: string, percentage: number) => {
    setNewOwners(
      newOwners.map((o) =>
        o.id === ownerId ? { ...o, ownershipPercentage: percentage } : o
      )
    );
  };

  const totalNewOwnership = newOwners.reduce(
    (sum, o) => sum + o.ownershipPercentage,
    0
  );
  const remainingOwnership = 100 - totalNewOwnership;

  const handleSubmit = () => {
    // Handle form submission
    console.log("Transfer submitted:", {
      transferType,
      newOwners,
      effectiveDate,
      transferReason,
      stampDuty,
      legalFees,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Ownership Transfer</h2>
            <p className="text-sm text-gray-600">
              Transfer property ownership to new parties
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Property Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Property Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Project</Label>
                  <p className="font-medium">
                    {property?.project || "Marina Heights"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Block</Label>
                  <p className="font-medium">{property?.block || "Block A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Unit</Label>
                  <p className="font-medium">{property?.unit || "A101"}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Floor</Label>
                  <p className="font-medium">{property?.floor || "Floor 1"}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Type</Label>
                  <p className="font-medium">{property?.type || "2 Bedroom"}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Current Value</Label>
                  <p className="font-medium text-primary">
                    ${(property?.currentValue || 450000).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Owner */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Current Owner</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">
                    {currentOwner?.name || "John Smith"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentOwner?.email || "john@email.com"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentOwner?.phone || "+971 50 123 4567"}
                  </p>
                </div>
                <Badge variant="secondary">
                  {currentOwner?.ownershipPercentage || 100}% Ownership
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transfer Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="full"
                      name="transferType"
                      value="full"
                      checked={transferType === "full"}
                      onChange={(e) =>
                        setTransferType(e.target.value as "full" | "partial")
                      }
                    />
                    <Label htmlFor="full">Full Transfer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="partial"
                      name="transferType"
                      value="partial"
                      checked={transferType === "partial"}
                      onChange={(e) =>
                        setTransferType(e.target.value as "full" | "partial")
                      }
                    />
                    <Label htmlFor="partial">Partial Transfer</Label>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {transferType === "full"
                    ? "Transfer 100% ownership to new parties"
                    : "Transfer partial ownership while maintaining current owner stake"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* New Owners */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Owner(s)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Owner */}
              <div className="flex space-x-2">
                <Select
                  value={selectedNewOwner}
                  onValueChange={setSelectedNewOwner}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select new owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockNewOwners
                      .filter(
                        (owner) => !newOwners.find((o) => o.id === owner.id)
                      )
                      .map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.name} ({owner.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddNewOwner}
                  disabled={!selectedNewOwner}
                >
                  Add Owner
                </Button>
              </div>

              {/* New Owners List */}
              {newOwners.length > 0 && (
                <div className="space-y-3">
                  {newOwners.map((owner) => (
                    <div
                      key={owner.id}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{owner.name}</p>
                        <p className="text-sm text-gray-600">{owner.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          className="w-20"
                          placeholder="0"
                          value={owner.ownershipPercentage}
                          onChange={(e) =>
                            handleOwnershipChange(
                              owner.id,
                              Number(e.target.value)
                            )
                          }
                        />
                        <span className="text-sm text-gray-600">%</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveNewOwner(owner.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Ownership Summary */}
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="text-sm font-medium">
                      Total New Ownership:
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        totalNewOwnership === 100
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {totalNewOwnership}%
                    </span>
                  </div>
                  {transferType === "partial" && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Remaining with Current Owner:
                      </span>
                      <span className="text-sm font-medium">
                        {remainingOwnership}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transfer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Effective Date</Label>
                  <Input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Transfer Reason</Label>
                  <Select
                    value={transferReason}
                    onValueChange={setTransferReason}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="gift">Gift</SelectItem>
                      <SelectItem value="inheritance">Inheritance</SelectItem>
                      <SelectItem value="business">
                        Business Transfer
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Any additional information about the transfer..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fees & Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Fees & Costs</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stamp Duty</Label>
                  <Input
                    type="number"
                    value={stampDuty}
                    onChange={(e) => setStampDuty(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Legal Fees</Label>
                  <Input
                    type="number"
                    value={legalFees}
                    onChange={(e) => setLegalFees(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Total Transfer Cost:</strong> $
                  {(stampDuty + legalFees).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={newOwners.length === 0 || totalNewOwnership !== 100}
            className="bg-primary hover:bg-primary/90"
          >
            Complete Transfer
          </Button>
        </div>
      </div>
    </div>
  );
}
