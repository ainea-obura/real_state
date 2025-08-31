"use client";

import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Percent,
  Settings,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface PenaltySettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const PenaltySettingsModal = ({ open, onClose }: PenaltySettingsModalProps) => {
  const [settings, setSettings] = useState({
    // Late Payment Settings
    autoApplyLateFee: true,
    lateFeeGracePeriod: 5,
    lateFeeAmount: 50,
    lateFeeType: "fixed" as "fixed" | "percentage",
    lateFeePercentage: 5,
    lateFeePercentageOf: "outstanding_rent" as
      | "outstanding_rent"
      | "monthly_rent",

    // Returned Payment Settings
    autoApplyReturnedFee: true,
    returnedFeeAmount: 25,

    // Lease Violation Settings
    autoApplyViolationFee: false,
    violationFeeAmount: 100,

    // Utility Overcharge Settings
    autoApplyUtilityFee: false,
    utilityFeeAmount: 75,

    // General Settings
    maxPenaltiesPerMonth: 3,
    recurringPenalties: false,
    recurringInterval: "weekly" as "weekly" | "biweekly" | "monthly",
    notifyTenantOnPenalty: true,
    notifyViaEmail: true,
    notifyViaSMS: false,

    // Default Notes
    defaultLateFeeNotes: "Late payment fee applied for overdue rent",
    defaultReturnedFeeNotes: "Returned payment fee for bounced check",
    defaultViolationFeeNotes: "Lease violation fee for policy violation",
    defaultUtilityFeeNotes: "Utility overcharge fee for excessive usage",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (
    field: string,
    value: string | boolean | number
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      
      // In real implementation, this would make an API call

      onClose();
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-4xl max-h-[calc(100vh-150px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <Settings className="w-5 h-5" />
            Penalty Settings & Automation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Late Payment Settings */}
          <div className="p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100">
            <div className="flex gap-3 items-center mb-4">
              <div className="flex justify-center items-center w-8 h-8 bg-red-100 rounded-lg">
                <Calendar className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Late Payment Fees
                </h3>
                <p className="text-sm text-gray-600">
                  Configure automatic late payment fee application
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoApplyLateFee"
                  checked={settings.autoApplyLateFee}
                  onCheckedChange={(checked) =>
                    handleInputChange("autoApplyLateFee", checked as boolean)
                  }
                />
                <Label htmlFor="autoApplyLateFee" className="text-sm">
                  Automatically apply late payment fees
                </Label>
              </div>

              {settings.autoApplyLateFee && (
                <div className="ml-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Grace Period (Days)
                      </Label>
                      <Input
                        type="number"
                        value={settings.lateFeeGracePeriod}
                        onChange={(e) =>
                          handleInputChange(
                            "lateFeeGracePeriod",
                            parseInt(e.target.value) || 0
                          )
                        }
                        min="0"
                        className="bg-white border-gray-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Fee Type
                      </Label>
                      <Select
                        value={settings.lateFeeType}
                        onValueChange={(value) =>
                          handleInputChange("lateFeeType", value)
                        }
                      >
                        <SelectTrigger className="bg-white border-gray-200 w-full !h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">
                            <div className="flex gap-2 items-center">
                              <DollarSign className="w-4 h-4" />
                              Fixed Amount
                            </div>
                          </SelectItem>
                          <SelectItem value="percentage">
                            <div className="flex gap-2 items-center">
                              <Percent className="w-4 h-4" />
                              Percentage
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        {settings.lateFeeType === "percentage"
                          ? "Percentage"
                          : "Amount"}
                      </Label>
                      <Input
                        type="number"
                        value={
                          settings.lateFeeType === "percentage"
                            ? settings.lateFeePercentage
                            : settings.lateFeeAmount
                        }
                        onChange={(e) =>
                          handleInputChange(
                            settings.lateFeeType === "percentage"
                              ? "lateFeePercentage"
                              : "lateFeeAmount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        step={
                          settings.lateFeeType === "percentage" ? "0.1" : "0.01"
                        }
                        min="0"
                        className="bg-white border-gray-200"
                      />
                    </div>
                  </div>

                  {settings.lateFeeType === "percentage" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Percentage Of
                      </Label>
                      <Select
                        value={settings.lateFeePercentageOf}
                        onValueChange={(value) =>
                          handleInputChange("lateFeePercentageOf", value)
                        }
                      >
                        <SelectTrigger className="bg-white border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="outstanding_rent">
                            Outstanding Rent Balance
                          </SelectItem>
                          <SelectItem value="monthly_rent">
                            Monthly Rent Amount
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Default Notes
                    </Label>
                    <Textarea
                      value={settings.defaultLateFeeNotes}
                      onChange={(e) =>
                        handleInputChange("defaultLateFeeNotes", e.target.value)
                      }
                      className="bg-white border-gray-200"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Other Fee Settings */}
          <div className="space-y-6">
            {/* Returned Payment Fees */}
            <div className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-100">
              <div className="flex gap-3 items-center mb-4">
                <div className="flex justify-center items-center w-8 h-8 bg-orange-100 rounded-lg">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Returned Payment Fees
                  </h3>
                  <p className="text-sm text-gray-600">
                    Configure fees for bounced checks and failed payments
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoApplyReturnedFee"
                    checked={settings.autoApplyReturnedFee}
                    onCheckedChange={(checked) =>
                      handleInputChange(
                        "autoApplyReturnedFee",
                        checked as boolean
                      )
                    }
                  />
                  <Label htmlFor="autoApplyReturnedFee" className="text-sm">
                    Automatically apply returned payment fees
                  </Label>
                </div>

                {settings.autoApplyReturnedFee && (
                  <div className="ml-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Fee Amount
                        </Label>
                        <Input
                          type="number"
                          value={settings.returnedFeeAmount}
                          onChange={(e) =>
                            handleInputChange(
                              "returnedFeeAmount",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          step="0.01"
                          min="0"
                          className="bg-white border-gray-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Default Notes
                      </Label>
                      <Textarea
                        value={settings.defaultReturnedFeeNotes}
                        onChange={(e) =>
                          handleInputChange(
                            "defaultReturnedFeeNotes",
                            e.target.value
                          )
                        }
                        className="bg-white border-gray-200"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lease Violation Fees */}
            <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <div className="flex gap-3 items-center mb-4">
                <div className="flex justify-center items-center w-8 h-8 bg-purple-100 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Lease Violation Fees
                  </h3>
                  <p className="text-sm text-gray-600">
                    Configure fees for lease violations
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoApplyViolationFee"
                    checked={settings.autoApplyViolationFee}
                    onCheckedChange={(checked) =>
                      handleInputChange(
                        "autoApplyViolationFee",
                        checked as boolean
                      )
                    }
                  />
                  <Label htmlFor="autoApplyViolationFee" className="text-sm">
                    Automatically apply lease violation fees
                  </Label>
                </div>

                {settings.autoApplyViolationFee && (
                  <div className="ml-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Fee Amount
                        </Label>
                        <Input
                          type="number"
                          value={settings.violationFeeAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              handleInputChange("violationFeeAmount", 0);
                            } else {
                              const parsed = parseFloat(value);
                              if (!isNaN(parsed) && parsed >= 0) {
                                handleInputChange("violationFeeAmount", parsed);
                              }
                            }
                          }}
                          step="0.01"
                          min="0"
                          className="bg-white border-gray-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Default Notes
                      </Label>
                      <Textarea
                        value={settings.defaultViolationFeeNotes}
                        onChange={(e) =>
                          handleInputChange(
                            "defaultViolationFeeNotes",
                            e.target.value
                          )
                        }
                        className="bg-white border-gray-200"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* General Settings */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex gap-3 items-center mb-4">
              <div className="flex justify-center items-center w-8 h-8 bg-blue-100 rounded-lg">
                <Settings className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  General Settings
                </h3>
                <p className="text-sm text-gray-600">
                  Configure general penalty behavior and notifications
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Max Penalties Per Month
                  </Label>
                  <Input
                    type="number"
                    value={settings.maxPenaltiesPerMonth}
                    onChange={(e) =>
                      handleInputChange(
                        "maxPenaltiesPerMonth",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min="1"
                    className="bg-white border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Recurring Penalties
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recurringPenalties"
                      checked={settings.recurringPenalties}
                      onCheckedChange={(checked) =>
                        handleInputChange(
                          "recurringPenalties",
                          checked as boolean
                        )
                      }
                    />
                    <Label htmlFor="recurringPenalties" className="text-sm">
                      Apply recurring penalties until paid
                    </Label>
                  </div>
                </div>
              </div>

              {settings.recurringPenalties && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Recurring Interval
                  </Label>
                  <Select
                    value={settings.recurringInterval}
                    onValueChange={(value) =>
                      handleInputChange("recurringInterval", value)
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-200 w-full !h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Notification Settings */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">
                  Notification Settings
                </h4>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifyTenantOnPenalty"
                    checked={settings.notifyTenantOnPenalty}
                    onCheckedChange={(checked) =>
                      handleInputChange(
                        "notifyTenantOnPenalty",
                        checked as boolean
                      )
                    }
                  />
                  <Label htmlFor="notifyTenantOnPenalty" className="text-sm">
                    Notify tenant when penalty is applied
                  </Label>
                </div>

                {settings.notifyTenantOnPenalty && (
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notifyViaEmail"
                        checked={settings.notifyViaEmail}
                        onCheckedChange={(checked) =>
                          handleInputChange(
                            "notifyViaEmail",
                            checked as boolean
                          )
                        }
                      />
                      <Label htmlFor="notifyViaEmail" className="text-sm">
                        Send email notification
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notifyViaSMS"
                        checked={settings.notifyViaSMS}
                        onCheckedChange={(checked) =>
                          handleInputChange("notifyViaSMS", checked as boolean)
                        }
                      />
                      <Label htmlFor="notifyViaSMS" className="text-sm">
                        Send SMS notification
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PenaltySettingsModal;
