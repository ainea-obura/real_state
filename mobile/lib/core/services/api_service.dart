import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:get/get.dart';

import '../constants/api_constants.dart';
import '../models/api_error_model.dart';
import '../models/auth_response_model.dart';
import 'storage_service.dart';
import '../utils/jwt_utils.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final StorageService _storageService = StorageService();
  final http.Client _client = http.Client();

  // === NETWORK CONNECTIVITY ===

  Future<bool> _hasNetworkConnection() async {
    // Temporarily bypass connectivity check to debug the issue
    return true;

    // Original code:
    // final connectivityResult = await Connectivity().checkConnectivity();
    // return connectivityResult != ConnectivityResult.none;
  }

  // === GLOBAL LOGOUT HANDLING ===

  void _triggerGlobalLogout() {
    // Use GetX to trigger global logout
    try {
      // Navigate to login screen and clear navigation stack
      Get.offAllNamed('/auth/sign-in');
    } catch (e) {
      print('Error triggering global logout: $e');
    }
  }

  // === HTTP CLIENT WITH INTERCEPTORS ===

  Future<Map<String, String>> _getHeaders({bool includeAuth = true}) async {
    final headers = Map<String, String>.from(ApiConstants.defaultHeaders);

    if (includeAuth) {
      final accessToken = await _storageService.getAccessToken();
      if (accessToken != null) {
        headers['Authorization'] = 'Bearer $accessToken';
      }
    }

    return headers;
  }

  // === TOKEN REFRESH LOGIC ===

  /// Validate JWT token and refresh if needed before making requests
  Future<bool> _validateAndRefreshTokenIfNeeded() async {
    try {
      // Get current access token
      final accessToken = await _storageService.getAccessToken();
      if (accessToken == null) {
        return false;
      }

      // Check if token is valid using JWT utilities
      if (JwtUtils.isTokenValid(accessToken)) {
        // Check if token is expiring soon (within buffer time)
        if (JwtUtils.isTokenExpiringSoon(
          accessToken,
          buffer: const Duration(minutes: 5),
        )) {
          return await _refreshTokenIfNeeded();
        }
        // Token is valid and not expiring soon
        return true;
      }

      // Token is expired, try to refresh
      return await _refreshTokenIfNeeded();
    } catch (e) {
      return false;
    }
  }

  Future<bool> _refreshTokenIfNeeded() async {
    try {
      // Get current access token
      final accessToken = await _storageService.getAccessToken();
      if (accessToken == null) {
        return false;
      }

      // Check if token is valid using JWT validation
      if (JwtUtils.isTokenValid(accessToken)) {
        // Check if token is expiring soon and refresh proactively
        if (JwtUtils.isTokenExpiringSoon(
          accessToken,
          buffer: const Duration(minutes: 5),
        )) {
          // Token is expiring soon, need to refresh
        } else {
          return true; // Token is valid and not expiring soon
        }
      } else {
        // Token is invalid, need to refresh
      }

      // Get refresh token
      final refreshToken = await _storageService.getRefreshToken();
      if (refreshToken == null) {
        return false;
      }

      // Check if refresh token is expired
      if (JwtUtils.isTokenExpired(refreshToken)) {
        return false;
      }

      // Call refresh endpoint - use direct HTTP to avoid circular dependency
      final refreshUrl = Uri.parse(
        '${ApiConstants.baseUrl}${ApiConstants.refreshTokenEndpoint}',
      );
      final response = await _client
          .post(
            refreshUrl,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'refresh_token': refreshToken}),
          )
          .timeout(ApiConstants.receiveTimeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final refreshResponse = RefreshTokenResponse.fromJson(data);

        // Validate the new access token
        if (!JwtUtils.isTokenValid(refreshResponse.accessToken)) {
          return false;
        }

        // Update stored tokens
        await _storageService.updateAccessToken(refreshResponse.accessToken);

        if (refreshResponse.refreshToken != null) {
          // Validate the new refresh token if provided
          if (JwtUtils.isTokenValid(refreshResponse.refreshToken!)) {
            await _storageService.storeTokens(
              accessToken: refreshResponse.accessToken,
              refreshToken: refreshResponse.refreshToken!,
            );
          } else {
            // Keep the old refresh token if the new one is invalid
            await _storageService.storeTokens(
              accessToken: refreshResponse.accessToken,
              refreshToken: refreshToken,
            );
          }
        }

        // Update user data if provided
        if (refreshResponse.user != null) {
          await _storageService.storeUserData(refreshResponse.user!);
        }

        // Store the new token expiry
        final newTokenExpiry = JwtUtils.getTokenExpiry(
          refreshResponse.accessToken,
        );
        if (newTokenExpiry != null) {
          await _storageService.storeTokenExpiry(newTokenExpiry);
        }

        return true;
      } else {
        // Refresh failed
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  // === CORE HTTP METHODS ===

  Future<http.Response> _makeRequest(
    String method,
    String endpoint, {
    Map<String, dynamic>? body,
    bool includeAuth = true,
    bool retryOnTokenExpiry = true,
  }) async {
    // Check network connectivity
    if (!await _hasNetworkConnection()) {
      throw ApiException(ApiErrorModel.networkError());
    }

    // Proactive JWT token validation for authenticated requests
    if (includeAuth) {
      final tokenValidationResult = await _validateAndRefreshTokenIfNeeded();
      if (!tokenValidationResult) {
        // Token validation/refresh failed, user needs to login again
        await _storageService.clearAllData();
        // Trigger global logout instead of throwing exception
        _triggerGlobalLogout();
        throw ApiException(ApiErrorModel.sessionExpired());
      }
    }

    final url = Uri.parse('${ApiConstants.baseUrl}$endpoint');
    final headers = await _getHeaders(includeAuth: includeAuth);

    http.Response response;

    try {
      switch (method.toUpperCase()) {
        case 'GET':
          response = await _client
              .get(url, headers: headers)
              .timeout(ApiConstants.receiveTimeout);
          break;
        case 'POST':
          response = await _client
              .post(
                url,
                headers: headers,
                body: body != null ? jsonEncode(body) : null,
              )
              .timeout(ApiConstants.receiveTimeout);
          break;
        case 'PUT':
          response = await _client
              .put(
                url,
                headers: headers,
                body: body != null ? jsonEncode(body) : null,
              )
              .timeout(ApiConstants.receiveTimeout);
          break;
        case 'PATCH':
          response = await _client
              .patch(
                url,
                headers: headers,
                body: body != null ? jsonEncode(body) : null,
              )
              .timeout(ApiConstants.receiveTimeout);
          break;
        case 'DELETE':
          response = await _client
              .delete(url, headers: headers)
              .timeout(ApiConstants.receiveTimeout);
          break;
        default:
          throw ApiException(
            ApiErrorModel.custom('Unsupported HTTP method: $method'),
          );
      }

      // Handle token expiry and retry
      if (response.statusCode == 401 && includeAuth && retryOnTokenExpiry) {
        final tokenRefreshed = await _refreshTokenIfNeeded();
        if (tokenRefreshed) {
          // Retry the request with new token
          return _makeRequest(
            method,
            endpoint,
            body: body,
            includeAuth: includeAuth,
            retryOnTokenExpiry: false, // Prevent infinite retry
          );
        } else {
          // Refresh failed, user needs to login again
          await _storageService.clearAllData();
          // Trigger global logout
          _triggerGlobalLogout();
          throw ApiException(ApiErrorModel.sessionExpired());
        }
      }

      return response;
    } on SocketException {
      throw ApiException(ApiErrorModel.networkError());
    } on HttpException catch (e) {
      throw ApiException(ApiErrorModel.custom(e.message));
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(ApiErrorModel.custom(e.toString()));
    }
  }

  // === PUBLIC API METHODS ===

  Future<http.Response> get(String endpoint, {bool includeAuth = true}) async {
    return _makeRequest('GET', endpoint, includeAuth: includeAuth);
  }

  Future<http.Response> post(
    String endpoint, {
    Map<String, dynamic>? body,
    bool includeAuth = true,
  }) async {
    return _makeRequest('POST', endpoint, body: body, includeAuth: includeAuth);
  }

  Future<http.Response> put(
    String endpoint, {
    Map<String, dynamic>? body,
    bool includeAuth = true,
  }) async {
    return _makeRequest('PUT', endpoint, body: body, includeAuth: includeAuth);
  }

  Future<http.Response> patch(
    String endpoint, {
    Map<String, dynamic>? body,
    bool includeAuth = true,
  }) async {
    return _makeRequest(
      'PATCH',
      endpoint,
      body: body,
      includeAuth: includeAuth,
    );
  }

  Future<http.Response> delete(
    String endpoint, {
    bool includeAuth = true,
  }) async {
    return _makeRequest('DELETE', endpoint, includeAuth: includeAuth);
  }

  // Get auth token for external use
  Future<String?> getAuthToken() async {
    return await _storageService.getAccessToken();
  }

  // === VERIFICATION METHODS ===

  Future<Map<String, dynamic>> getVerificationDocuments(
    String userId,
    String userType,
  ) async {
    try {
      print('🔍 ApiService: Calling verification API');
      print('🔍 ApiService: User ID: $userId, User Type: $userType');

      // Use _makeRequest directly to ensure global token handling
      final response = await _makeRequest(
        'GET',
        '${ApiConstants.verificationListEndpoint}?user_id=$userId&user_type=$userType',
        includeAuth: true,
      );

      print('🔍 ApiService: Response status: ${response.statusCode}');
      print('🔍 ApiService: Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        print('🔍 ApiService: Parsed data: $data');
        print('🔍 ApiService: Data keys: ${data.keys.toList()}');
        final result = {'success': true, 'data': data};
        print('🔍 ApiService: Returning result: $result');
        return result;
      } else {
        final errorData = jsonDecode(response.body) as Map<String, dynamic>;
        print('🔍 ApiService: Error response: $errorData');
        final result = {
          'success': false,
          'error': errorData['message'] ?? 'Failed to load documents',
        };
        print('🔍 ApiService: Returning error result: $result');
        return result;
      }
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> uploadVerificationDocument({
    required String userId,
    required String userType,
    required String category,
    required String idNumber,
    required File documentImage,
    File? userImage,
  }) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse(
          '${ApiConstants.baseUrl}${ApiConstants.verificationUploadEndpoint}',
        ),
      );

      // Add headers
      final token = await _storageService.getAccessToken();
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      // Add fields
      request.fields['user_id'] = userId;
      request.fields['user_type'] = userType;
      request.fields['category'] = category;
      request.fields['id_number'] = idNumber;

      // Add document image
      request.files.add(
        await http.MultipartFile.fromPath('document_image', documentImage.path),
      );

      // Add user image if provided
      if (userImage != null) {
        request.files.add(
          await http.MultipartFile.fromPath('user_image', userImage.path),
        );
      }

      final streamedResponse = await _client.send(request);
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return {'success': true, 'data': data};
      } else {
        final errorData = jsonDecode(response.body) as Map<String, dynamic>;
        return {
          'success': false,
          'error': errorData['message'] ?? 'Upload failed',
        };
      }
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  // === RESPONSE HANDLING ===

  T handleResponse<T>(
    http.Response response,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      try {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return fromJson(data);
      } catch (e) {
        throw ApiException(
          ApiErrorModel.custom('Failed to parse response: $e'),
        );
      }
    } else {
      try {
        final errorData = jsonDecode(response.body) as Map<String, dynamic>;
        throw ApiException(ApiErrorModel.fromJson(errorData));
      } catch (e) {
        throw ApiException(
          ApiErrorModel.custom(
            'HTTP ${response.statusCode}: ${response.reasonPhrase}',
            statusCode: response.statusCode,
          ),
        );
      }
    }
  }

  // === CLEANUP ===

  void dispose() {
    _client.close();
  }
}
