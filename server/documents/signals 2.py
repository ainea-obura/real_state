from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from documents.models import KYCDocument, KYCSubmission


@receiver(post_save, sender=KYCDocument)
def update_submission_status_on_document_save(sender, instance, created, **kwargs):
    """Update KYC submission status when a document is saved"""
    if instance.kyc_submission:
        instance.kyc_submission.update_overall_status()


@receiver(post_delete, sender=KYCDocument)
def update_submission_status_on_document_delete(sender, instance, **kwargs):
    """Update KYC submission status when a document is deleted"""
    if instance.kyc_submission:
        instance.kyc_submission.update_overall_status()


@receiver(post_save, sender=KYCSubmission)
def create_kyc_submission_for_company(sender, instance, created, **kwargs):
    """Handle KYC submission creation"""
    if created:
        # Set initial status to draft
        instance.status = "draft"
        instance.save()
