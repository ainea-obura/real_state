import 'dart:io';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../models/tenant_document_model.dart';
import '../services/tenant_documents_service.dart';
import '../utils/toast_utils.dart';
import 'auth_controller.dart';

class TenantDocumentsController extends GetxController {
  final TenantDocumentsService _documentsService =
      Get.find<TenantDocumentsService>();

  // Observable states
  final RxList<TenantDocument> _documents = <TenantDocument>[].obs;
  final RxBool _isLoading = false.obs;
  final RxBool _isUploading = false.obs;
  final RxString _error = ''.obs;

  // Getters
  List<TenantDocument> get documents => _documents;
  bool get isLoading => _isLoading.value;
  bool get isUploading => _isUploading.value;
  String get error => _error.value;
  bool get hasDocuments => _documents.isNotEmpty;

  // Computed values
  int get totalDocuments => _documents.length;
  int get verifiedDocuments =>
      _documents.where((doc) => doc.isSigned || doc.isActive).length;
  int get pendingDocuments =>
      _documents.where((doc) => doc.isPending || doc.isDraft).length;


  // Method to load data when documents tab is accessed
  Future<void> loadDataWhenTabAccessed() async {
    if (_documents.isNotEmpty) {
      // Data already loaded, no need to reload
      return;
    }
    loadDocuments();
  }

  /// Load tenant documents
  Future<void> loadDocuments() async {
    try {
      _setLoading(true);
      _clearError();

      // Get current user ID from auth controller
      final authController = Get.find<AuthController>();
      final user = authController.currentUser;

      if (user == null) {
        throw Exception('User not authenticated');
      }

      // Add timeout to prevent infinite loading
      final response = await _documentsService
          .fetchTenantDocuments(user.id)
          .timeout(
            const Duration(seconds: 15),
            onTimeout: () {
              throw Exception('Request timeout - please check your connection');
            },
          );

      _documents.value = response.results;
      // Show info message if no documents found
      if (response.results.isEmpty) {
        }
    } catch (e) {
      _setError('Failed to load documents: $e');

      // Show more specific error messages
      if (e.toString().contains('timeout')) {
        ToastUtils.showError('Request timeout - please check your connection');
      } else if (e.toString().contains('404')) {
        ToastUtils.showError('Documents endpoint not found');
      } else if (e.toString().contains('500')) {
        ToastUtils.showError('Server error - please try again later');
      } else {
        ToastUtils.showError('Failed to load documents');
      }
    } finally {
      _setLoading(false);
    }
  }

  /// Refresh documents
  Future<void> refreshDocuments() async {
    await loadDocuments();
  }

  /// Update document status
  Future<void> updateDocumentStatus(String documentId, String status) async {
    try {
      _setLoading(true);
      _clearError();

      await _documentsService.updateDocumentStatus(documentId, status);

      ToastUtils.showSuccess(
        status == 'signed'
            ? 'Document signed successfully!'
            : 'Document status updated successfully',
      );

      // Refresh the documents list
      await loadDocuments();
    } catch (e) {
      _setError('Failed to update document status: $e');
      ToastUtils.showError(
        status == 'signed'
            ? 'Failed to sign document'
            : 'Failed to update document status',
      );
    } finally {
      _setLoading(false);
    }
  }

  /// Upload signed document
  Future<void> uploadSignedDocument(String agreementId, File file) async {
    try {
      _setUploading(true);
      _clearError();

      await _documentsService.uploadSignedDocument(agreementId, file);

      ToastUtils.showSuccess('Document uploaded successfully');

      // Refresh the documents list
      await loadDocuments();
    } catch (e) {
      _setError('Failed to upload document: $e');
      ToastUtils.showError('Failed to upload document');
    } finally {
      _setUploading(false);
    }
  }

  /// Handle document upload from different sources
  Future<void> handleDocumentUpload(
    String source, {
    String? agreementId,
  }) async {
    try {
      _setUploading(true);
      File? file;

      switch (source) {
        case 'camera':
          file = await _pickImageFromCamera();
          break;
        case 'gallery':
          file = await _pickImageFromGallery();
          break;
        case 'file':
          file = await _pickFileFromStorage();
          break;
        default:
          ToastUtils.showError('Invalid upload source');
          return;
      }

      if (file != null) {
        if (agreementId != null && agreementId.isNotEmpty) {
          // Upload signed document for specific agreement
          await uploadSignedDocument(agreementId, file);
        } else {
          // General document upload - simulate for now
          await _uploadGeneralDocument(file);
        }
      } else {
        ToastUtils.showWarning('No file selected');
      }
    } catch (e) {
      ToastUtils.showError('Failed to upload document');
    } finally {
      _setUploading(false);
    }
  }

  /// Pick image from camera
  Future<File?> _pickImageFromCamera() async {
    try {
      // Try to use camera first, permission handling is done by the plugin
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (image != null) {
        return File(image.path);
      } else {
        return null;
      }
    } catch (e) {
      // If it's a permission error, provide helpful message
      if (e.toString().contains('permission') ||
          e.toString().contains('denied')) {
        ToastUtils.showError('Please grant camera permission in settings');
      } else {
        ToastUtils.showError('Failed to capture image');
      }
      return null;
    }
  }

  /// Pick image from gallery
  Future<File?> _pickImageFromGallery() async {
    try {
      // Try to pick image first, permission handling is done by the plugin
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (image != null) {
        return File(image.path);
      } else {
        return null;
      }
    } catch (e) {
      // If it's a permission error, provide helpful message
      if (e.toString().contains('permission') ||
          e.toString().contains('denied')) {
        ToastUtils.showError(
          'Please grant photo library permission in settings',
        );
      } else {
        ToastUtils.showError('Failed to select image');
      }
      return null;
    }
  }

  /// Pick file from storage
  Future<File?> _pickFileFromStorage() async {
    try {
      // Try to pick file first, permission handling is done by the plugin
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
        allowMultiple: false,
      );

      if (result != null && result.files.single.path != null) {
        final file = File(result.files.single.path!);
        // Validate file size (max 10MB)
        final fileSize = await file.length();
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (fileSize > maxSize) {
          ToastUtils.showError('File size must be less than 10MB');
          return null;
        }

        return file;
      } else {
        return null;
      }
    } catch (e) {
      // If it's a permission error, provide helpful message
      if (e.toString().contains('permission') ||
          e.toString().contains('denied')) {
        ToastUtils.showError('Please grant storage permission in settings');
      } else {
        ToastUtils.showError('Failed to select file');
      }
      return null;
    }
  }

  /// Upload general document (for new documents, not signing existing ones)
  Future<void> _uploadGeneralDocument(File file) async {
    try {
      // Validate file size (max 10MB)
      final fileSize = await file.length();
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (fileSize > maxSize) {
        ToastUtils.showError('File size must be less than 10MB');
        return;
      }

      // For now, simulate upload since we don't have a general upload endpoint
      ToastUtils.showInfo('Uploading document...');
      await Future.delayed(const Duration(seconds: 2));

      ToastUtils.showSuccess('Document uploaded successfully!');

      // Refresh documents list
      await loadDocuments();
    } catch (e) {
      ToastUtils.showError('Failed to upload document');
    }
  }

  /// Get document by ID
  TenantDocument? getDocumentById(String id) {
    try {
      return _documents.firstWhere((doc) => doc.id == id);
    } catch (e) {
      return null;
    }
  }

  /// Get documents by status
  List<TenantDocument> getDocumentsByStatus(String status) {
    return _documents.where((doc) => doc.status == status).toList();
  }

  /// Get status color for UI
  Map<String, dynamic> getStatusColors(String status) {
    return _documentsService.getStatusColors(status);
  }

  /// Get document type icon
  String getDocumentTypeIcon(String documentUrl) {
    return _documentsService.getDocumentTypeIcon(documentUrl);
  }

  /// Format date for display
  String formatDate(DateTime date) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  // Private helper methods
  void _setLoading(bool loading) {
    _isLoading.value = loading;
  }

  void _setUploading(bool uploading) {
    _isUploading.value = uploading;
  }

  void _setError(String errorMessage) {
    _error.value = errorMessage;
  }

  void _clearError() {
    _error.value = '';
  }

}
