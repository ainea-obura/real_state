import * as XLSX from "xlsx";

// Create a sample Excel file for testing
const createSampleExcelFile = () => {
  const workbook = XLSX.utils.book_new();
  
  const sampleData = [
    ["Type", "First Name", "Last Name", "Email", "Phone", "Gender"],
    ["tenant", "John", "Doe", "john.doe@example.com", "+254712345678", "Male"],
    ["owner", "Jane", "Smith", "jane.smith@example.com", "+254712345679", "Female"],
    ["tenant", "Mike", "Johnson", "mike.johnson@example.com", "+254712345680", "Male"],
    ["owner", "Sarah", "Wilson", "sarah.wilson@example.com", "+254712345681", "Female"],
    ["tenant", "Alice", "Brown", "alice.brown@example.com", "+254712345682", "Female"],
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sample Clients");
  
  const fileName = "sample-clients-test.xlsx";
  XLSX.writeFile(workbook, fileName);
  
  console.log(`✅ Sample Excel file created: ${fileName}`);
  console.log("📋 Sample data includes:");
  console.log("- 3 tenants: John Doe, Mike Johnson, Alice Brown");
  console.log("- 3 owners: Jane Smith, Sarah Wilson");
  console.log("- All with valid email addresses and phone numbers");
};

// Export for use in browser console or testing
if (typeof window !== 'undefined') {
  (window as any).createSampleExcelFile = createSampleExcelFile;
}

export { createSampleExcelFile };


