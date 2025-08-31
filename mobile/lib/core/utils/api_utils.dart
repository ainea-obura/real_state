import 'package:get/get.dart';
import '../services/storage_service.dart';

class ApiUtils {
  static final StorageService _storageService = Get.find<StorageService>();

  /// Get authentication headers with access token
  static Future<Map<String, String>> getAuthHeaders() async {
    final token = await _storageService.getAccessToken();
    
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  /// Get headers without authentication (for public endpoints)
  static Map<String, String> getPublicHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /// Get headers with custom content type
  static Future<Map<String, String>> getHeadersWithContentType(String contentType) async {
    final headers = await getAuthHeaders();
    headers['Content-Type'] = contentType;
    return headers;
  }

  /// Check if user is authenticated
  static Future<bool> isAuthenticated() async {
    final token = await _storageService.getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// Get current user ID from storage
  static Future<String?> getCurrentUserId() async {
    final userData = await _storageService.getUserData();
    return userData?.id;
  }

  /// Get current user type from storage
  static Future<String?> getCurrentUserType() async {
    final userData = await _storageService.getUserData();
    if (userData?.isOwner == true) {
      return 'owner';
    } else if (userData?.isTenant == true) {
      return 'tenant';
    }
    return null;
  }
} 