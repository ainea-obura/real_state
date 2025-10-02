"""
Test script to verify contract_end null handling fix
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'src.settings')
django.setup()

from properties.tenant import TenantDashboardView
from properties.models import PropertyTenant
from accounts.models import Users
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser


def test_contract_end_null_handling():
    """Test that contract_end null values are handled correctly"""
    print("🧪 Testing contract_end null handling...")
    
    try:
        # Create a test request
        factory = RequestFactory()
        request = factory.get('/api/v1/properties/tenants/test-id/dashboard/')
        request.user = AnonymousUser()
        
        # Get a tenant with null contract_end
        tenant_with_null_contract = PropertyTenant.objects.filter(
            contract_end__isnull=True
        ).first()
        
        if not tenant_with_null_contract:
            print("ℹ️  No tenant with null contract_end found. Creating test data...")
            # Create a test tenant with null contract_end
            tenant_user = Users.objects.filter(type='tenant').first()
            if tenant_user:
                from properties.models import LocationNode
                property_node = LocationNode.objects.filter(node_type='UNIT').first()
                if property_node:
                    test_tenant = PropertyTenant.objects.create(
                        tenant_user=tenant_user,
                        node=property_node,
                        contract_start='2024-01-01',
                        contract_end=None,  # This should be null
                        rent_amount=1000.00,
                        currency_id=1,  # Assuming currency exists
                        deposit_amount=1000.00
                    )
                    print(f"✅ Created test tenant with null contract_end: {test_tenant.id}")
                else:
                    print("❌ No property nodes found for testing")
                    return False
            else:
                print("❌ No tenant users found for testing")
                return False
        else:
            print(f"✅ Found tenant with null contract_end: {tenant_with_null_contract.id}")
        
        # Test the view
        view = TenantDashboardView()
        response = view.get(request, tenant_id=str(tenant_with_null_contract.tenant_user.id))
        
        if response.status_code == 200:
            data = response.data
            if 'data' in data and 'property_assignments' in data['data']:
                assignments = data['data']['property_assignments']
                for assignment in assignments:
                    if assignment.get('contract_end') is None:
                        print("✅ contract_end null value handled correctly!")
                        return True
                    else:
                        print(f"❌ Expected null but got: {assignment.get('contract_end')}")
                        return False
            else:
                print("❌ Response structure unexpected")
                return False
        else:
            print(f"❌ Request failed with status: {response.status_code}")
            print(f"Response: {response.data}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_contract_end_null_handling()
    if success:
        print("\n🎉 Contract end null handling test PASSED!")
    else:
        print("\n💥 Contract end null handling test FAILED!")
        sys.exit(1)
