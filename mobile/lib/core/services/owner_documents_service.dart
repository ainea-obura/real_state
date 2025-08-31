import 'package:get/get.dart';
import '../config/api_config.dart';
import '../controllers/auth_controller.dart';
import '../models/owner_document_model.dart';

class OwnerDocumentsService {
  final AuthController _authController = Get.find<AuthController>();

  Future<Map<String, dynamic>> getDocuments({
    int page = 1,
    int pageSize = 20,
    String? status,
    String? documentType,
    String? propertyId,
  }) async {
    try {
      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        return {'success': false, 'message': 'User not authenticated'};
      }

      final response = await GetConnect().get(
        '${ApiConfig.baseUrl}/api/owner/documents/',
        query: {
          'page': page.toString(),
          'page_size': pageSize.toString(),
          if (status != null && status.isNotEmpty) 'status': status,
          if (documentType != null && documentType.isNotEmpty)
            'document_type': documentType,
          if (propertyId != null && propertyId.isNotEmpty)
            'property_id': propertyId,
        },
        headers: {
          'Authorization': 'Bearer ${await _getAccessToken()}',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = response.body;
        if (data != null && data['success'] == true) {
          final List<dynamic> documentsData = data['data'] ?? [];
          final documents = documentsData
              .map((json) => OwnerDocument.fromJson(json))
              .toList();

          return {
            'success': true,
            'data': documents,
            'total': data['total'] ?? 0,
            'page': data['page'] ?? 1,
            'has_next': data['has_next'] ?? false,
          };
        } else {
          return {
            'success': false,
            'message': data?['message'] ?? 'Failed to load documents',
          };
        }
      } else {
        return {
          'success': false,
          'message': 'Failed to load documents: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error loading documents: ${e.toString()}',
      };
    }
  }

  Future<Map<String, dynamic>> getDocumentDetails(String documentId) async {
    try {
      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        return {'success': false, 'message': 'User not authenticated'};
      }

      final response = await GetConnect().get(
        '${ApiConfig.baseUrl}/api/owner/documents/$documentId/',
        headers: {
          'Authorization': 'Bearer ${await _getAccessToken()}',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = response.body;
        if (data != null && data['success'] == true) {
          final document = OwnerDocument.fromJson(data['data']);

          return {'success': true, 'data': document};
        } else {
          return {
            'success': false,
            'message': data?['message'] ?? 'Failed to load document details',
          };
        }
      } else {
        return {
          'success': false,
          'message': 'Failed to load document details: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error loading document details: ${e.toString()}',
      };
    }
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
      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        return {'success': false, 'message': 'User not authenticated'};
      }

      // Create form data for file upload
      final form = FormData({
        'document_type': documentType,
        'document_name': documentName,
        if (description != null) 'description': description,
        if (propertyId != null) 'property_id': propertyId,
        if (unitId != null) 'unit_id': unitId,
        'file': MultipartFile(filePath, filename: fileName),
      });

      final response = await GetConnect().post(
        '${ApiConfig.baseUrl}/api/owner/documents/upload/',
        form,
        headers: {'Authorization': 'Bearer ${await _getAccessToken()}'},
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = response.body;
        if (data != null && data['success'] == true) {
          return {
            'success': true,
            'message': 'Document uploaded successfully',
            'data': data['data'],
          };
        } else {
          return {
            'success': false,
            'message': data?['message'] ?? 'Failed to upload document',
          };
        }
      } else {
        return {
          'success': false,
          'message': 'Failed to upload document: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error uploading document: ${e.toString()}',
      };
    }
  }

  Future<Map<String, dynamic>> deleteDocument(String documentId) async {
    try {
      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        return {'success': false, 'message': 'User not authenticated'};
      }

      final response = await GetConnect().delete(
        '${ApiConfig.baseUrl}/api/owner/documents/$documentId/',
        headers: {
          'Authorization': 'Bearer ${await _getAccessToken()}',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 204 || response.statusCode == 200) {
        return {'success': true, 'message': 'Document deleted successfully'};
      } else {
        return {
          'success': false,
          'message': 'Failed to delete document: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error deleting document: ${e.toString()}',
      };
    }
  }

  Future<String?> _getAccessToken() async {
    try {
      // Get access token from storage service
      final storageService = Get.find<dynamic>();
      if (storageService.hasMethod('getAccessToken')) {
        return await storageService.getAccessToken();
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
