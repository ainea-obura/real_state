import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import 'dart:convert';

class OwnerService {
  final ApiService _apiService;

  OwnerService(this._apiService);

  /// Update owner information
  ///
  /// [ownerId] - The ID of the owner to update
  /// [updateData] - Map containing the fields to update
  /// Returns Map with 'success' boolean and 'message' string
  Future<Map<String, dynamic>> updateOwner(
    String ownerId,
    Map<String, dynamic> updateData,
  ) async {
    try {
      print('OwnerService: updateOwner called with ownerId: $ownerId');
      print('OwnerService: updateData: $updateData');
      
      // Use the correct owner update endpoint
      final endpoint = ApiConstants.updateOwnerEndpoint.replaceAll(
        '{ownerId}',
        ownerId,
      );
      
      print('OwnerService: Using endpoint: $endpoint');
      print('OwnerService: Full URL will be: ${ApiConstants.baseUrl}$endpoint');

      final response = await _apiService.put(
        endpoint,
        body: updateData,
        includeAuth: true,
      );

      print('OwnerService: Response status: ${response.statusCode}');
      print('OwnerService: Response body: ${response.body}');

      return _parseResponse(response);
    } catch (e) {
      print('OwnerService: Error in updateOwner: $e');
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
