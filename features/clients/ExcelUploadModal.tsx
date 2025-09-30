import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, X, Download } from "lucide-react";
import * as XLSX from "xlsx";

import { bulkUploadClients } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientsUpdated: () => void;
}

export default function ExcelUploadModal({
  isOpen,
  onClose,
  onClientsUpdated,
}: ExcelUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const data = await parseExcelFile(file);
      const result = await bulkUploadClients(data);
      return result;
    },
    onSuccess: (response: any) => {
      console.log('🎉 Excel upload success response:', response);
      setIsUploading(false);
      if (response.error) {
        console.log('❌ Upload failed with error:', response.message);
        toast.error(response.message || "Upload failed");
      } else {
        console.log('✅ Upload successful, invalidating queries...');
        
        // Count successful assignments and reactivations
        const assignedCount = response.data?.results?.filter((r: any) => r.success && r.data?.property_assigned).length || 0;
        const reactivatedCount = response.data?.results?.filter((r: any) => r.success && r.data?.was_reactivated).length || 0;
        const totalCount = response.data?.count || 0;
        
        let successMessage = `Successfully uploaded ${totalCount} clients!`;
        if (reactivatedCount > 0) {
          successMessage += ` ${reactivatedCount} previously deleted clients reactivated.`;
        }
        if (assignedCount > 0) {
          successMessage += ` ${assignedCount} tenants assigned to apartments.`;
        }
        
        toast.success(successMessage);
        onClose();
        setSelectedFile(null);
        onClientsUpdated();
        // Invalidate all tenant and owner related queries
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const queryKey = query.queryKey;
            return Array.isArray(queryKey) && 
                   (queryKey[0] === "tenants" || queryKey[0] === "owners");
          }
        });
      }
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error("Failed to upload clients");
    },
  });

  // Handle Excel template download
  const downloadTemplate = () => {
    try {
      // Create Excel workbook with template
      const workbook = XLSX.utils.book_new();

      // Sample data for the template
      const templateData = [
        ["First Name", "Last Name", "EmailID", "MobilePhone", "Gender", "Status", "Client Type", "Project Name", "Assigned House Number"],
        ["John", "Doe", "john.doe@example.com", "0727123456", "M", "Active", "Tenant", "Levent Flats", "1A"],
        ["Jane", "Smith", "jane.smith@example.com", "0727123457", "F", "Active", "Owner", "Levent Flats", "2A"],
        ["Mike", "Johnson", "mike.johnson@example.com", "0727123458", "M", "Active", "Tenant", "Levent Flats", "3A"],
        ["Sarah", "Wilson", "sarah.wilson@example.com", "0727123459", "F", "Active", "Owner", "Levent Flats", "4A"],
      ];

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Clients Template");

      // Generate Excel file and download
      const fileName = "clients-bulk-upload-template.xlsx";
      XLSX.writeFile(workbook, fileName);

      toast.success("Excel template downloaded successfully!");
    } catch (error) {
      toast.error("Failed to create Excel template");
    }
  };

  // Parse Excel/CSV file
  const parseExcelFile = async (
    file: File
  ): Promise<Array<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    gender: string;
    status: string;
    type: string;
    project_name: string;
    house_number: string;
  }>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          let data: Array<{
            first_name: string;
            last_name: string;
            email: string;
            phone: string;
            gender: string;
            status: string;
            type: string;
            project_name: string;
            house_number: string;
          }> = [];

          if (file.name.endsWith('.csv')) {
            // Handle CSV files
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim()); // Remove empty lines
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            
            data = lines
              .slice(1)
              .map((line) => {
                const values = line.split(',').map(v => v.trim());
                return {
                  first_name: values[0] || "",
                  last_name: values[1] || "",
                  email: values[2] || "",
                  phone: values[3] || "",
                  gender: values[4] === "F" ? "Female" : values[4] === "M" ? "Male" : "Male",
                  status: values[5] || "Active",
                  type: values[6] === "Owner" ? "owner" : values[6] === "Tenant" ? "tenant" : "",
                  project_name: values[7] || "",
                  house_number: values[8] || "",
                };
              })
              .filter((item) => item.first_name && item.last_name && item.type);
          } else {
            // Handle Excel files (.xlsx, .xls)
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON with headers
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Skip header row and parse data
            data = jsonData
              .slice(1)
              .map((row: any) => {
                const [first_name, last_name, email, phone, gender, status, client_type, project_name, house_number] = row;
                return {
                  first_name: String(first_name || "").trim(),
                  last_name: String(last_name || "").trim(),
                  email: String(email || "").trim(),
                  phone: String(phone || "").trim(),
                  gender: gender === "F" ? "Female" : gender === "M" ? "Male" : "Male",
                  status: String(status || "Active").trim(),
                  type: client_type === "Owner" ? "owner" : client_type === "Tenant" ? "tenant" : "",
                  project_name: String(project_name || "").trim(),
                  house_number: String(house_number || "").trim(),
                };
              })
              .filter((item) => 
                item.first_name && 
                item.last_name && 
                item.type && 
                (item.type === "tenant" || item.type === "owner")
              );
          }

          if (data.length === 0) {
            reject(new Error("No valid data found in the file"));
            return;
          }

          console.log('📊 Parsed data:', data);
          resolve(data);
        } catch (error) {
          console.error('❌ Parse error:', error);
          reject(new Error("Failed to parse file"));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      // Use appropriate reader method based on file type
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please select an Excel (.xlsx, .xls) or CSV file");
      return;
    }

    setSelectedFile(file);
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle upload
  const handleUpload = () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    console.log('🚀 Starting upload for file:', selectedFile.name);
    setIsUploading(true);
    bulkUploadMutation.mutate(selectedFile);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Upload Clients
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to create multiple tenants and owners at once.
            Download the template below to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h3 className="font-medium text-blue-900">Download Template</h3>
              <p className="text-sm text-blue-700">
                Use this template to format your client data correctly
              </p>
            </div>
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <FileSpreadsheet className="h-8 w-8" />
                  <span className="font-medium">{selectedFile.name}</span>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => setSelectedFile(null)}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drop your Excel file here
                  </p>
                  <p className="text-sm text-gray-500">
                    or click to browse files
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </label>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use the downloaded template as a guide</li>
              <li>• Client Type must be either "Tenant" or "Owner"</li>
              <li>• First Name and Last Name are required</li>
              <li>• EmailID addresses must be unique</li>
              <li>• MobilePhone should be in format: 0727123456</li>
              <li>• Gender should be "M" for Male or "F" for Female</li>
              <li>• Status should be "Active" or "Inactive"</li>
              <li>• <strong>For Tenants:</strong> Project Name and Assigned House Number will automatically assign tenants to apartments</li>
              <li>• <strong>For Owners:</strong> Project Name and Assigned House Number are optional</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="bg-primary hover:bg-primary/90"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Clients
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
