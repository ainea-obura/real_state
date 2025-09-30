from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from company.models import Company, BusinessOnboarding
import uuid

User = get_user_model()


class Command(BaseCommand):
    help = 'Add a sample business onboarding record for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=str,
            help='Company ID to add business onboarding to (optional)',
        )
        parser.add_argument(
            '--merchant-code',
            type=str,
            default='TEST123',
            help='Merchant code to use (default: TEST123)',
        )

    def handle(self, *args, **options):
        company_id = options.get('company_id')
        merchant_code = options.get('merchant_code')

        # Get or create a company
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
                self.stdout.write(f"Using existing company: {company.name}")
            except Company.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Company with ID {company_id} not found")
                )
                return
        else:
            # Create a test company if none specified
            company, created = Company.objects.get_or_create(
                name="Test Company Ltd",
                defaults={
                    'phone': '+254700000000',
                    'email': 'test@testcompany.com',
                    'address': '123 Test Street, Nairobi',
                    'status': 'active'
                }
            )
            if created:
                self.stdout.write(f"Created new company: {company.name}")
            else:
                self.stdout.write(f"Using existing company: {company.name}")

        # Get or create a test user
        user, created = User.objects.get_or_create(
            email='testuser@testcompany.com',
            defaults={
                'first_name': 'Test',
                'last_name': 'User',
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(f"Created new user: {user.email}")
        else:
            self.stdout.write(f"Using existing user: {user.email}")

        # Check if business onboarding already exists
        existing_onboarding = BusinessOnboarding.objects.filter(company=company).first()
        if existing_onboarding:
            self.stdout.write(
                self.style.WARNING(
                    f"Business onboarding already exists for {company.name}. "
                    f"Merchant Code: {existing_onboarding.merchantCode}"
                )
            )
            return

        # Create sample business onboarding
        business_onboarding = BusinessOnboarding.objects.create(
            company=company,
            user=user,
            
            # API Response fields (simulating successful onboarding)
            status=True,
            responseCode="0",
            message="Business onboarding completed successfully",
            
            # Business Account Information
            requestId=uuid.uuid4(),
            merchantCode=merchant_code,
            accountNumber="ACC123456789",
            displayName=company.name,
            accountStatus="active",
            accountBalance=0.00,
            
            # Basic Information
            businessName=company.name,
            billNumber="BILL001",
            description="Test business for KYC upload testing",
            
            # Business Details
            productType=1,
            countryId="KE",
            subregionId="KE-110",
            industryId="62",
            subIndustryId="6201",
            
            # Banking Information
            bankId="001",
            bankAccountNumber="1234567890",
            
            # Contact Information
            mobileNumber="+254700000000",
            businessTypeId="1",
            email=company.email,
            
            # Registration Information
            registrationNumber="C.123456",
            kraPin="A123456789X",
            referralCode="REF001",
            dealerNumber="DEAL001",
            
            # Business Details
            purpose="Property Management",
            natureOfBusiness="Real Estate Services",
            physicalAddress=company.address,
            
            # Transaction Estimates
            estimatedMonthlyTransactionAmount=100000.00,
            estimatedMonthlyTransactionCount=50,
            callbackUrl="https://webhook.site/test-callback",
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Successfully created business onboarding for {company.name}\n"
                f"   Company ID: {company.id}\n"
                f"   Merchant Code: {business_onboarding.merchantCode}\n"
                f"   Request ID: {business_onboarding.requestId}\n"
                f"   Status: {business_onboarding.status}\n"
                f"   Account Number: {business_onboarding.accountNumber}\n\n"
                f"🎉 You can now test KYC upload with direct SasaPay integration!"
            )
        )
