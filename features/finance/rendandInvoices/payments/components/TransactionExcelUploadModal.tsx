import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Download, Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { bulkUploadTransactions, type BulkTransactionUploadData } from '@/actions/finance/transactionUpload';

interface TransactionExcelUploadModalProps {
  open: boolean;
  onClose: () => void;
  onTransactionsUpdated?: () => void;
}

const TransactionExcelUploadModal: React.FC<TransactionExcelUploadModalProps> = ({
  open,
  onClose,
  onTransactionsUpdated,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<BulkTransactionUploadData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: bulkUploadTransactions,
    onSuccess: (data) => {
      toast.success(data.message || 'Transactions uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['instant-payment-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onTransactionsUpdated?.();
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload transactions');
    },
  });

  const handleClose = () => {
    setParsedData([]);
    setIsProcessing(false);
    onClose();
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Mode': 'Cash',
        'Amount': '27000.000',
        'Reference Number': 'TF94518G0Y',
        'Customer Name': 'John Doe',
        'Date': '2025-07-31',
        'Deposit To': 'Undeposited Funds',
        'Amount Applied to Inv': '27000',
        'Invoice Number': 'KPM02001',
        'Invoice Date': '2025-05-31',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, 'transaction_template.xlsx');
  };

  const parseExcelFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const transactions: BulkTransactionUploadData[] = jsonData.map((row: any) => {
          // Generate a unique transaction ID if Reference Number is empty
          const transId = row['Reference Number'] || `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Extract first and last name from Customer Name
          const customerName = row['Customer Name'] || '';
          const nameParts = customerName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          return {
            trans_id: transId,
            msisdn: '', // Not provided in your Excel format
            trans_amount: row['Amount'] || '',
            payment_method: row['Mode'] || '',
            trans_time: row['Date'] || '',
            bill_ref_number: row['Invoice Number'] || '',
            merchant_code: '',
            business_short_code: '',
            invoice_number: row['Invoice Number'] || '',
            third_party_trans_id: '',
            full_name: customerName,
            first_name: firstName,
            middle_name: '',
            last_name: lastName,
            transaction_type: 'payment',
            org_account_balance: '',
            is_verified: false,
          };
        });

        setParsedData(transactions);
        toast.success(`Parsed ${transactions.length} transactions from Excel file`);
      } catch (error) {
        toast.error('Error parsing Excel file');
        console.error('Error parsing Excel:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (file: File) => {
    if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')) {
      parseExcelFile(file);
    } else {
      toast.error('Please upload a valid Excel file (.xlsx or .xls)');
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (parsedData.length === 0) {
      toast.error('No transaction data to upload');
      return;
    }

    uploadMutation.mutate(parsedData);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Upload Transactions from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Download Template</h3>
                <p className="text-sm text-blue-700">
                  Download the Excel template to see the required format
                </p>
              </div>
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Excel File
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your Excel file here, or click to browse
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              Choose File
            </label>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Required Columns:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Transaction ID:</strong> Unique transaction identifier</li>
              <li>• <strong>Phone Number:</strong> Customer phone number</li>
              <li>• <strong>Amount:</strong> Transaction amount</li>
              <li>• <strong>Payment Method:</strong> Payment method used (mpesa, airtel_money, etc.)</li>
              <li>• <strong>Transaction Time:</strong> Date and time of transaction</li>
              <li>• <strong>Account Reference:</strong> Apartment/unit reference</li>
            </ul>
            <h3 className="font-semibold text-gray-900 mb-2 mt-4">Optional Columns:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Merchant Code, Business Short Code, Invoice Number</li>
              <li>• Third Party Trans ID, Full Name, First Name, Middle Name, Last Name</li>
              <li>• Transaction Type, Org Account Balance, Is Verified</li>
            </ul>
          </div>

          {/* Parsed Data Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Preview ({parsedData.length} transactions)
                </h3>
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Transactions
                    </>
                  )}
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Transaction ID</th>
                      <th className="px-3 py-2 text-left">Phone</th>
                      <th className="px-3 py-2 text-left">Amount</th>
                      <th className="px-3 py-2 text-left">Method</th>
                      <th className="px-3 py-2 text-left">Account Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((transaction, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">{transaction.trans_id}</td>
                        <td className="px-3 py-2">{transaction.msisdn}</td>
                        <td className="px-3 py-2">{transaction.trans_amount}</td>
                        <td className="px-3 py-2">{transaction.payment_method}</td>
                        <td className="px-3 py-2">{transaction.bill_ref_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50">
                    ... and {parsedData.length - 10} more transactions
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Processing Excel file...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionExcelUploadModal;
