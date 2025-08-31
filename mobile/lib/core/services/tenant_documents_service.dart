import 'dart:io';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../models/tenant_document_model.dart';
import 'api_service.dart';

class TenantDocumentsService {
  final ApiService _apiService;

  TenantDocumentsService(this._apiService);

  /// Fetch tenant documents for a specific user
  Future<TenantDocumentsResponse> fetchTenantDocuments(String userId) async {
    try {
      final response = await _apiService.get(
        '${ApiConstants.tenantDocumentsEndpoint}?user_id=$userId',
      );

      // Check if endpoint exists (404 error)
      if (response.statusCode == 404) {
        // Return empty response instead of error
        return const TenantDocumentsResponse(count: 0, results: []);
      }

      final apiResponse = _apiService.handleResponse<TenantDocumentApiResponse>(
        response,
        (data) => TenantDocumentApiResponse.fromJson(data),
      );

      if (apiResponse.error || apiResponse.data == null) {
        // If endpoint doesn't exist, return empty response
        if (response.statusCode == 404) {
          return const TenantDocumentsResponse(count: 0, results: []);
        }

        throw Exception(
          apiResponse.message ?? 'Failed to fetch tenant documents',
        );
      }

      return apiResponse.data!;
    } catch (e) {
      // If it's a 404 error, return empty response instead of throwing
      if (e.toString().contains('404')) {
        return const TenantDocumentsResponse(count: 0, results: []);
      }

      rethrow;
    }
  }

  /// Update document status
  Future<void> updateDocumentStatus(String documentId, String status) async {
    try {
      final request = UpdateDocumentStatusRequest(status: status);

      final response = await _apiService.patch(
        '${ApiConstants.tenantDocumentsEndpoint}$documentId/',
        body: request.toJson(),
      );

      _apiService.handleResponse<Map<String, dynamic>>(
        response,
        (data) => data,
      );

      } catch (e) {
      rethrow;
    }
  }

  /// Upload signed document
  Future<void> uploadSignedDocument(String agreementId, File file) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse(
          '${ApiConstants.baseUrl}${ApiConstants.uploadSignedDocumentEndpoint.replaceFirst('{agreement_id}', agreementId)}',
        ),
      );

      // Add authorization header
      final accessToken = await _apiService.getAuthToken();
      if (accessToken != null) {
        request.headers['Authorization'] = 'Bearer $accessToken';
      }

      // Add fields
      request.fields['agreement_id'] = agreementId;

      // Add file
      request.files.add(await http.MultipartFile.fromPath('file', file.path));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        } else {
        throw Exception(
          'Failed to upload signed document: ${response.statusCode}',
        );
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Get document file type icon
  String getDocumentTypeIcon(String documentUrl) {
    final extension = documentUrl.split('.').last.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'document';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'mp4':
      case 'mov':
      case 'avi':
        return 'video';
      case 'doc':
      case 'docx':
        return 'document';
      default:
        return 'file';
    }
  }

  /// Get status color based on document status
  Map<String, dynamic> getStatusColors(String status) {
    switch (status.toLowerCase()) {
      case 'draft':
        return {
          'backgroundColor': 'grey',
          'textColor': 'grey',
          'iconColor': 'grey',
        };
      case 'pending':
        return {
          'backgroundColor': 'warning',
          'textColor': 'warning',
          'iconColor': 'warning',
        };
      case 'signed':
        return {
          'backgroundColor': 'success',
          'textColor': 'success',
          'iconColor': 'success',
        };
      case 'active':
        return {
          'backgroundColor': 'info',
          'textColor': 'info',
          'iconColor': 'info',
        };
      case 'expired':
        return {
          'backgroundColor': 'warning',
          'textColor': 'warning',
          'iconColor': 'warning',
        };
      case 'terminated':
        return {
          'backgroundColor': 'error',
          'textColor': 'error',
          'iconColor': 'error',
        };
      default:
        return {
          'backgroundColor': 'grey',
          'textColor': 'grey',
          'iconColor': 'grey',
        };
    }
  }
}
