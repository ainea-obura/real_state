import 'package:get/get.dart';
import '../constants/app_constants.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';
import '../utils/toast_utils.dart';
import 'timer_controller.dart';

class AuthController extends GetxController {
  static AuthController get instance => Get.find();

  final AuthService _authService = Get.find<AuthService>();
  final StorageService _storageService = Get.find<StorageService>();

  // Lazy getter to avoid circular dependency during initialization
  TimerController get _timerController => Get.find<TimerController>();

  // Observable states
  final Rx<UserModel?> _currentUser = Rx<UserModel?>(null);
  final RxBool _isLoading = false.obs;
  final RxBool _isLoggedIn = false.obs;
  final RxString _error = ''.obs;

  // Navigation guards to prevent infinite loops
  final bool _hasInitialized = false;
  bool _isNavigating = false;
  int _autoLoginAttempts = 0;
  static const int _maxAutoLoginAttempts = 3;

  // Getters
  UserModel? get currentUser => _currentUser.value;
  bool get isLoading => _isLoading.value;
  bool get isLoggedIn => _isLoggedIn.value;
  String get error => _error.value;
  bool get isOwner => _currentUser.value?.isOwner ?? false;
  bool get isTenant => _currentUser.value?.isTenant ?? false;

  // === AUTO LOGIN ===
  Future<void> checkAutoLogin() async {
    // Prevent multiple auto-login attempts
    if (_autoLoginAttempts >= _maxAutoLoginAttempts) {
      _navigateToLogin();
      return;
    }

    _autoLoginAttempts++;
    _setLoading(true);

    try {
      final result = await _authService.checkAutoLogin();

      if (result is AuthSuccess) {
        _setUser(result.user);
        _navigateBasedOnUserType(result.user);
      } else if (result is AuthUnauthorized) {
        _navigateToUnauthorized();
      } else if (result is AuthError) {
        // If it's a token refresh failure, clear data and go to login
        if (result.message.contains('Token refresh failed')) {
          await _authService.logout();
        }
        _navigateToLogin();
      } else {
        _navigateToLogin();
      }
    } catch (e) {
      _navigateToLogin();
    } finally {
      _setLoading(false);
    }
  }

  // === LOGIN ===
  Future<void> login(String email, String password) async {
    _setLoading(true);
    _clearError();
    try {
      final result = await _authService.login(email, password);

      if (result is LoginSuccess) {
        _setUser(result.user);
        _navigateBasedOnUserType(result.user);
      } else if (result is LoginOtpRequired) {
        // Start timer with timeout from server
        final timeoutSeconds = result.timeoutSeconds ?? 60;
        _timerController.startTimer(timeoutSeconds, result.email);

        Get.toNamed(
          '/otp',
          arguments: {'email': result.email, 'message': result.message},
        );
      } else if (result is LoginError) {
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

  // === OTP VERIFICATION ===
  Future<void> verifyOtp(String email, String otpCode) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _authService.verifyOtp(email, otpCode);
      if (result is AuthSuccess) {
        _setUser(result.user);

        // Direct navigation - no flags, no delays, just like login screen
        if (result.user.isTenant) {
          Get.offAllNamed('/tenant-dashboard');
        } else if (result.user.isOwner) {
          Get.offAllNamed('/owner-dashboard');
        } else {
          Get.offAllNamed('/unauthorized');
        }
      } else if (result is AuthUnauthorized) {
        ToastUtils.showWarning('You are not authorized to use this app');
        _navigateToUnauthorized();
      } else if (result is AuthError) {
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

  // === RESEND OTP ===
  Future<void> resendOtp(String email) async {
    try {
      final result = await _authService.resendOtp(email);
      final timeoutSeconds = result['timeoutSeconds'] as int? ?? 0;

      if (result['success'] == true) {
        // Successfully sent OTP
        _timerController.resetTimer(timeoutSeconds);
        ToastUtils.showSuccess('OTP sent successfully');
      } else if (result['rateLimited'] == true) {
        // Rate limited - start timer but show rate limit message
        if (timeoutSeconds > 0) {
          _timerController.resetTimer(timeoutSeconds);
        }
        final message =
            result['message'] as String? ?? 'Please wait before retrying';
        ToastUtils.showWarning(message);
      } else {
        ToastUtils.showError('Failed to send OTP. Please try again');
      }
    } catch (e) {
      ToastUtils.showError('Failed to send OTP. Please try again');
    }
  }

  // === LOGOUT ===
  Future<void> logout() async {
    _setLoading(true);

    try {
      await _authService.logout();
      _clearUser();
      Get.offAllNamed('/login');
    } catch (e) {
      _setError('Logout failed');
    } finally {
      _setLoading(false);
    }
  }

  // === NAVIGATION HELPERS ===
  void _navigateBasedOnUserType(UserModel user) {
    if (_isNavigating) {
      return;
    }

    _isNavigating = true;
    if (!user.isAuthorized) {
      _navigateToUnauthorized();
      return;
    }

    if (user.isTenant) {
      try {
        Get.offAllNamed('/tenant-dashboard');
      } catch (e) {
        // Fallback navigation
        Get.offAllNamed('/tenant-dashboard');
      }
    } else if (user.isOwner) {
      try {
        Get.offAllNamed('/owner-dashboard');
      } catch (e) {}
    } else {
      _navigateToUnauthorized();
    }

    // Reset navigation flag after a delay
    Future.delayed(const Duration(milliseconds: 500), () {
      _isNavigating = false;
    });
  }

  void _navigateToLogin() {
    if (_isNavigating) {
      return;
    }

    _isNavigating = true;
    Get.offAllNamed('/login');

    // Reset navigation flag after a delay
    Future.delayed(const Duration(milliseconds: 500), () {
      _isNavigating = false;
    });
  }

  void _navigateToUnauthorized() {
    if (_isNavigating) {
      return;
    }

    _isNavigating = true;
    Get.offAllNamed('/unauthorized');

    // Reset navigation flag after a delay
    Future.delayed(const Duration(milliseconds: 500), () {
      _isNavigating = false;
    });
  }

  // === STATE MANAGEMENT HELPERS ===
  void _setUser(UserModel user) {
    _currentUser.value = user;
    _isLoggedIn.value = true;
    _timerController.clearTimer(); // Clear timer on successful login
    update(); // Notify GetBuilder listeners
  }

  void _clearUser() {
    _currentUser.value = null;
    _isLoggedIn.value = false;
    update(); // Notify GetBuilder listeners
  }

  void _setLoading(bool loading) {
    _isLoading.value = loading;
  }

  void _setError(String errorMessage) {
    _error.value = errorMessage;
  }

  void _clearError() {
    _error.value = '';
  }

  // === UTILITY METHODS ===
  String? getLastLoginEmail() {
    return _storageService.getLastLoginEmail();
  }

  void clearError() {
    _clearError();
  }

  // === UPDATE USER ===
  void updateUser(UserModel updatedUser) {
    _currentUser.value = updatedUser;
    update(); // Notify GetBuilder listeners

    // Also persist the updated user data to storage
    _persistUserToStorage(updatedUser);
  }

  // Persist user data to storage
  Future<void> _persistUserToStorage(UserModel user) async {
    try {
      await _storageService.storeUserData(user);
      print('AuthController: User data persisted to storage successfully');
    } catch (e) {
      print('AuthController: Failed to persist user data to storage: $e');
    }
  }

  Future<bool> updateUserProfile(UserModel updatedUser) async {
    try {
      final result = await _authService.updateUserProfile(updatedUser.toJson());
      if (result) {
        updateUser(updatedUser);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // === RESET METHODS ===
  void resetNavigationState() {
    _isNavigating = false;
  }

  void resetAutoLoginAttempts() {
    _autoLoginAttempts = 0;
  }
}
