import 'package:get/get.dart';

import '../constants/app_constants.dart';
import '../routes/app_routes.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';
import '../utils/toast_utils.dart';
import 'timer_controller.dart';

class ForgotPasswordController extends GetxController {
  final AuthService _authService = AuthService();
  final StorageService _storageService = StorageService();

  // Reactive variables
  final RxBool _isLoading = false.obs;
  final RxString _error = ''.obs;
  final RxString _email = ''.obs;

  // Getters
  bool get isLoading => _isLoading.value;
  String get error => _error.value;
  String get email => _email.value;

  // Timer controller for OTP resend
  TimerController get _timerController => Get.find<TimerController>();



  // === PRIVATE METHODS ===

  void _setLoading(bool loading) {
    _isLoading.value = loading;
  }

  void _setError(String error) {
    _error.value = error;
  }

  void _clearError() {
    _error.value = '';
  }

  void _setEmail(String email) {
    _email.value = email;
  }

  // === PUBLIC METHODS ===

  /// Request password reset OTP
  Future<void> requestPasswordReset(String email) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _authService.requestPasswordReset(email);

      if (result is PasswordResetSuccess) {
        _setEmail(email);

        // Start timer if timeout provided
        if (result.timeoutSeconds != null && result.timeoutSeconds! > 0) {
          _timerController.resetTimer(result.timeoutSeconds!);
        }

        ToastUtils.showSuccess(result.message);

        // Navigate to OTP verification screen
        Get.toNamed(AppRoutes.forgotPasswordOtp, arguments: {'email': email});
      } else if (result is PasswordResetError) {
        _setError(result.message);
        ToastUtils.showError(result.message);
      }
    } catch (e) {
      _setError(AppConstants.genericErrorMessage);
      ToastUtils.showError(AppConstants.genericErrorMessage);
    } finally {
      _setLoading(false);
    }
  }

  /// Verify password reset OTP
  Future<void> verifyPasswordResetOtp(String email, String otpCode) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _authService.verifyPasswordResetOtp(email, otpCode);

      if (result is PasswordResetOtpSuccess) {
        // Clear timer
        _timerController.clearTimer();

        ToastUtils.showSuccess(result.message);

        // Navigate to reset password screen
        Get.toNamed(AppRoutes.resetPassword, arguments: {'email': email});
      } else if (result is PasswordResetOtpError) {
        _setError(result.message);
        ToastUtils.showError(result.message);
      }
    } catch (e) {
      _setError(AppConstants.genericErrorMessage);
      ToastUtils.showError(AppConstants.genericErrorMessage);
    } finally {
      _setLoading(false);
    }
  }

  /// Resend password reset OTP
  Future<void> resendPasswordResetOtp(String email) async {
    try {
      final result = await _authService.requestPasswordReset(email);

      if (result is PasswordResetSuccess) {
        // Start timer if timeout provided
        if (result.timeoutSeconds != null && result.timeoutSeconds! > 0) {
          _timerController.resetTimer(result.timeoutSeconds!);
        }

        ToastUtils.showSuccess(result.message);
      } else if (result is PasswordResetError) {
        ToastUtils.showError(result.message);
      }
    } catch (e) {
      ToastUtils.showError('Failed to resend OTP. Please try again.');
    }
  }

  /// Reset password with new password
  Future<void> resetPassword(String email, String newPassword) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _authService.resetPassword(email, newPassword);

      if (result is ResetPasswordSuccess) {
        ToastUtils.showSuccess(result.message);

        // Clear all forgot password data
        clearData();

        // Navigate back to login screen
        Get.offAllNamed(AppRoutes.login);
        } else if (result is ResetPasswordError) {
        _setError(result.message);
        ToastUtils.showError(result.message);
      }
    } catch (e) {
      _setError(AppConstants.genericErrorMessage);
      ToastUtils.showError(AppConstants.genericErrorMessage);
    } finally {
      _setLoading(false);
    }
  }

  /// Clear all data (for navigation cleanup)
  void clearData() {
    _setEmail('');
    _clearError();
    _setLoading(false);
    _timerController.clearTimer();
  }
}
