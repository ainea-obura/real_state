import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/controllers/tenant_documents_controller.dart';
import '../../../core/models/tenant_document_model.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/enhanced_card.dart';
import '../../../core/utils/toast_utils.dart';
import '../../../core/routes/app_routes.dart';

class TenantDocumentsScreen extends StatelessWidget {
  const TenantDocumentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Document Verification'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded),
          onPressed: () => Get.back(),
        ),
      ),
      body: SafeArea(
        child: GetBuilder<TenantDocumentsController>(
          init: TenantDocumentsController(),
          builder: (controller) {
            if (controller.isLoading && controller.documents.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CircularProgressIndicator(),
                    const SizedBox(height: 16),
                    const Text('Loading documents...'),
                    const SizedBox(height: 24),
                    TextButton(
                      onPressed: () {
                        // Cancel loading and show empty state
                        controller.onClose();
                        controller.onInit();
                      },
                      child: const Text('Cancel'),
                    ),
                  ],
                ),
              );
            }

            // Show error state if there's an error
            if (controller.error.isNotEmpty && controller.documents.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline_rounded,
                      size: 64,
                      color: AppColors.error,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Failed to Load Documents',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        controller.error,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: controller.refreshDocuments,
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Retry'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.white,
                      ),
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: controller.refreshDocuments,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Status Overview
                    Row(
                      children: [
                        Expanded(
                          child: StatsCard(
                            title: 'Verified',
                            value: '${controller.verifiedDocuments}',
                            icon: Icons.verified_rounded,
                            iconColor: AppColors.success,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: StatsCard(
                            title: 'Pending',
                            value: '${controller.pendingDocuments}',
                            icon: Icons.pending_rounded,
                            iconColor: AppColors.warning,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Upload Section - Minimized
                    EnhancedCard(
                      showShadow: false, // Reduce shadow as requested
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                Icons.cloud_upload_rounded,
                                size: 20,
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Upload Documents',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    'Add verification documents',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            SizedBox(
                              height: 32,
                              child: ElevatedButton(
                                onPressed: () =>
                                    _showUploadOptions(context, controller),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: AppColors.white,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                ),
                                child: controller.isUploading
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor:
                                              AlwaysStoppedAnimation<Color>(
                                                AppColors.white,
                                              ),
                                        ),
                                      )
                                    : const Text(
                                        'Upload',
                                        style: TextStyle(fontSize: 12),
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Document Status
                    const Text(
                      'Document Status',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Dynamic document list from backend
                    if (controller.documents.isEmpty && !controller.isLoading)
                      _buildEmptyState()
                    else
                      ...controller.documents.map(
                        (document) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _buildDocumentCard(
                            context,
                            controller,
                            document,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return EnhancedCard(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            Icon(
              Icons.description_outlined,
              size: 64,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
            const Text(
              'No Documents Found',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'No documents have been uploaded yet.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentCard(
    BuildContext context,
    TenantDocumentsController controller,
    TenantDocument document,
  ) {
    final statusColors = _getStatusColors(document.status);
    final documentIcon = _getDocumentIcon(document.documentUrl);

    return Container(
      decoration: BoxDecoration(
        gradient: statusColors['gradient'],
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: statusColors['shadowColor'].withOpacity(0.1),
            offset: const Offset(0, 2),
            blurRadius: 8,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _viewDocument(document.documentUrl),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with Icon and Status
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: statusColors['iconBg'],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        documentIcon,
                        color: statusColors['iconColor'],
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            document.displayTitle,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: statusColors['badgeBg'],
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              document.formattedStatus,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: statusColors['badgeText'],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Document Details
                if (document.propertyPath.isNotEmpty) ...[
                  _buildDetailRow('Property', document.propertyPath),
                  const SizedBox(height: 8),
                ],

                _buildDetailRow(
                  'Uploaded',
                  controller.formatDate(document.createdDate),
                ),

                const SizedBox(height: 16),

                // Action Buttons
                Row(
                  children: [
                    // View Button
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _viewDocument(document.documentUrl),
                        icon: const Icon(Icons.visibility_outlined, size: 16),
                        label: const Text('View'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textSecondary,
                          side: const BorderSide(color: AppColors.border),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(width: 8),

                    // Download Button
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () =>
                            _downloadDocument(document.documentUrl),
                        icon: const Icon(Icons.download_outlined, size: 16),
                        label: const Text('Download'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textSecondary,
                          side: const BorderSide(color: AppColors.border),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                // Sign Document Button (for draft/pending)
                if (document.canSign) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: controller.isLoading
                          ? null
                          : () => _showSignDocumentDialog(
                              context,
                              controller,
                              document,
                            ),
                      icon: const Icon(Icons.edit_document, size: 16),
                      label: const Text('Sign Document'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: statusColors['buttonBg'],
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.end,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Map<String, dynamic> _getStatusColors(String status) {
    switch (status.toLowerCase()) {
      case 'draft':
        return {
          'gradient': LinearGradient(
            colors: [AppColors.grey100, AppColors.grey50],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          'iconBg': AppColors.grey200,
          'iconColor': AppColors.grey600,
          'badgeBg': AppColors.grey200,
          'badgeText': AppColors.grey700,
          'buttonBg': AppColors.grey600,
          'shadowColor': AppColors.grey600,
        };
      case 'pending':
        return {
          'gradient': LinearGradient(
            colors: [
              AppColors.warning.withOpacity(0.1),
              AppColors.warning.withOpacity(0.05),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          'iconBg': AppColors.warning.withOpacity(0.2),
          'iconColor': AppColors.warning,
          'badgeBg': AppColors.warning.withOpacity(0.2),
          'badgeText': AppColors.warning,
          'buttonBg': AppColors.warning,
          'shadowColor': AppColors.warning,
        };
      case 'signed':
      case 'active':
        return {
          'gradient': LinearGradient(
            colors: [
              AppColors.success.withOpacity(0.1),
              AppColors.success.withOpacity(0.05),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          'iconBg': AppColors.success.withOpacity(0.2),
          'iconColor': AppColors.success,
          'badgeBg': AppColors.success.withOpacity(0.2),
          'badgeText': AppColors.success,
          'buttonBg': AppColors.success,
          'shadowColor': AppColors.success,
        };
      case 'expired':
        return {
          'gradient': LinearGradient(
            colors: [
              AppColors.warning.withOpacity(0.1),
              AppColors.warning.withOpacity(0.05),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          'iconBg': AppColors.warning.withOpacity(0.2),
          'iconColor': AppColors.warning,
          'badgeBg': AppColors.warning.withOpacity(0.2),
          'badgeText': AppColors.warning,
          'buttonBg': AppColors.warning,
          'shadowColor': AppColors.warning,
        };
      case 'terminated':
        return {
          'gradient': LinearGradient(
            colors: [
              AppColors.error.withOpacity(0.1),
              AppColors.error.withOpacity(0.05),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          'iconBg': AppColors.error.withOpacity(0.2),
          'iconColor': AppColors.error,
          'badgeBg': AppColors.error.withOpacity(0.2),
          'badgeText': AppColors.error,
          'buttonBg': AppColors.error,
          'shadowColor': AppColors.error,
        };
      default:
        return {
          'gradient': LinearGradient(
            colors: [AppColors.grey100, AppColors.grey50],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          'iconBg': AppColors.grey200,
          'iconColor': AppColors.grey600,
          'badgeBg': AppColors.grey200,
          'badgeText': AppColors.grey700,
          'buttonBg': AppColors.grey600,
          'shadowColor': AppColors.grey600,
        };
    }
  }

  IconData _getDocumentIcon(String documentUrl) {
    final extension = documentUrl.split('.').last.toLowerCase();
    switch (extension) {
      case 'pdf':
        return Icons.picture_as_pdf_rounded;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return Icons.image_rounded;
      case 'mp4':
      case 'mov':
      case 'avi':
        return Icons.videocam_rounded;
      case 'doc':
      case 'docx':
        return Icons.description_rounded;
      default:
        return Icons.insert_drive_file_rounded;
    }
  }

  Future<void> _viewDocument(String? documentUrl) async {
    if (documentUrl == null || documentUrl.isEmpty) {
      ToastUtils.showWarning('Document URL not available');
      return;
    }

    // Use the new document viewer
    Get.toNamed(
      AppRoutes.documentViewer,
      arguments: {'url': documentUrl, 'title': 'Document Viewer'},
    );
  }

  Future<void> _downloadDocument(String? documentUrl) async {
    if (documentUrl == null || documentUrl.isEmpty) {
      ToastUtils.showWarning('Document URL not available');
      return;
    }

    try {
      final Uri url = Uri.parse(documentUrl);

      // Try to launch URL with url_launcher
      try {
        if (await canLaunchUrl(url)) {
          ToastUtils.showInfo('Starting download...');
          await launchUrl(
            url,
            mode:
                LaunchMode.externalApplication, // Opens in browser for download
          );
          return;
        }
      } catch (pluginError) {
        // Continue to fallback
      }

      // Fallback: Show URL for manual download
      _showUrlDialog(
        'Download Document',
        documentUrl,
        'Copy this URL to download manually:',
      );
    } catch (e) {
      ToastUtils.showError('Failed to download document');
      // Ultimate fallback: Show URL dialog
      _showUrlDialog('Download Document', documentUrl, 'Document URL:');
    }
  }

  /// Show URL dialog as fallback when url_launcher fails
  void _showUrlDialog(String title, String url, String message) {
    Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: SelectableText(
                url,
                style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text('Close')),
        ],
      ),
    );
  }

  void _showSignDocumentDialog(
    BuildContext context,
    TenantDocumentsController controller,
    TenantDocument document,
  ) {
    Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.edit_document, color: AppColors.primary, size: 24),
            const SizedBox(width: 8),
            const Text('Sign Document'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you ready to sign "${document.displayTitle}"?',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.warning.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: AppColors.warning.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: AppColors.warning, size: 20),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'This will mark the document as signed. Please ensure you have reviewed the document before proceeding.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text('Cancel')),
          ElevatedButton.icon(
            onPressed: () {
              Get.back();
              // Sign the document (this will automatically refresh the list)
              controller.updateDocumentStatus(document.id, 'signed');
            },
            icon: const Icon(Icons.check_circle_outline, size: 18),
            label: const Text('Yes, Sign Document'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  void _showUploadOptions(
    BuildContext context,
    TenantDocumentsController controller,
  ) {
    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.grey300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Upload Document',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.camera_alt_rounded,
                  color: AppColors.primary,
                ),
              ),
              title: const Text('Take Photo'),
              subtitle: const Text('Use camera to capture document'),
              onTap: () {
                Get.back();
                controller.handleDocumentUpload('camera');
              },
            ),
            ListTile(
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.secondary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.photo_library_rounded,
                  color: AppColors.secondary,
                ),
              ),
              title: const Text('Choose from Gallery'),
              subtitle: const Text('Select from photo library'),
              onTap: () {
                Get.back();
                controller.handleDocumentUpload('gallery');
              },
            ),
            ListTile(
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.info.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.file_present_rounded,
                  color: AppColors.info,
                ),
              ),
              title: const Text('Choose File'),
              subtitle: const Text('Select PDF or document file'),
              onTap: () {
                Get.back();
                controller.handleDocumentUpload('file');
              },
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }
}
