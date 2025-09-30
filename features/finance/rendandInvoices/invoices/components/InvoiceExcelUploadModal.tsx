"use client";

import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { bulkUploadInvoices, BulkInvoiceUploadData } from '@/actions/finance/invoice';

interface InvoiceExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoicesUpdated?: () => void;
}

const InvoiceExcelUploadModal: React.FC<InvoiceExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onInvoicesUpdated,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<BulkInvoiceUploadData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: bulkUploadInvoices,
    onSuccess: (response) => {
      console.log('🎉 Invoice upload success response:', response);
      setIsUploading(false);
      if (response.error) {
        console.log('❌ Upload failed with error:', response.message);
        toast.error(response.message || "Upload failed");
      } else {
        console.log('✅ Upload successful, invalidating queries...');
        
        // Count successful uploads
        const totalCount = response.data?.count || 0;
        
        let successMessage = `Successfully uploaded ${totalCount} invoices!`;
        
        toast.success(successMessage);
        onClose();
        setSelectedFile(null);
        setParsedData([]);
        onInvoicesUpdated?.();
        // Invalidate invoice queries to refresh the list
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const queryKey = query.queryKey;
            return Array.isArray(queryKey) && queryKey[0] === "invoices";
          }
        });
      }
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error("Failed to upload invoices");
    },
  });

  const downloadTemplate = () => {
    try {
      // Create Excel workbook with template
      const workbook = XLSX.utils.book_new();

      // Sample data for the template matching your Excel format
      const templateData = [
        ["Client Type", "Client Phone", "Invoice Date", "Due Date", "Invoice ID", "Invoice Number", "Customer Name", "Total", "Balance", "Paid Date", "Invoice Type", "Notes", "Client ID or Phone", "House No.", "Project ID", "Invoice Subject"],
        ["Tenant", "", "2025-05-31", "2025-05-31", "2025-05-31 6695963000000932", "KPM02001", "Nur Gure", "9000", "0", "2025-08-02", "Service charge", "May 2025 service charge", "Olerai Apartments", "A1KPM02", "", "May 2025 service charge"],
        ["Tenant", "", "2025-06-30", "2025-06-30", "2025-06-30 6695963000000933", "KPM02009", "Rosemary Gitonga", "9000", "0", "2025-07-31", "Service charge", "May 2025 service charge", "Olerai Apartments", "A2KPM02", "", "May 2025 service charge"],
        ["Vendor", "", "2025-05-31", "2025-05-31", "2025-05-31 6695963000000934", "KPM02017", "Mohamed Dirir", "75000", "75000", "0", "Plumbing works", "Service charge 2025", "239 Owashika Residency", "1KPM01", "", "Overhaul of water distribution system at 239 Owashika Residency"],
      ];

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices Template");

      // Generate Excel file and download
      const fileName = "invoices-bulk-upload-template.xlsx";

      XLSX.writeFile(workbook, fileName);

      toast.success("Excel template downloaded successfully!");
    } catch (error) {
      toast.error("Failed to create Excel template");
    }
  };

  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        let data: BulkInvoiceUploadData[] = [];
        
        if (file.name.endsWith('.csv')) {
          // Handle CSV files
          const text = e.target?.result as string;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              const row: any = {};
              headers.forEach((header, index) => {
                row[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || '';
              });
              return row;
            })
            .filter((item) => 
              item.client_type && 
              item.customer_name && 
              item.invoice_date && 
              item.due_date &&
              item.invoice_type &&
              item.total_amount
            );
        } else {
          // Handle Excel files (.xlsx, .xls)
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON with headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Skip header row and parse data - handle your Excel format
          data = jsonData
            .slice(1)
            .map((row: any) => {
              // Map your Excel columns to expected format
              const [
                client_type, client_phone, invoice_date, due_date, invoice_id, 
                invoice_number, customer_name, total, balance, paid_date, 
                invoice_type, notes, client_id_or_phone, house_no, project_id, invoice_subject
              ] = row;
              
              return {
                client_type: String(client_type || "").trim(),
                customer_name: String(customer_name || "").trim(),
                invoice_date: String(invoice_date || "").trim(),
                due_date: String(due_date || "").trim(),
                invoice_type: String(invoice_type || "").trim(),
                total_amount: parseFloat(total) || 0, // Map "Total" to "total_amount"
                balance: balance ? parseFloat(balance) : undefined,
                paid_date: paid_date ? String(paid_date).trim() : undefined,
                notes: notes ? String(notes).trim() : undefined,
                house_no: house_no ? String(house_no).trim() : undefined,
                project_id: project_id ? String(project_id).trim() : undefined,
                invoice_subject: invoice_subject ? String(invoice_subject).trim() : undefined,
                // Additional fields from your format
                client_phone: client_phone ? String(client_phone).trim() : undefined,
                invoice_id: invoice_id ? String(invoice_id).trim() : undefined,
                invoice_number: invoice_number ? String(invoice_number).trim() : undefined,
                client_id_or_phone: client_id_or_phone ? String(client_id_or_phone).trim() : undefined,
              };
            })
            .filter((item) => 
              item.client_type && 
              item.customer_name && 
              item.invoice_date && 
              item.due_date &&
              item.invoice_type &&
              item.total_amount > 0
            );
        }

        setParsedData(data);
        console.log('📊 Parsed data:', data);
        toast.success(`Parsed ${data.length} invoice records from Excel file`);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error("Failed to parse Excel file. Please check the format.");
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      parseExcelFile(file);
    }
  };

  const handleUpload = () => {
    if (parsedData.length === 0) {
      toast.error("No data to upload");
      return;
    }

    setIsUploading(true);
    uploadMutation.mutate(parsedData);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParsedData([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Upload Invoices
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Step 1: Download Template</h4>
            <p className="text-sm text-blue-700 mb-3">
              Download the Excel template to see the required format and column headers.
            </p>
            <Button onClick={downloadTemplate} variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Step 2: Upload Excel File</h4>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {selectedFile ? selectedFile.name : "Choose Excel file"}
                </p>
                <p className="text-sm text-gray-500">
                  Supports .xlsx, .xls, and .csv files
                </p>
              </label>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    {selectedFile.name} ({parsedData.length} records)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setParsedData([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use the downloaded template as a guide</li>
              <li>• Client Type must be "Owner", "Tenant", or "Vendor"</li>
              <li>• Customer Name must match existing users in the system</li>
              <li>• Invoice Date and Due Date must be in YYYY-MM-DD format</li>
              <li>• Total Amount must be a valid number</li>
              <li>• Balance is optional (defaults to Total Amount)</li>
              <li>• Paid Date is optional (if provided, invoice will be marked as PAID)</li>
              <li>• House No. and Project ID are optional but help with property assignment</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={parsedData.length === 0 || isUploading}
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
                  Upload {parsedData.length} Invoices
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceExcelUploadModal;
