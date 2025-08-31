from django.core.management.base import BaseCommand
from django.utils import timezone
from sales.models import PaymentPlanTemplate


class Command(BaseCommand):
    help = (
        "Populate payment plan templates with real estate industry standard templates"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing templates before populating",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing templates...")
            PaymentPlanTemplate.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing templates cleared"))

        self.stdout.write("Creating payment plan templates...")

        templates_data = [
            # =====================================================
            # STANDARD TEMPLATES (Most Common)
            # =====================================================
            {
                "name": "Standard 20% Down - Monthly",
                "description": "Classic payment plan with 20% down payment and monthly installments. Most popular for residential properties.",
                "category": "standard",
                "periods": 120,
                "frequency": "monthly",
                "deposit_percentage": 20.00,
                "difficulty": "easy",
                "is_featured": True,
                "sort_order": 1,
            },
            {
                "name": "Standard 25% Down - Monthly",
                "description": "Conservative payment plan with 25% down payment and monthly installments. Lower monthly payments.",
                "category": "standard",
                "periods": 120,
                "frequency": "monthly",
                "deposit_percentage": 25.00,
                "difficulty": "easy",
                "is_featured": True,
                "sort_order": 2,
            },
            # =====================================================
            # EXTENDED TEMPLATES (Lower Down Payments)
            # =====================================================
            {
                "name": "Extended 10% Down - Monthly",
                "description": "First-time buyer friendly with only 10% down payment. Extended payment period for affordability.",
                "category": "extended",
                "periods": 180,
                "frequency": "monthly",
                "deposit_percentage": 10.00,
                "difficulty": "medium",
                "is_featured": True,
                "sort_order": 3,
            },
            {
                "name": "Extended 15% Down - Monthly",
                "description": "Balanced approach with 15% down payment. Good for buyers with moderate savings.",
                "category": "extended",
                "periods": 150,
                "frequency": "monthly",
                "deposit_percentage": 15.00,
                "difficulty": "medium",
                "is_featured": True,
                "sort_order": 4,
            },
            # =====================================================
            # QUARTERLY TEMPLATES (Investor Focused)
            # =====================================================
            {
                "name": "Quarterly 30% Down",
                "description": "Investor-friendly plan with quarterly payments. Higher down payment reduces monthly burden.",
                "category": "quarterly",
                "periods": 40,
                "frequency": "quarterly",
                "deposit_percentage": 30.00,
                "difficulty": "medium",
                "is_featured": True,
                "sort_order": 5,
            },
            {
                "name": "Quarterly 25% Down",
                "description": "Balanced quarterly plan with 25% down payment. Suitable for both investors and end-users.",
                "category": "quarterly",
                "periods": 32,
                "frequency": "quarterly",
                "deposit_percentage": 25.00,
                "difficulty": "medium",
                "is_featured": True,
                "sort_order": 6,
            },
            # =====================================================
            # SEMI-ANNUAL TEMPLATES (Luxury Properties)
            # =====================================================
            {
                "name": "Semi-Annual 40% Down",
                "description": "Premium payment plan for luxury properties. High down payment with semi-annual installments.",
                "category": "semi_annual",
                "periods": 20,
                "frequency": "semi-annual",
                "deposit_percentage": 40.00,
                "difficulty": "advanced",
                "is_featured": True,
                "sort_order": 7,
            },
            {
                "name": "Semi-Annual 35% Down",
                "description": "Luxury property payment plan with 35% down payment. Semi-annual payments for convenience.",
                "category": "semi_annual",
                "periods": 24,
                "frequency": "semi-annual",
                "deposit_percentage": 35.00,
                "difficulty": "advanced",
                "is_featured": True,
                "sort_order": 8,
            },
            # =====================================================
            # ANNUAL TEMPLATES (High-Value Properties)
            # =====================================================
            {
                "name": "Annual 50% Down",
                "description": "High-value property plan with 50% down payment. Annual installments for major transactions.",
                "category": "annual",
                "periods": 10,
                "frequency": "annual",
                "deposit_percentage": 50.00,
                "difficulty": "advanced",
                "is_featured": True,
                "sort_order": 9,
            },
            {
                "name": "Annual 45% Down",
                "description": "Premium annual payment plan with 45% down payment. Suitable for high-end properties.",
                "category": "annual",
                "periods": 12,
                "frequency": "annual",
                "deposit_percentage": 45.00,
                "difficulty": "advanced",
                "is_featured": True,
                "sort_order": 10,
            },
            # =====================================================
            # FLEXIBLE TEMPLATES (Customizable Options)
            # =====================================================
            {
                "name": "Flexible 20% Down - 5 Years",
                "description": "Flexible 5-year payment plan with 20% down payment. Good balance of affordability and duration.",
                "category": "flexible",
                "periods": 60,
                "frequency": "monthly",
                "deposit_percentage": 20.00,
                "difficulty": "medium",
                "is_featured": False,
                "sort_order": 11,
            },
            {
                "name": "Flexible 15% Down - 7 Years",
                "description": "Extended 7-year payment plan with 15% down payment. Maximum affordability for buyers.",
                "category": "flexible",
                "periods": 84,
                "frequency": "monthly",
                "deposit_percentage": 15.00,
                "difficulty": "medium",
                "is_featured": False,
                "sort_order": 12,
            },
            # =====================================================
            # CUSTOM TEMPLATES (Special Cases)
            # =====================================================
            {
                "name": "Custom 5% Down - 10 Years",
                "description": "Special low down payment plan with extended 10-year term. Requires excellent credit and approval.",
                "category": "custom",
                "periods": 120,
                "frequency": "monthly",
                "deposit_percentage": 5.00,
                "difficulty": "advanced",
                "is_featured": False,
                "sort_order": 13,
            },
            {
                "name": "Custom 60% Down - 3 Years",
                "description": "High down payment plan with short 3-year term. For buyers with substantial cash reserves.",
                "category": "custom",
                "periods": 36,
                "frequency": "monthly",
                "deposit_percentage": 60.00,
                "difficulty": "advanced",
                "is_featured": False,
                "sort_order": 14,
            },
        ]

        created_count = 0
        for template_data in templates_data:
            template, created = PaymentPlanTemplate.objects.get_or_create(
                name=template_data["name"], defaults=template_data
            )

            if created:
                created_count += 1
                self.stdout.write(f"✓ Created: {template.name}")
            else:
                self.stdout.write(f"⚠ Exists: {template.name}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nSuccessfully processed {len(templates_data)} templates. "
                f"Created: {created_count}, Existing: {len(templates_data) - created_count}"
            )
        )

        # Display summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("TEMPLATE SUMMARY:")
        self.stdout.write("=" * 60)

        for category in [
            "standard",
            "extended",
            "quarterly",
            "semi_annual",
            "annual",
            "flexible",
            "custom",
        ]:
            count = PaymentPlanTemplate.objects.filter(category=category).count()
            featured = PaymentPlanTemplate.objects.filter(
                category=category, is_featured=True
            ).count()
            self.stdout.write(
                f"{category.title():15} | Total: {count:2} | Featured: {featured:2}"
            )

        self.stdout.write("=" * 60)

        total_templates = PaymentPlanTemplate.objects.count()
        total_featured = PaymentPlanTemplate.objects.filter(is_featured=True).count()
        self.stdout.write(f"Total Templates: {total_templates}")
        self.stdout.write(f"Featured Templates: {total_featured}")

        self.stdout.write(
            self.style.SUCCESS(
                "\n🎉 Payment plan templates populated successfully! "
                "You can now use them in the sales wizard."
            )
        )
