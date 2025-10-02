// Test the Excel upload functionality
// Run this in browser console to test the upload

const testExcelUpload = async () => {
  console.log('🧪 Testing Excel Upload...');
  
  // Create test data
  const testData = [
    {
      type: "tenant",
      first_name: "Test",
      last_name: "User",
      email: "test.user@example.com",
      phone: "+254712345678",
      gender: "Male"
    }
  ];
  
  console.log('📊 Test data:', testData);
  
  try {
    // Test the API call directly
    const response = await fetch('/api/projects/clients/bulk-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'test-token'}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    const result = await response.json();
    console.log('📡 Response data:', result);
    
    if (response.ok) {
      console.log('✅ Upload successful!');
    } else {
      console.log('❌ Upload failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).testExcelUpload = testExcelUpload;
}

export { testExcelUpload };




