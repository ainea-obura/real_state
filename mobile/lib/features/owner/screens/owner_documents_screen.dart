import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/controllers/owner_documents_controller.dart';
import '../../../core/models/owner_document_model.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/toast_utils.dart';

class OwnerDocumentsScreen extends StatelessWidget {
  const OwnerDocumentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Document Management'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded),
          onPressed: () => Get.back(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: () {
              // Navigate to document upload screen
              _showUploadDocumentDialog(context);
            },
          ),
        ],
      ),
      body: SafeArea(
        child: GetBuilder<OwnerDocumentsController>(
          init: OwnerDocumentsController(),
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
                    // Search and Filters
                    _buildSearchAndFilters(controller),
                    const SizedBox(height: 20),

                    // Document Statistics
                    _buildDocumentStatistics(controller),
                    const SizedBox(height: 20),

                    // Documents List
                    if (controller.documents.isEmpty)
                      _buildEmptyState()
                    else
                      _buildDocumentsList(controller),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildSearchAndFilters(OwnerDocumentsController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Search Bar
        TextField(
          onChanged: controller.setSearchQuery,
          decoration: InputDecoration(
            hintText: 'Search documents...',
            prefixIcon: const Icon(Icons.search_rounded),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            filled: true,
            fillColor: AppColors.surface,
          ),
        ),
        const SizedBox(height: 16),

        // Status Filters
        if (controller.availableStatuses.isNotEmpty) ...[
          Text(
            'Status',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: controller.availableStatuses.map((status) {
              final isSelected = controller.statusFilter.contains(status);
              return FilterChip(
                label: Text(status),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) {
                    controller.addStatusFilter(status);
                  } else {
                    controller.removeStatusFilter(status);
                  }
                },
                backgroundColor: AppColors.surface,
                selectedColor: AppColors.primary.withValues(alpha: 0.2),
                checkmarkColor: AppColors.primary,
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
        ],

        // Document Type Filters
        if (controller.availableDocumentTypes.isNotEmpty) ...[
          Text(
            'Document Type',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: controller.availableDocumentTypes.map((type) {
              final isSelected = controller.documentTypeFilter.contains(type);
              return FilterChip(
                label: Text(type),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) {
                    controller.addDocumentTypeFilter(type);
                  } else {
                    controller.removeDocumentTypeFilter(type);
                  }
                },
                backgroundColor: AppColors.surface,
                selectedColor: AppColors.primary.withValues(alpha: 0.2),
                checkmarkColor: AppColors.primary,
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
        ],

        // Clear Filters Button
        if (controller.statusFilter.isNotEmpty ||
            controller.documentTypeFilter.isNotEmpty ||
            controller.searchQuery.isNotEmpty) ...[
          TextButton.icon(
            onPressed: controller.clearFilters,
            icon: const Icon(Icons.clear_rounded),
            label: const Text('Clear Filters'),
            style: TextButton.styleFrom(foregroundColor: AppColors.primary),
          ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }

  Widget _buildDocumentStatistics(OwnerDocumentsController controller) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildStatItem(
              'Total',
              controller.totalDocuments.toString(),
              Icons.description_rounded,
              AppColors.primary,
            ),
          ),
          Expanded(
            child: _buildStatItem(
              'Pending',
              controller.pendingDocuments.toString(),
              Icons.pending_rounded,
              AppColors.warning,
            ),
          ),
          Expanded(
            child: _buildStatItem(
              'Approved',
              controller.approvedDocuments.toString(),
              Icons.check_circle_rounded,
              AppColors.success,
            ),
          ),
          Expanded(
            child: _buildStatItem(
              'Rejected',
              controller.rejectedDocuments.toString(),
              Icons.cancel_rounded,
              AppColors.error,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
      ],
    );
  }

  Widget _buildDocumentsList(OwnerDocumentsController controller) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: controller.documents.length,
      itemBuilder: (context, index) {
        final document = controller.documents[index];
        return _buildDocumentCard(document, controller);
      },
    );
  }

  Widget _buildDocumentCard(
    OwnerDocument document,
    OwnerDocumentsController controller,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        document.documentName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        document.documentTypeDisplay,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: _getStatusColor(document).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _getStatusColor(document).withValues(alpha: 0.3),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    document.statusDisplay,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _getStatusColor(document),
                    ),
                  ),
                ),
              ],
            ),
            if (document.description != null) ...[
              const SizedBox(height: 12),
              Text(
                document.description!,
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(
                  Icons.home_work_rounded,
                  size: 16,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 8),
                Text(
                  document.propertyDisplay,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.upload_file_rounded,
                  size: 16,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 8),
                Text(
                  '${document.fileName} (${document.fileSizeDisplay})',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.calendar_today_rounded,
                  size: 16,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Uploaded: ${document.uploadedDateDisplay}',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      // View document
                      _viewDocument(document);
                    },
                    icon: const Icon(Icons.visibility_rounded, size: 16),
                    label: const Text('View'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: BorderSide(color: AppColors.primary),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      // Download document
                      _downloadDocument(document);
                    },
                    icon: const Icon(Icons.download_rounded, size: 16),
                    label: const Text('Download'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                IconButton(
                  onPressed: () {
                    // Delete document
                    _deleteDocument(document, controller);
                  },
                  icon: const Icon(Icons.delete_rounded, size: 20),
                  color: AppColors.error,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.description_outlined,
            size: 64,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: 16),
          Text(
            'No Documents Found',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Upload your first document to get started',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(OwnerDocument document) {
    switch (document.status.toLowerCase()) {
      case 'pending':
        return AppColors.warning;
      case 'approved':
        return AppColors.success;
      case 'rejected':
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  }

  void _showUploadDocumentDialog(BuildContext context) {
    // Show document upload dialog
    Get.dialog(
      AlertDialog(
        title: const Text('Upload Document'),
        content: const Text('Document upload functionality coming soon!'),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text('OK')),
        ],
      ),
    );
  }

  void _viewDocument(OwnerDocument document) {
    // View document functionality
    ToastUtils.showInfo('Viewing document: ${document.documentName}');
  }

  void _downloadDocument(OwnerDocument document) {
    // Download document functionality
    ToastUtils.showInfo('Downloading document: ${document.documentName}');
  }

  void _deleteDocument(
    OwnerDocument document,
    OwnerDocumentsController controller,
  ) {
    Get.dialog(
      AlertDialog(
        title: const Text('Delete Document'),
        content: Text(
          'Are you sure you want to delete "${document.documentName}"?',
        ),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Get.back();
              final result = await controller.deleteDocument(document.id);
              if (result['success'] == true) {
                ToastUtils.showSuccess('Document deleted successfully');
              } else {
                ToastUtils.showError(
                  result['message'] ?? 'Failed to delete document',
                );
              }
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
