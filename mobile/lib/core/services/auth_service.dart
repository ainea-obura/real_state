import 'dart:convert';

import '../constants/api_constants.dart';
import '../constants/app_constants.dart';
import '../models/api_error_model.dart';
import '../models/auth_response_model.dart';
import '../models/user_model.dart';
import 'api_service.dart';
import 'storage_service.dart';
import '../utils/jwt_utils.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  // === LOGIN ===

  Future<LoginResult> login(String email, String password) async {
    try {
      final response = await _apiService.post(
        ApiConstants.loginEndpoint,
        body: {'email': email, 'password': password},
        includeAuth: false,
      );

      // Login endpoint always requires OTP verification (returns 400 status)
      // No 200 status expected from login endpoint

      // Parse response to check for OTP requirement
      final errorData = jsonDecode(response.body) as Map<String, dynamic>;
      try {
        final errorResponse = LoginErrorResponse.fromJson(errorData);
      } catch (parseError) {
        // Return a generic error if parsing fails
        return LoginResult.error(
          'Login failed: ${errorData['message'] ?? 'Unknown error'}',
        );
      }

      final errorResponse = LoginErrorResponse.fromJson(errorData);

      if (errorResponse.otpRequired == true) {
        // Store email for OTP verification
        await _storageService.storeLastLoginEmail(email);
        // Extract timeout seconds from response (retry_after, next_request_in, or default)
        final timeoutSeconds =
            errorResponse.retryAfter ??
            errorResponse.nextRequestIn ??
            60; // Default 60 seconds if not provided
        return LoginResult.otpRequired(
          email,
          errorResponse.message ?? 'OTP required',
          timeoutSeconds: timeoutSeconds,
        );
      } else {
        return LoginResult.error(errorResponse.message ?? 'Login failed');
      }
    } on ApiException catch (e) {
      return LoginResult.error(e.error.message);
    } catch (e) {
      return LoginResult.error(AppConstants.genericErrorMessage);
    }
  }

  // === OTP VERIFICATION ===

  Future<AuthResult> verifyOtp(String email, String otpCode) async {
    try {
      final requestBody = {'email': email, 'otp_code': otpCode};
      final response = await _apiService.post(
        ApiConstants.verifyOtpEndpoint,
        body: requestBody,
        includeAuth: false,
      );

      if (response.statusCode == 200) {
        try {
          final responseData =
              jsonDecode(response.body) as Map<String, dynamic>;
          final authResponse = AuthResponseModel.fromJson(responseData);
        } catch (parseError) {
          return AuthResult.error('Failed to parse response: $parseError');
        }
      }

      if (response.statusCode == 200) {
        final authResponse = _apiService.handleResponse<AuthResponseModel>(
          response,
          (data) => AuthResponseModel.fromJson(data),
        );

        await _handleSuccessfulAuth(authResponse);
        return AuthResult.success(authResponse.user);
      } else {
        // Parse error response to get actual error message
        final errorData = jsonDecode(response.body) as Map<String, dynamic>;
        final errorMessage = errorData['message'] ?? 'OTP verification failed';
        return AuthResult.error(errorMessage);
      }
    } on ApiException catch (e) {
      return AuthResult.error(e.error.message);
    } catch (e) {
      return AuthResult.error(AppConstants.genericErrorMessage);
    }
  }

  // === RESEND OTP ===

  Future<Map<String, dynamic>> resendOtp(
    String email, {
    String otpType = 'verify_otp',
  }) async {
    try {
      final response = await _apiService.post(
        ApiConstants.resendOtpEndpoint,
        body: {'email': email, 'otp_type': otpType},
        includeAuth: false,
      );

      final responseData = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200) {
        // Successful resend
        final timeoutSeconds =
            responseData['retry_after'] ??
            responseData['next_request_in'] ??
            60; // Default 60 seconds

        return {'success': true, 'timeoutSeconds': timeoutSeconds};
      } else if (response.statusCode == 429) {
        // Rate limited - but we still want to start the timer
        final timeoutSeconds =
            responseData['retry_after'] ?? responseData['remaining'] ?? 60;
        final message =
            responseData['message'] ?? 'Please wait before retrying';

        return {
          'success': false,
          'timeoutSeconds': timeoutSeconds,
          'message': message,
          'rateLimited': true,
        };
      } else {
        // Check if it's actually a success message (like frontend)
        try {
          final message = responseData['message'] ?? '';

          if (message.contains('OTP sent successfully')) {
            final timeoutSeconds =
                responseData['retry_after'] ??
                responseData['next_request_in'] ??
                60; // Default 60 seconds

            return {'success': true, 'timeoutSeconds': timeoutSeconds};
          }
        } catch (e) {}

        return {'success': false, 'timeoutSeconds': 0};
      }
    } catch (e) {
      return {'success': false, 'timeoutSeconds': 0};
    }
  }

  // === AUTO LOGIN CHECK ===

  Future<AuthResult> checkAutoLogin() async {
    try {
      // Check if we have tokens stored
      final hasValidSession = await _storageService.hasValidSession();
      if (!hasValidSession) {
        return AuthResult.error('No valid session');
      }

      // Get access token and validate it
      final accessToken = await _storageService.getAccessToken();
      if (accessToken == null) {
        await logout();
        return AuthResult.error('No access token');
      }

      // Check if token is valid using JWT validation
      if (!JwtUtils.isTokenValid(accessToken)) {
        final refreshSuccessful = await refreshToken();
        if (!refreshSuccessful) {
          await logout();
          return AuthResult.error('Token refresh failed');
        }
        // Get the new token after refresh
        final newToken = await _storageService.getAccessToken();
        if (newToken == null || !JwtUtils.isTokenValid(newToken)) {
          await logout();
          return AuthResult.error('New token is invalid');
        }
      }

      // Check if token is expiring soon and refresh proactively
      if (await _storageService.isTokenExpiringSoon(
        buffer: const Duration(minutes: 10),
      )) {
        final refreshSuccessful = await refreshToken();
        if (!refreshSuccessful) {
          // Don't logout here, just log the warning
        } else {}
      }

      // Get stored user data (might be updated after refresh)
      final user = await _storageService.getUserData();
      if (user == null) {
        return AuthResult.error('No user data');
      }

      // Verify user is authorized for mobile app
      if (!user.isAuthorized) {
        await logout(); // Clear unauthorized user data
        return AuthResult.unauthorized();
      }

      return AuthResult.success(user);
    } catch (e) {
      return AuthResult.error('Auto login failed: $e');
    }
  }

  // === LOGOUT ===

  Future<void> logout() async {
    await _storageService.clearAllData();
  }

  // === TOKEN REFRESH ===

  Future<bool> refreshToken() async {
    try {
      final refreshToken = await _storageService.getRefreshToken();
      if (refreshToken == null) {
        return false;
      }

      // Check if refresh token is expired
      if (JwtUtils.isTokenExpired(refreshToken)) {
        await logout(); // Clear all data since refresh token is expired
        return false;
      }

      final response = await _apiService.post(
        ApiConstants.refreshTokenEndpoint,
        body: {'refresh_token': refreshToken},
        includeAuth: false,
      );

      final refreshResponse = _apiService.handleResponse<RefreshTokenResponse>(
        response,
        (data) => RefreshTokenResponse.fromJson(data),
      );

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
    } catch (e) {
      return false;
    }
  }

  // === PRIVATE HELPERS ===

  Future<void> _handleSuccessfulAuth(AuthResponseModel authResponse) async {
    // Store tokens
    await _storageService.storeTokens(
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
    );

    // Store user data
    await _storageService.storeUserData(authResponse.user);

    // Calculate and store token expiry using JWT utilities
    try {
      final expiry = JwtUtils.getTokenExpiry(authResponse.accessToken);
      if (expiry != null) {
        await _storageService.storeTokenExpiry(expiry);
      } else {
        // If JWT parsing fails, set default expiry
        final defaultExpiry = DateTime.now().add(AppConstants.sessionTimeout);
        await _storageService.storeTokenExpiry(defaultExpiry);
      }
    } catch (e) {
      // If JWT parsing fails, set default expiry
      final defaultExpiry = DateTime.now().add(AppConstants.sessionTimeout);
      await _storageService.storeTokenExpiry(defaultExpiry);
    }

    // Store last login email for convenience
    await _storageService.storeLastLoginEmail(authResponse.user.email);
  }

  // === CURRENT USER ===

  Future<UserModel?> getCurrentUser() async {
    return await _storageService.getUserData();
  }

  Future<bool> isLoggedIn() async {
    return await _storageService.hasValidSession();
  }

  // === UPDATE USER PROFILE ===

  Future<bool> updateUserProfile(Map<String, dynamic> updateData) async {
    try {
      final response = await _apiService.put(
        ApiConstants.updateProfileEndpoint,
        body: updateData,
        includeAuth: true,
      );

      if (response.statusCode == 200) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }
  // === PASSWORD RESET ===

  /// Request password reset OTP
  Future<PasswordResetResult> requestPasswordReset(String email) async {
    try {
      final response = await _apiService.post(
        ApiConstants.requestPasswordResetEndpoint,
        body: {'email': email},
        includeAuth: false,
      );

      final responseData = jsonDecode(response.body) as Map<String, dynamic>;
      final passwordResetResponse = PasswordResetResponse.fromJson(
        responseData,
      );

      // Match frontend logic: success when status 200 AND error field is true
      // Backend bug: returns {error: true} for successful OTP sending
      // Frontend action converts this to {error: true} and component handles it as success
      if (response.statusCode == 200) {
        if (passwordResetResponse.error) {
          // Success case (matches frontend behavior)
          final timeoutSeconds =
              passwordResetResponse.retryAfter ??
              passwordResetResponse.nextRequestIn ??
              60; // Default 60 seconds

          return PasswordResetResult.success(
            passwordResetResponse.message,
            timeoutSeconds: timeoutSeconds,
          );
        } else {
          // This would be an error case (error: false with 200 status)
          return PasswordResetResult.error(passwordResetResponse.message);
        }
      } else {
        // Non-200 status code
        return PasswordResetResult.error(passwordResetResponse.message);
      }
    } catch (e) {
      return PasswordResetResult.error(
        'Failed to send password reset OTP. Please try again.',
      );
    }
  }

  /// Verify password reset OTP
  Future<PasswordResetOtpResult> verifyPasswordResetOtp(
    String email,
    String otpCode,
  ) async {
    try {
      final response = await _apiService.post(
        ApiConstants.verifyPasswordResetOtpEndpoint,
        body: {'email': email, 'otp_code': otpCode},
        includeAuth: false,
      );

      final responseData = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode == 200) {
        final verifyResponse = VerifyPasswordResetOtpResponse.fromJson(
          responseData,
        );

        if (!verifyResponse.error) {
          return PasswordResetOtpResult.success(verifyResponse.message);
        } else {
          return PasswordResetOtpResult.error(verifyResponse.message);
        }
      } else {
        // Parse error message from response
        final message = responseData['message'] as String? ?? 'Invalid OTP';
        return PasswordResetOtpResult.error(message);
      }
    } catch (e) {
      return PasswordResetOtpResult.error(
        'Failed to verify OTP. Please try again.',
      );
    }
  }

  /// Reset password with new password
  Future<ResetPasswordResult> resetPassword(
    String email,
    String newPassword,
  ) async {
    try {
      final response = await _apiService.post(
        ApiConstants.resetPasswordEndpoint,
        body: {'email': email, 'new_password': newPassword},
        includeAuth: false,
      );

      final responseData = jsonDecode(response.body) as Map<String, dynamic>;
      final resetResponse = ResetPasswordResponse.fromJson(responseData);

      if (response.statusCode == 200 && !resetResponse.error) {
        return ResetPasswordResult.success(resetResponse.message);
      } else {
        return ResetPasswordResult.error(resetResponse.message);
      }
    } catch (e) {
      return ResetPasswordResult.error(
        'Failed to reset password. Please try again.',
      );
    }
  }

  /// Change password for authenticated user
  Future<ChangePasswordResult> changePassword(
    String currentPassword,
    String newPassword,
    String confirmPassword,
  ) async {
    try {
      final response = await _apiService.post(
        ApiConstants.changePasswordEndpoint,
        body: {
          'current_password': currentPassword,
          'new_password': newPassword,
          'confirm_password': confirmPassword,
        },
        includeAuth: true,
      );

      final responseData = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200 && !responseData['error']) {
        return ChangePasswordResult.success(
          responseData['message'] ?? 'Password changed successfully',
        );
      } else {
        final message = responseData['message'] ?? 'Failed to change password';
        return ChangePasswordResult.error(message);
      }
    } catch (e) {
      return ChangePasswordResult.error(
        'Failed to change password. Please try again.',
      );
    }
  }
}

// === RESULT CLASSES ===

abstract class LoginResult {
  const LoginResult();

  factory LoginResult.success(UserModel user) = LoginSuccess;
  factory LoginResult.otpRequired(
    String email,
    String message, {
    int? timeoutSeconds,
  }) = LoginOtpRequired;
  factory LoginResult.error(String message) = LoginError;
}

class LoginSuccess extends LoginResult {
  final UserModel user;
  const LoginSuccess(this.user);
}

class LoginOtpRequired extends LoginResult {
  final String email;
  final String message;
  final int? timeoutSeconds;
  const LoginOtpRequired(this.email, this.message, {this.timeoutSeconds});
}

class LoginError extends LoginResult {
  final String message;
  const LoginError(this.message);
}

abstract class AuthResult {
  const AuthResult();

  factory AuthResult.success(UserModel user) = AuthSuccess;
  factory AuthResult.error(String message) = AuthError;
  factory AuthResult.unauthorized() = AuthUnauthorized;
}

class AuthSuccess extends AuthResult {
  final UserModel user;
  const AuthSuccess(this.user);
}

class AuthError extends AuthResult {
  final String message;
  const AuthError(this.message);
}

class AuthUnauthorized extends AuthResult {
  const AuthUnauthorized();
}

// === PASSWORD RESET RESULT CLASSES ===

abstract class PasswordResetResult {
  const PasswordResetResult();

  factory PasswordResetResult.success(String message, {int? timeoutSeconds}) =
      PasswordResetSuccess;
  factory PasswordResetResult.error(String message) = PasswordResetError;
}

class PasswordResetSuccess extends PasswordResetResult {
  final String message;
  final int? timeoutSeconds;
  const PasswordResetSuccess(this.message, {this.timeoutSeconds});
}

class PasswordResetError extends PasswordResetResult {
  final String message;
  const PasswordResetError(this.message);
}

abstract class PasswordResetOtpResult {
  const PasswordResetOtpResult();

  factory PasswordResetOtpResult.success(String message) =
      PasswordResetOtpSuccess;
  factory PasswordResetOtpResult.error(String message) = PasswordResetOtpError;
}

class PasswordResetOtpSuccess extends PasswordResetOtpResult {
  final String message;
  const PasswordResetOtpSuccess(this.message);
}

class PasswordResetOtpError extends PasswordResetOtpResult {
  final String message;
  const PasswordResetOtpError(this.message);
}

abstract class ResetPasswordResult {
  const ResetPasswordResult();

  factory ResetPasswordResult.success(String message) = ResetPasswordSuccess;
  factory ResetPasswordResult.error(String message) = ResetPasswordError;
}

class ResetPasswordSuccess extends ResetPasswordResult {
  final String message;
  const ResetPasswordSuccess(this.message);
}

class ResetPasswordError extends ResetPasswordResult {
  final String message;
  const ResetPasswordError(this.message);
}

abstract class ChangePasswordResult {
  const ChangePasswordResult();

  factory ChangePasswordResult.success(String message) = ChangePasswordSuccess;
  factory ChangePasswordResult.error(String message) = ChangePasswordError;
}

class ChangePasswordSuccess extends ChangePasswordResult {
  final String message;
  const ChangePasswordSuccess(this.message);
}

class ChangePasswordError extends ChangePasswordResult {
  final String message;
  const ChangePasswordError(this.message);
}
