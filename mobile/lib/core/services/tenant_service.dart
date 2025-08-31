import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import 'dart:convert';

class TenantService {
  final ApiService _apiService;

  TenantService(this._apiService);

  /// Update tenant information
  ///
  /// [tenantId] - The ID of the tenant to update
  /// [updateData] - Map containing the fields to update
  /// Returns Map with 'success' boolean and 'message' string
  Future<Map<String, dynamic>> updateTenant(
    String tenantId,
    Map<String, dynamic> updateData,
  ) async {
    try {
      final endpoint = ApiConstants.updateTenantEndpoint.replaceAll(
        '{tenantId}',
        tenantId,
      );

      final response = await _apiService.put(
        endpoint,
        body: updateData,
        includeAuth: true,
      );

      return _parseResponse(response);
    } catch (e) {
      return _createResponse(false, 'Network error: ${e.toString()}');
    }
  }

  Map<String, dynamic> _parseResponse(dynamic response) {
    Map<String, dynamic>? responseBody;

    // Handle both String and Map response bodies
    if (response.body is String) {
      try {
        responseBody = json.decode(response.body) as Map<String, dynamic>;
      } catch (e) {
        // Handle parsing error
      }
    } else if (response.body is Map) {
      responseBody = response.body as Map<String, dynamic>;
    }

    if (responseBody != null) {
      // Check if API returned an error
      if (responseBody['error'] == true) {
        final errorMessage = responseBody['message'] ?? 'Update failed';
        return _createResponse(false, errorMessage);
      }

      // Check if API returned success message
      if (responseBody['message'] != null) {
        final message = responseBody['message'];
        return _createResponse(true, message);
      }
    }

    // Fallback: check HTTP status code
    if (response.statusCode == 200) {
      return _createResponse(true, 'Profile updated successfully');
    } else {
      return _createResponse(
        false,
        'Failed to update profile (Status: ${response.statusCode})',
      );
    }
  }

  Map<String, dynamic> _createResponse(bool success, String message) {
    return {'success': success, 'message': message};
  }
}
