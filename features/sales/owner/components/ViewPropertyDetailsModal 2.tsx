import {
    Building2, Calendar, DollarSign, FileText, Mail, MapPin, Phone, User, X,
} from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface ViewPropertyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerProperty: any;
}

const ViewPropertyDetailsModal: React.FC<ViewPropertyDetailsModalProps> = ({
  isOpen,
  onClose,
  ownerProperty,
}) => {
  if (!isOpen) return null;

  const mockPropertyDetails = {
    project: {
      name: ownerProperty?.projectName,
      location: "Westlands, Nairobi",
      developer: "Real Estate Developers Ltd",
      completionDate: "Q4 2025",
      totalUnits: 156,
      amenities: ["Swimming Pool", "Gym", "Security", "Parking", "Garden"],
    },
    property: {
      type: "Apartment",
      size: "120 sqm",
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      floor: ownerProperty?.propertyName?.split("/")[1]?.trim() || "N/A",
      unitNumber: ownerProperty?.propertyName?.split("/")[0]?.trim() || "N/A",
      view: "City View",
      orientation: "North-East",
    },
    financial: {
      totalPrice: ownerProperty?.installmentPlan?.totalAmount,
      downPayment: 1500000,
      monthlyPayment: ownerProperty?.installmentPlan?.nextDueAmount,
      maintenanceFee: 15000,
      insurance: 25000,
      taxes: 45000,
    },
    documents: [
      { name: "Purchase Agreement", status: "Signed", date: "15 Aug 2024" },
      { name: "Title Deed", status: "Pending", date: "Q1 2025" },
      { name: "Building Approval", status: "Approved", date: "10 Jun 2024" },
      { name: "Environmental Impact", status: "Approved", date: "5 May 2024" },
    ],
  };

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-xl">
                Property Details
              </h2>
              <p className="text-gray-600 text-sm">
                {ownerProperty?.propertyName} - {ownerProperty?.projectName}
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
          {/* Property Overview */}
          <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
            {/* Project Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 mb-3 font-semibold text-gray-900">
                <Building2 className="w-4 h-4 text-blue-600" />
                Project Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">
                    {mockPropertyDetails.project.location}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">
                    {mockPropertyDetails.project.developer}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">
                    Completion: {mockPropertyDetails.project.completionDate}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">
                    Total Units: {mockPropertyDetails.project.totalUnits}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <h4 className="mb-2 font-medium text-gray-700">Amenities</h4>
                <div className="flex flex-wrap gap-1">
                  {mockPropertyDetails.project.amenities.map((amenity) => (
                    <Badge key={amenity} variant="outline" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Property Specs */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="mb-3 font-semibold text-gray-900">
                Property Specifications
              </h3>
              <div className="gap-3 grid grid-cols-2 text-sm">
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-medium text-gray-700">
                    {mockPropertyDetails.property.type}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Size:</span>
                  <span className="ml-2 font-medium text-gray-700">
                    {mockPropertyDetails.property.size}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Bedrooms:</span>
                  <span className="ml-2 font-medium text-gray-700">
                    {mockPropertyDetails.property.bedrooms}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Bathrooms:</span>
                  <span className="ml-2 font-medium text-gray-700">
                    {mockPropertyDetails.property.bathrooms}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Parking:</span>
                  <span className="ml-2 font-medium text-gray-700">
                    {mockPropertyDetails.property.parking}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Floor:</span>
                  <span className="ml-2 font-medium text-gray-700">
                    {mockPropertyDetails.property.floor}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Unit:</span>
                  <span className="ml-2 font-medium text-gray-700">
                    {mockPropertyDetails.property.unitNumber}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">View:</span>
                  <span className="ml-2 font-medium text-gray-700">
                    {mockPropertyDetails.property.view}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 mb-3 font-semibold text-gray-900">
                <DollarSign className="w-4 h-4 text-green-600" />
                Financial Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Price:</span>
                  <span className="font-medium text-gray-700">
                    KES{" "}
                    {mockPropertyDetails.financial.totalPrice?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Down Payment:</span>
                  <span className="font-medium text-gray-700">
                    KES{" "}
                    {mockPropertyDetails.financial.downPayment?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Payment:</span>
                  <span className="font-medium text-gray-700">
                    KES{" "}
                    {mockPropertyDetails.financial.monthlyPayment?.toLocaleString()}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Maintenance Fee:</span>
                  <span className="font-medium text-gray-700">
                    KES{" "}
                    {mockPropertyDetails.financial.maintenanceFee?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Insurance:</span>
                  <span className="font-medium text-gray-700">
                    KES{" "}
                    {mockPropertyDetails.financial.insurance?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxes:</span>
                  <span className="font-medium text-gray-700">
                    KES {mockPropertyDetails.financial.taxes?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="flex items-center gap-2 mb-3 font-semibold text-gray-900">
              <FileText className="w-4 h-4 text-purple-600" />
              Documents & Approvals
            </h3>
            <div className="gap-3 grid grid-cols-1 md:grid-cols-2">
              {mockPropertyDetails.documents.map((doc) => (
                <div
                  key={doc.name}
                  className="flex justify-between items-center bg-white p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.name}</p>
                      <p className="text-gray-500 text-sm">{doc.date}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      doc.status === "Signed" || doc.status === "Approved"
                        ? "default"
                        : "secondary"
                    }
                    className={
                      doc.status === "Signed" || doc.status === "Approved"
                        ? "bg-green-100 text-green-800"
                        : ""
                    }
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Owner Contact */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="mb-3 font-semibold text-gray-900">
              Owner Contact Information
            </h3>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    {ownerProperty?.ownerName}
                  </p>
                  <p className="text-gray-600 text-sm">Property Owner</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    {ownerProperty?.ownerPhone}
                  </p>
                  <p className="text-gray-600 text-sm">Phone Number</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    {ownerProperty?.ownerEmail}
                  </p>
                  <p className="text-gray-600 text-sm">Email Address</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    {ownerProperty?.assignedSalesPerson}
                  </p>
                  <p className="text-gray-600 text-sm">Assigned Sales Person</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 bg-gray-50 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Download Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewPropertyDetailsModal;
