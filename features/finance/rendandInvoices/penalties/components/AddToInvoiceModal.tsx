"use client";

import { FileText, Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// Use the ModalPenalty interface from parent component
interface ModalPenalty {
  id: string;
  penaltyNumber: string;
  tenant: {
    name: string;
    email: string;
    phone: string;
  };
  property: {
    unit: string;
    projectName: string;
  };
  penaltyType:
    | "late_payment"
    | "returned_payment"
    | "lease_violation"
    | "utility_overcharge"
    | "other";
  amount: number;
  amountType: "fixed" | "percentage";
  percentageOf?: number;
  dateApplied: string;
  dueDate: string;
  status: "pending" | "applied_to_invoice" | "waived" | "paid";
  linkedInvoice?: {
    id: string;
    invoiceNumber: string;
  };
  notes?: string;
  tenantNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  waivedAt?: string;
  waivedBy?: string;
  waivedReason?: string;
}

interface AddToInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  penalty: ModalPenalty;
}

const AddToInvoiceModal = ({
  open,
  onClose,
  penalty,
}: AddToInvoiceModalProps) => {
  const [action, setAction] = useState<"existing" | "new">("existing");
  const [selectedInvoice, setSelectedInvoice] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const invoices = [
    {
      id: "inv-1",
      invoiceNumber: "INV-2024-008",
      tenant: penalty.tenant.name,
      amount: 1200,
      dueDate: "2024-08-01",
      status: "pending",
    },
    {
      id: "inv-2",
      invoiceNumber: "INV-2024-009",
      tenant: penalty.tenant.name,
      amount: 1200,
      dueDate: "2024-09-01",
      status: "pending",
    },
    {
      id: "inv-3",
      invoiceNumber: "INV-2024-010",
      tenant: penalty.tenant.name,
      amount: 1200,
      dueDate: "2024-10-01",
      status: "draft",
    },
  ];

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (action === "existing" && selectedInvoice) {
        // Add to existing invoice
        const invoice = invoices.find((inv) => inv.id === selectedInvoice);
        console.log("Adding penalty to existing invoice:", {
          penalty: penalty.penaltyNumber,
          invoice: invoice?.invoiceNumber,
        });
      } else if (action === "new") {
        // Create new invoice with penalty
        console.log("Creating new invoice with penalty:", {
          penalty: penalty.penaltyNumber,
          tenant: penalty.tenant.name,
        });
      }

      // In real implementation, this would make an API call

      onClose();
      setAction("existing");
      setSelectedInvoice("");
      setSearchQuery("");
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "late_payment":
        return "Late Payment Fee";
      case "returned_payment":
        return "Returned Payment Fee";
      case "lease_violation":
        return "Lease Violation Fee";
      case "utility_overcharge":
        return "Utility Overcharge";
      default:
        return "Other";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Add Penalty to Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Penalty Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="mb-3 font-semibold text-gray-900">
              Penalty Details
            </h3>
            <div className="gap-4 grid grid-cols-2 text-sm">
              <div>
                <span className="text-gray-600">Penalty Number:</span>
                <p className="font-medium">{penalty.penaltyNumber}</p>
              </div>
              <div>
                <span className="text-gray-600">Type:</span>
                <p className="font-medium">
                  {getTypeLabel(penalty.penaltyType)}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Amount:</span>
                <p className="font-medium">
                  {penalty.amountType === "percentage"
                    ? `${penalty.amount}%`
                    : penalty.amount}
                  {penalty.amountType === "percentage" &&
                    penalty.percentageOf && (
                      <span className="text-gray-500">
                        {" "}
                        of {penalty.percentageOf}
                      </span>
                    )}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Tenant:</span>
                <p className="font-medium">{penalty.tenant.name}</p>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Choose Action</h3>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="existing"
                  checked={action === "existing"}
                  onCheckedChange={() => setAction("existing")}
                />
                <Label htmlFor="existing" className="text-sm">
                  Add to existing invoice
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new"
                  checked={action === "new"}
                  onCheckedChange={() => setAction("new")}
                />
                <Label htmlFor="new" className="text-sm">
                  Create new invoice with this penalty
                </Label>
              </div>
            </div>
          </div>

          {/* Existing Invoice Selection */}
          {action === "existing" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Select Invoice</h3>

              <div className="space-y-3">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search invoices by number..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    className="bg-white border-gray-200"
                  />
                  {showSearchResults && (
                    <div className="z-10 absolute bg-white shadow-lg mt-1 border border-gray-200 rounded-lg w-full max-h-60 overflow-y-auto">
                      {invoices
                        .filter((invoice) =>
                          invoice.invoiceNumber
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        )
                        .map((invoice) => (
                          <div
                            key={invoice.id}
                            className="hover:bg-gray-50 p-3 border-gray-100 border-b last:border-b-0 cursor-pointer"
                            onClick={() => {
                              setSelectedInvoice(invoice.id);
                              setSearchQuery(invoice.invoiceNumber);
                              setShowSearchResults(false);
                            }}
                          >
                            <div className="font-medium text-gray-900">
                              {invoice.invoiceNumber}
                            </div>
                            <div className="text-gray-500 text-sm">
                              Due:{" "}
                              {new Date(invoice.dueDate).toLocaleDateString()}
                            </div>
                            <div className="text-gray-500 text-sm">
                              Amount: {invoice.amount}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {selectedInvoice && (
                  <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-blue-900">
                          {
                            invoices.find((inv) => inv.id === selectedInvoice)
                              ?.invoiceNumber
                          }
                        </div>
                        <div className="text-blue-700 text-sm">
                          Due:{" "}
                          {new Date(
                            invoices.find((inv) => inv.id === selectedInvoice)
                              ?.dueDate || ""
                          ).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice("");
                          setSearchQuery("");
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Invoice Options */}
          {action === "new" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">
                New Invoice Options
              </h3>

              <div className="bg-green-50 p-4 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-900">
                    New Invoice Details
                  </span>
                </div>
                <div className="space-y-1 text-green-800 text-sm">
                  <p>• Invoice will be created for {penalty.tenant.name}</p>
                  <p>
                    • Due date will be set to{" "}
                    {new Date(
                      Date.now() + 30 * 24 * 60 * 60 * 1000
                    ).toLocaleDateString()}
                  </p>
                  <p>• Penalty will be added as a line item</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isLoading || (action === "existing" && !selectedInvoice)
              }
            >
              {isLoading ? "Processing..." : "Add to Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToInvoiceModal;
