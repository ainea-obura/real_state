import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import * as XLSX from "xlsx";

import { bulkUploadStructure } from "@/actions/projects/structure";
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
  projectId: string;
  onStructureUpdated: () => void;
}

export default function ExcelUploadModal({
  isOpen,
  onClose,
  projectId,
  onStructureUpdated,
}: ExcelUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const queryClient = useQueryClient();

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const data = await parseExcelFile(file);
      const result = await bulkUploadStructure(data, projectId);
      return result;
    },
    onSuccess: (response: any) => {
      if (response.error) {
        toast.error(response.message || "Upload failed");
      } else {
        toast.success("Structure created successfully!");
        onClose();
        setSelectedFile(null);
        onStructureUpdated(); // Refresh the structure view
        queryClient.invalidateQueries({
          queryKey: ["projectStructure", projectId],
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to upload structure");
    },
  });

  // Handle Excel template download
  const handleDownloadTemplate = () => {
    try {
      // Create Excel workbook with template
      const workbook = XLSX.utils.book_new();

      // Sample data for the template
      const templateData = [
        ["Block/House Name", "Floor", "Units"],
        ["Block A", 1, 5],
        ["Block A", 2, 5],
        ["House 1", 1, "-"],
        ["House 1", 2, "-"],
      ];

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Structure Template");

      // Generate Excel file and download
      const fileName = "structure-bulk-upload-template.xlsx";

      XLSX.writeFile(workbook, fileName);

      toast.success("Excel template downloaded successfully!");
    } catch (error) {
      toast.error("Failed to create Excel template");
    }
  };

  // Parse Excel/CSV file
  const parseExcelFile = async (
    file: File
  ): Promise<
    Array<{ block_house_name: string; floor: number; units: number | string }>
  > => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          let data: Array<{
            block_house_name: string;
            floor: number;
            units: number | string;
          }> = [];

          if (file.name.endsWith(".csv")) {
            // Handle CSV files
            const text = e.target?.result as string;
            const lines = text.split("\n").filter((line) => line.trim());

            // Skip header row and parse data
            data = lines
              .slice(1)
              .map((line) => {
                const [block_house_name, floor, units] = line
                  .split(",")
                  .map((item) => item.trim());
                return {
                  block_house_name,
                  floor: parseInt(floor) || 0,
                  units: units === "-" ? "-" : parseInt(units) || 0,
                };
              })
              .filter((item) => item.block_house_name && item.floor > 0);
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
                const [block_house_name, floor, units] = row;
                return {
                  block_house_name: String(block_house_name || "").trim(),
                  floor: parseInt(String(floor || 0)) || 0,
                  units:
                    units === "-" ? "-" : parseInt(String(units || 0)) || 0,
                };
              })
              .filter((item) => item.block_house_name && item.floor > 0);
          }

          if (data.length === 0) {
            reject(new Error("No valid data found in file"));
            return;
          }

          // Validate data structure
          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row.block_house_name || row.block_house_name.trim() === "") {
              reject(new Error(`Row ${i + 1}: Block/House name is required`));
              return;
            }
            if (row.floor <= 0) {
              reject(
                new Error(`Row ${i + 1}: Floor must be a positive number`)
              );
              return;
            }
            if (
              row.units !== "-" &&
              (typeof row.units !== "number" || row.units < 0)
            ) {
              reject(
                new Error(
                  `Row ${
                    i + 1
                  }: Units must be a positive number or "-" for houses`
                )
              );
              return;
            }
          }

          // Ensure proper data types for API
          data = data.map((row) => ({
            block_house_name: String(row.block_house_name).trim(),
            floor: Number(row.floor),
            units: row.units === "-" ? "-" : Number(row.units),
          }));

          resolve(data);
        } catch (error) {
          reject(new Error("Failed to parse file"));
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (
      file.type === "text/csv" ||
      file.name.endsWith(".csv") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.name.endsWith(".xlsx") ||
      file.type === "application/vnd.ms-excel" ||
      file.name.endsWith(".xls")
    ) {
      setSelectedFile(file);
    } else {
      toast.error("Please select an Excel (.xlsx, .xls) or CSV file");
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (selectedFile) {
      try {
        // Parse the file first to catch any parsing errors
        const data = await parseExcelFile(selectedFile);

        // If parsing succeeds, proceed with upload
        bulkUploadMutation.mutate(selectedFile);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to parse file";
        toast.error(errorMessage);
      }
    }
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

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-none w-[80vw] h-[80vh] mt-10 overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex gap-3 items-center text-2xl font-bold">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            </div>
            Bulk Upload Structure
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Upload an Excel file to create multiple blocks, floors, and units at
            once
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-2 space-y-4">
          {/* Top Row: How it works + Excel format side by side */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* How it works section - Compact */}
            <div className="p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-blue-200">
              <h3 className="flex gap-2 items-center mb-3 text-base font-semibold text-blue-900">
                <Upload className="w-4 h-4" />
                Quick Guide
              </h3>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex gap-2 items-center">
                  <div className="flex justify-center items-center w-5 h-5 text-xs font-semibold text-blue-700 bg-blue-200 rounded-full">
                    1
                  </div>
                  <span>Download template</span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex justify-center items-center w-5 h-5 text-xs font-semibold text-blue-700 bg-blue-200 rounded-full">
                    2
                  </div>
                  <span>Fill in your data</span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex justify-center items-center w-5 h-5 text-xs font-semibold text-blue-700 bg-blue-200 rounded-full">
                    3
                  </div>
                  <span>Upload & create!</span>
                </div>
              </div>
            </div>

            {/* Excel format explanation - Compact */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="mb-3 text-base font-semibold text-gray-900">
                Excel Format
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-600">
                  <span className="text-left">Block/House</span>
                  <span className="text-left">Floor</span>
                  <span className="text-left">Units</span>
                </div>
                <div className="space-y-1">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <span className="px-2 py-1 text-left bg-blue-100 rounded">
                      Block A
                    </span>
                    <span className="px-2 py-1 text-left bg-green-100 rounded">
                      1
                    </span>
                    <span className="px-2 py-1 text-left bg-orange-100 rounded">
                      5
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <span className="px-2 py-1 text-left bg-gray-100 rounded">
                      House 1
                    </span>
                    <span className="px-2 py-1 text-left bg-gray-100 rounded">
                      1
                    </span>
                    <span className="px-2 py-1 text-left bg-gray-100 rounded">
                      -
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-left text-gray-600">
                  <strong>Tip:</strong> Use "-" for houses (no apartments)
                </p>
              </div>
            </div>
          </div>

          {/* Download Template Section */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">Get Started</h3>
                  <p className="text-sm text-green-700">
                    Download the Excel template with sample data
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex gap-2 items-center text-green-700 border-green-300 hover:bg-green-100"
                onClick={handleDownloadTemplate}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Download Template
              </Button>
            </div>
          </div>

          {/* Upload section - Enhanced */}
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Upload className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Upload Your Excel File
                </h3>
                <p className="text-sm text-gray-600">
                  Drag & drop or click to browse
                </p>
              </div>
            </div>

            <div
              className={`p-6 text-center rounded-lg border-2 border-dashed transition-all ${
                dragActive
                  ? "bg-purple-100 border-purple-500"
                  : selectedFile
                  ? "bg-green-50 border-green-400"
                  : "border-purple-300 bg-purple-50/50"
              } hover:border-purple-400 hover:bg-purple-50`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {/* File input - always present in DOM */}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="file-upload"
              />

              <div className="flex flex-col gap-3 items-center">
                {selectedFile ? (
                  <>
                    <div className="p-3 bg-green-100 rounded-full">
                      <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        File selected successfully
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="mt-2"
                    >
                      Remove File
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Upload className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Drop your Excel file here
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports .xlsx, .xls, and .csv files
                      </p>
                    </div>
                    <label
                      htmlFor="file-upload"
                      className="inline-block cursor-pointer"
                      onClick={() => {
                        document.getElementById("file-upload")?.click();
                      }}
                    >
                      <Button
                        type="button"
                        className="mt-2 bg-purple-600 hover:bg-purple-700"
                      >
                        Choose File
                      </Button>
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-shrink-0 gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={bulkUploadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || bulkUploadMutation.isPending}
            className="flex gap-2 items-center"
          >
            {bulkUploadMutation.isPending ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload & Create Structure
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
