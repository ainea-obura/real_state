import { Building2, Calendar, Mail, Send, User, X } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface SendReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerProperty: any;
}

const SendReminderModal: React.FC<SendReminderModalProps> = ({
  isOpen,
  onClose,
  ownerProperty,
}) => {
  const [reminderType, setReminderType] = useState("payment");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendMethod, setSendMethod] = useState("email");

  if (!isOpen) return null;

  const reminderTemplates = {
    payment: {
      subject: "Payment Reminder - {propertyName}",
      message: `Dear {ownerName},

This is a friendly reminder that your next payment of KES {nextAmount} for {propertyName} is due on {dueDate}.

Payment Details:
- Property: {propertyName}
- Next Due: {dueDate}
- Amount: KES {nextAmount}
- Installment: {completed}/{total}

Please ensure timely payment to avoid any late fees. If you have any questions, please contact your sales representative.

Best regards,
{companyName}`,
    },
    contract: {
      subject: "Contract Update Required - {propertyName}",
      message: `Dear {ownerName},

We need to update your contract for {propertyName}. Please review and sign the updated documents.

Contract Details:
- Property: {propertyName}
- Status: Pending Update
- Action Required: Document Review & Signature

Please contact us to complete this process.

Best regards,
{companyName}`,
    },
    general: {
      subject: "Important Update - {propertyName}",
      message: `Dear {ownerName},

We have an important update regarding your property {propertyName}.

Please contact us for more details.

Best regards,
{companyName}`,
    },
  };

  const handleTemplateSelect = (type: string) => {
    setReminderType(type);
    const template = reminderTemplates[type as keyof typeof reminderTemplates];
    setSubject(
      template.subject.replace(
        "{propertyName}",
        ownerProperty?.propertyName || ""
      )
    );
    setMessage(
      template.message
        .replace("{ownerName}", ownerProperty?.ownerName || "")
        .replace(/{propertyName}/g, ownerProperty?.propertyName || "")
        .replace(
          "{nextAmount}",
          ownerProperty?.installmentPlan?.nextDueAmount?.toLocaleString() || ""
        )
        .replace("{dueDate}", ownerProperty?.installmentPlan?.nextDueDate || "")
        .replace(
          "{completed}",
          ownerProperty?.installmentPlan?.completedInstallments || ""
        )
        .replace(
          "{total}",
          ownerProperty?.installmentPlan?.totalInstallments || ""
        )
        .replace(/{companyName}/g, "Real Estate Co.")
    );
  };

  const handleSend = () => {
    // Handle sending reminder
    console.log("Sending reminder:", {
      reminderType,
      subject,
      message,
      sendMethod,
    });
    onClose();
  };

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center bg-gradient-to-r from-orange-50 to-red-50 p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Mail className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-xl">
                Send Reminder
              </h2>
              <p className="text-gray-600 text-sm">
                {ownerProperty?.ownerName} - {ownerProperty?.propertyName}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Property Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="gap-4 grid grid-cols-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700 text-sm">
                  {ownerProperty?.ownerName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-600" />
                <span className="font-medium text-gray-700 text-sm">
                  {ownerProperty?.propertyName}
                </span>
              </div>
            </div>
          </div>

          {/* Reminder Type */}
          <div className="space-y-3">
            <Label className="font-medium text-gray-700 text-sm">
              Reminder Type
            </Label>
            <div className="gap-3 grid grid-cols-3">
              {[
                { key: "payment", label: "Payment", icon: Calendar },
                { key: "contract", label: "Contract", icon: Building2 },
                { key: "general", label: "General", icon: Mail },
              ].map((type) => (
                <Button
                  key={type.key}
                  variant={reminderType === type.key ? "default" : "outline"}
                  className="flex flex-col items-center gap-2 py-3 h-auto"
                  onClick={() => handleTemplateSelect(type.key)}
                >
                  <type.icon className="w-4 h-4" />
                  <span className="text-xs">{type.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Send Method */}
          <div className="space-y-3">
            <Label className="font-medium text-gray-700 text-sm">
              Send Method
            </Label>
            <Select value={sendMethod} onValueChange={setSendMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-3">
            <Label className="font-medium text-gray-700 text-sm">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject..."
            />
          </div>

          {/* Message */}
          <div className="space-y-3">
            <Label className="font-medium text-gray-700 text-sm">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message..."
              rows={8}
              className="resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 bg-gray-50 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
            onClick={handleSend}
          >
            <Send className="w-4 h-4" />
            Send Reminder
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SendReminderModal;
