"""
Test script to verify KYC documents are returned correctly after direct upload fix
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'src.settings')
django.setup()

from documents.models import KYCDocument, KYCSubmission
from company.models import Company
from documents.kyc_documents.serializers import KYCDocumentSerializer


def test_kyc_document_serialization():
    """Test that KYC documents serialize correctly with direct upload"""
    print("🧪 Testing KYC document serialization...")
    
    try:
        # Get a company with KYC documents
        company = Company.objects.filter(kyc_documents__isnull=False).first()
        
        if not company:
            print("ℹ️  No company with KYC documents found")
            return False
            
        # Get KYC documents for the company
        kyc_documents = KYCDocument.objects.filter(company=company)
        
        if not kyc_documents.exists():
            print("ℹ️  No KYC documents found for company")
            return False
            
        print(f"✅ Found {kyc_documents.count()} KYC documents for company: {company.name}")
        
        # Test serialization
        for doc in kyc_documents:
            serializer = KYCDocumentSerializer(doc)
            data = serializer.data
            
            print(f"\n📄 Document: {doc.document_type}")
            print(f"   File Name: {data.get('file_name', 'N/A')}")
            print(f"   File Size: {data.get('file_size', 'N/A')} bytes")
            print(f"   Document File: {data.get('document_file', 'N/A')}")
            print(f"   Is Direct Upload: {data.get('is_direct_upload', False)}")
            print(f"   Status: {data.get('status', 'N/A')}")
            
            # Check if direct upload is handled correctly
            if doc.document_file is None and doc.file_name:
                if data.get('is_direct_upload') == True:
                    print("   ✅ Direct upload handled correctly")
                else:
                    print("   ❌ Direct upload not handled correctly")
                    return False
            else:
                if data.get('is_direct_upload') == False:
                    print("   ✅ Regular file handled correctly")
                else:
                    print("   ❌ Regular file not handled correctly")
                    return False
        
        print("\n🎉 All KYC documents serialized correctly!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_kyc_document_serialization()
    if success:
        print("\n✅ KYC document serialization test PASSED!")
    else:
        print("\n💥 KYC document serialization test FAILED!")
        sys.exit(1)
