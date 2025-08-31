import 'package:get/get.dart';
import '../models/owner_document_model.dart';
import '../services/owner_documents_service.dart';
import 'package:flutter/foundation.dart';

class OwnerDocumentsController extends GetxController {
  final OwnerDocumentsService _documentsService =
      Get.find<OwnerDocumentsService>();

  final RxList<OwnerDocument> _documents = <OwnerDocument>[].obs;
  final RxList<OwnerDocument> _filteredDocuments = <OwnerDocument>[].obs;
  final RxBool _isLoading = false.obs;
  final RxString _error = ''.obs;
  final RxBool _hasMoreDocuments = true.obs;

  // Filter states
  final RxList<String> _statusFilter = <String>[].obs;
  final RxList<String> _documentTypeFilter = <String>[].obs;
  final RxString _searchQuery = ''.obs;
  final RxString _selectedPropertyId = ''.obs;

  // Pagination
  int _currentPage = 1;
  static const int _pageSize = 20;

  List<OwnerDocument> get documents => _filteredDocuments;
  bool get isLoading => _isLoading.value;
  String get error => _error.value;
  bool get hasMoreDocuments => _hasMoreDocuments.value;

  // Filter getters
  List<String> get statusFilter => _statusFilter;
  List<String> get documentTypeFilter => _documentTypeFilter;
  String get searchQuery => _searchQuery.value;
  String get selectedPropertyId => _selectedPropertyId.value;

  @override
  void onInit() {
    super.onInit();
    loadDocuments();
  }

  void addStatusFilter(String status) {
    if (!_statusFilter.contains(status)) {
      _statusFilter.add(status);
      _applyFilters();
    }
  }

  void removeStatusFilter(String status) {
    _statusFilter.remove(status);
    _applyFilters();
  }

  void addDocumentTypeFilter(String documentType) {
    if (!_documentTypeFilter.contains(documentType)) {
      _documentTypeFilter.add(documentType);
      _applyFilters();
    }
  }

  void removeDocumentTypeFilter(String documentType) {
    _documentTypeFilter.remove(documentType);
    _applyFilters();
  }

  void setSearchQuery(String query) {
    _searchQuery.value = query;
    _applyFilters();
  }

  void setSelectedPropertyId(String propertyId) {
    _selectedPropertyId.value = propertyId;
    _applyFilters();
  }

  void clearFilters() {
    _statusFilter.clear();
    _documentTypeFilter.clear();
    _searchQuery.value = '';
    _selectedPropertyId.value = '';
    _applyFilters();
  }

  void _applyFilters() {
    List<OwnerDocument> filtered = List.from(_documents);

    // Apply status filter
    if (_statusFilter.isNotEmpty) {
      filtered = filtered
          .where((document) => _statusFilter.contains(document.status))
          .toList();
    }

    // Apply document type filter
    if (_documentTypeFilter.isNotEmpty) {
      filtered = filtered
          .where(
            (document) => _documentTypeFilter.contains(document.documentType),
          )
          .toList();
    }

    // Apply property filter
    if (_selectedPropertyId.value.isNotEmpty) {
      filtered = filtered
          .where((document) => document.propertyId == _selectedPropertyId.value)
          .toList();
    }

    // Apply search filter
    if (_searchQuery.value.isNotEmpty) {
      final query = _searchQuery.value.toLowerCase();
      filtered = filtered
          .where(
            (document) =>
                document.documentName.toLowerCase().contains(query) ||
                (document.description?.toLowerCase().contains(query) ??
                    false) ||
                document.documentType.toLowerCase().contains(query),
          )
          .toList();
    }

    _filteredDocuments.assignAll(filtered);
  }

  Future<void> loadDocuments() async {
    if (_isLoading.value) return;

    try {
      _isLoading.value = true;
      _error.value = '';

      final result = await _documentsService.getDocuments(
        page: _currentPage,
        pageSize: _pageSize,
        status: _statusFilter.isNotEmpty ? _statusFilter.first : null,
        documentType: _documentTypeFilter.isNotEmpty
            ? _documentTypeFilter.first
            : null,
        propertyId: _selectedPropertyId.value.isNotEmpty
            ? _selectedPropertyId.value
            : null,
      );

      if (result['success'] == true) {
        final List<OwnerDocument> newDocuments = result['data'] ?? [];

        if (_currentPage == 1) {
          _documents.clear();
          _filteredDocuments.clear();
        }

        _documents.addAll(newDocuments);
        _applyFilters();

        _hasMoreDocuments.value = newDocuments.length >= _pageSize;
        _currentPage++;
      } else {
        _error.value = result['message'] ?? 'Failed to load documents';
      }
    } catch (e) {
      _error.value = 'Error loading documents: ${e.toString()}';
      if (kDebugMode) {
        print('Error loading documents: $e');
      }
    } finally {
      _isLoading.value = false;
    }
  }

  Future<void> refreshDocuments() async {
    _currentPage = 1;
    _hasMoreDocuments.value = true;
    await loadDocuments();
  }

  Future<void> loadMoreDocuments() async {
    if (_isLoading.value || !_hasMoreDocuments.value) return;
    await loadDocuments();
  }

  Future<Map<String, dynamic>> uploadDocument({
    required String documentType,
    required String documentName,
    String? description,
    String? propertyId,
    String? unitId,
    required String filePath,
    required String fileName,
  }) async {
    try {
      final result = await _documentsService.uploadDocument(
        documentType: documentType,
        documentName: documentName,
        description: description,
        propertyId: propertyId,
        unitId: unitId,
        filePath: filePath,
        fileName: fileName,
      );

      if (result['success'] == true) {
        // Refresh documents after successful upload
        await refreshDocuments();
      }

      return result;
    } catch (e) {
      return {
        'success': false,
        'message': 'Error uploading document: ${e.toString()}',
      };
    }
  }

  Future<Map<String, dynamic>> deleteDocument(String documentId) async {
    try {
      final result = await _documentsService.deleteDocument(documentId);

      if (result['success'] == true) {
        // Remove document from lists
        _documents.removeWhere((doc) => doc.id == documentId);
        _filteredDocuments.removeWhere((doc) => doc.id == documentId);
      }

      return result;
    } catch (e) {
      return {
        'success': false,
        'message': 'Error deleting document: ${e.toString()}',
      };
    }
  }

  void clearError() {
    _error.value = '';
  }

  // Document statistics
  int get totalDocuments => _documents.length;
  int get pendingDocuments => _documents.where((d) => d.isPending).length;
  int get approvedDocuments => _documents.where((d) => d.isApproved).length;
  int get rejectedDocuments => _documents.where((d) => d.isRejected).length;

  // Available document types for filtering
  List<String> get availableDocumentTypes {
    final types = _documents.map((d) => d.documentType).toSet().toList();
    types.sort();
    return types;
  }

  // Available statuses for filtering
  List<String> get availableStatuses {
    final statuses = _documents.map((d) => d.status).toSet().toList();
    statuses.sort();
    return statuses;
  }
}
