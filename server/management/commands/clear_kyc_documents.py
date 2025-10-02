"""
Management command to clear KYC documents for a company
This allows starting fresh with KYC document uploads
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from documents.models import KYCDocument, KYCSubmission
from company.models import Company


class Command(BaseCommand):
    help = 'Clear all KYC documents for a company to start fresh'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=str,
            required=True,
            help='Company ID to clear KYC documents for'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm that you want to delete all KYC documents'
        )

    def handle(self, *args, **options):
        company_id = options['company_id']
        confirm = options['confirm']

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Company with ID {company_id} not found')
            )
            return

        # Get all KYC documents for the company
        kyc_documents = KYCDocument.objects.filter(company=company)
        kyc_submissions = KYCSubmission.objects.filter(company=company)

        self.stdout.write(f'\nCompany: {company.name}')
        self.stdout.write(f'KYC Documents: {kyc_documents.count()}')
        self.stdout.write(f'KYC Submissions: {kyc_submissions.count()}')

        if not confirm:
            self.stdout.write(
                self.style.WARNING(
                    '\n⚠️  This will permanently delete all KYC documents and submissions!'
                )
            )
            self.stdout.write(
                'Add --confirm flag to proceed with deletion'
            )
            return

        if kyc_documents.count() == 0 and kyc_submissions.count() == 0:
            self.stdout.write(
                self.style.SUCCESS('No KYC documents to delete')
            )
            return

        # Confirm deletion
        self.stdout.write(
            self.style.WARNING(
                f'\n🗑️  Deleting {kyc_documents.count()} KYC documents and {kyc_submissions.count()} submissions...'
            )
        )

        try:
            with transaction.atomic():
                # Delete KYC documents (this will also delete associated files)
                deleted_docs = 0
                for doc in kyc_documents:
                    if doc.document_file:
                        try:
                            doc.document_file.delete(save=False)
                        except Exception as e:
                            self.stdout.write(
                                self.style.WARNING(f'Could not delete file for {doc.document_type}: {e}')
                            )
                    doc.delete()
                    deleted_docs += 1

                # Delete KYC submissions
                deleted_submissions = kyc_submissions.count()
                kyc_submissions.delete()

                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Successfully deleted {deleted_docs} KYC documents and {deleted_submissions} submissions'
                    )
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f'🎉 Company {company.name} is now ready for fresh KYC upload!'
                    )
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error deleting KYC documents: {str(e)}')
            )
