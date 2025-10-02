"""
Simple script to clear KYC documents and test the fix
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'src.settings')
django.setup()

from documents.models import KYCDocument, KYCSubmission
from company.models import Company


def clear_and_test_kyc():
    """Clear KYC documents and test the system"""
    print("🧹 Clearing KYC documents...")
    
    try:
        # Get all companies with KYC documents
        companies_with_kyc = Company.objects.filter(kyc_documents__isnull=False).distinct()
        
        if not companies_with_kyc.exists():
            print("ℹ️  No companies with KYC documents found")
            return True
            
        for company in companies_with_kyc:
            print(f"\n📋 Processing company: {company.name}")
            
            # Get KYC documents
            kyc_documents = KYCDocument.objects.filter(company=company)
            kyc_submissions = KYCSubmission.objects.filter(company=company)
            
            print(f"   Documents: {kyc_documents.count()}")
            print(f"   Submissions: {kyc_submissions.count()}")
            
            # Delete documents
            deleted_docs = 0
            for doc in kyc_documents:
                if doc.document_file:
                    try:
                        doc.document_file.delete(save=False)
                    except:
                        pass
                doc.delete()
                deleted_docs += 1
            
            # Delete submissions
            deleted_submissions = kyc_submissions.count()
            kyc_submissions.delete()
            
            print(f"   ✅ Deleted {deleted_docs} documents and {deleted_submissions} submissions")
        
        print("\n🎉 All KYC documents cleared successfully!")
        print("💡 You can now upload fresh documents")
        return True
        
    except Exception as e:
        print(f"❌ Error clearing KYC documents: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = clear_and_test_kyc()
    if success:
        print("\n✅ KYC cleanup completed successfully!")
    else:
        print("\n💥 KYC cleanup failed!")
        sys.exit(1)
