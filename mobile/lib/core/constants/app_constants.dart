class AppConstants {
  // App Info
  static const String appName = 'Real Estate Mobile';
  static const String appVersion = '1.0.0';

  // API Configuration
  static const String apiBaseUrl =
      'https://api.realestate.com'; // Replace with actual API URL

  // User Types (must match backend)
  static const String userTypeOwner = 'owner';
  static const String userTypeTenant = 'tenant';
  static const List<String> allowedUserTypes = [userTypeOwner, userTypeTenant];

  // OTP Configuration
  static const int otpLength = 6;
  static const Duration otpResendDelay = Duration(seconds: 60);

  // Session Configuration
  static const Duration sessionTimeout = Duration(hours: 7);

  // UI Constants
  static const double defaultPadding = 16.0;
  static const double defaultBorderRadius = 8.0;
  static const Duration animationDuration = Duration(milliseconds: 300);

  // Error Messages
  static const String networkErrorMessage =
      'Please check your internet connection';
  static const String unauthorizedMessage =
      'You are not authorized to use this app';
  static const String sessionExpiredMessage =
      'Your session has expired. Please login again';
  static const String genericErrorMessage =
      'Something went wrong. Please try again';
}
