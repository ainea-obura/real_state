import 'dart:convert';
import '../../../core/services/api_service.dart';
import '../../../core/models/api_error_model.dart';
import '../models/account_model.dart';
import '../../../core/constants/api_constants.dart';

class AccountService {
  static final ApiService _apiService = ApiService();

  // Get user accounts
  static Future<List<AccountModel>> getUserAccounts(String userId) async {
    try {
      final endpoint = ApiConstants.userAccountsEndpoint.replaceAll(
        '{user_id}',
        userId,
      );

      final response = await _apiService.get(endpoint, includeAuth: true);

      // Handle the Django backend response structure
      final Map<String, dynamic> data = json.decode(response.body);

      if (data['error'] == false && data['data'] != null) {
        final responseData = data['data'];

        // Check if it's paginated or direct results
        List<dynamic> results;
        if (responseData['results'] != null) {
          // Non-paginated response
          results = responseData['results'];
        } else if (responseData['data'] != null &&
            responseData['data']['results'] != null) {
          // Paginated response
          results = responseData['data']['results'];
        } else {
          // Fallback: try to parse as direct list
          results = responseData is List ? responseData : [];
        }

        // Add logging to debug date parsing issues
        final List<AccountModel> accounts = [];
        for (int i = 0; i < results.length; i++) {
          try {
            final account = AccountModel.fromJson(results[i]);
            accounts.add(account);
          } catch (e) {
            // Continue with other accounts instead of failing completely
          }
        }

        return accounts;
      } else {
        throw Exception('Invalid response format: ${response.body}');
      }
    } catch (e) {
      if (e is ApiException) {
        throw Exception('Failed to load accounts: ${e.error.message}');
      }
      throw Exception('Failed to load accounts: $e');
    }
  }

  // Create new account
  static Future<Map<String, dynamic>> createAccount(
    CreateAccountRequest request,
  ) async {
    try {
      final response = await _apiService.post(
        ApiConstants.createAccountEndpoint,
        body: request.toJson(),
        includeAuth: true,
      );

      final Map<String, dynamic> data = json.decode(response.body);
      return {
        'success': true,
        'data': data['data'],
        'message': data['message'] ?? 'Account created successfully',
      };
    } catch (e) {
      if (e is ApiException) {
        return {
          'success': false,
          'message': 'Failed to create account: ${e.error.message}',
        };
      }
      return {'success': false, 'message': 'Failed to create account: $e'};
    }
  }

  // Update existing account
  static Future<Map<String, dynamic>> updateAccount(
    String accountId,
    UpdateAccountRequest request,
  ) async {
    try {
      final endpoint = ApiConstants.updateAccountEndpoint.replaceAll(
        '{accountId}',
        accountId,
      );

      final response = await _apiService.put(
        endpoint,
        body: request.toJson(),
        includeAuth: true,
      );

      final Map<String, dynamic> data = json.decode(response.body);
      return {
        'success': true,
        'data': data['data'],
        'message': data['message'] ?? 'Account updated successfully',
      };
    } catch (e) {
      if (e is ApiException) {
        return {
          'success': false,
          'message': 'Failed to update account: ${e.error.message}',
        };
      }
      return {'success': false, 'message': 'Failed to update account: $e'};
    }
  }

  // Delete account
  static Future<Map<String, dynamic>> deleteAccount(
    String accountId,
    String userId,
  ) async {
    try {
      final endpoint = ApiConstants.deleteAccountEndpoint.replaceAll(
        '{accountId}',
        accountId,
      );

      // For DELETE with body, we need to use a custom approach since ApiService.delete doesn't support body
      // We'll include user_id in the URL as a query parameter instead
      final endpointWithParams = '$endpoint?user_id=$userId';
      final response = await _apiService.delete(
        endpointWithParams,
        includeAuth: true,
      );

      final Map<String, dynamic> data = json.decode(response.body);
      return {
        'success': true,
        'message': data['message'] ?? 'Account deleted successfully',
      };
    } catch (e) {
      if (e is ApiException) {
        return {
          'success': false,
          'message': 'Failed to delete account: ${e.error.message}',
        };
      }
      return {'success': false, 'message': 'Failed to delete account: $e'};
    }
  }

  // Set account as default
  static Future<Map<String, dynamic>> setDefaultAccount(
    String accountId,
    String userId,
  ) async {
    // TODO: This endpoint doesn't exist in the backend yet
    // For now, return a placeholder response
    return {
      'success': false,
      'message':
          'Setting default account is not yet implemented in the backend',
    };

    // TODO: Uncomment when backend endpoint is implemented
    /*
    try {
      final endpoint = '/accounts/$accountId/default';
      final response = await _apiService.patch(
        endpoint,
        body: {'user_id': userId},
        includeAuth: true,
      );

      final Map<String, dynamic> data = json.decode(response.body);
      return {
        'success': true,
        'message': data['message'] ?? 'Default account updated successfully',
      };
    } catch (e) {
      if (e is ApiException) {
        return {
          'success': false,
          'message': 'Failed to update default account: ${e.error.message}',
        };
      }
      return {
        'success': false,
        'message': 'Failed to update default account: $e',
      };
    }
    */
  }

  // Toggle account status
  static Future<Map<String, dynamic>> toggleAccountStatus(
    String accountId,
    String userId,
    bool isActive,
  ) async {
    // TODO: This endpoint doesn't exist in the backend yet
    // For now, return a placeholder response
    return {
      'success': false,
      'message':
          'Toggling account status is not yet implemented in the backend',
    };

    // TODO: Uncomment when backend endpoint is implemented
    /*
    try {
      final endpoint = '/accounts/$accountId/status';
      final response = await _apiService.patch(
        endpoint,
        body: {'user_id': userId, 'is_active': isActive},
        includeAuth: true,
      );

      final Map<String, dynamic> data = json.decode(response.body);
      return {
        'success': true,
        'message': data['message'] ?? 'Account status updated successfully',
      };
    } catch (e) {
      if (e is ApiException) {
        return {
          'success': false,
          'message': 'Failed to update account status: ${e.error.message}',
        };
      }
      return {
        'success': false,
        'message': 'Failed to update account status: $e',
      };
    }
    */
  }
}
