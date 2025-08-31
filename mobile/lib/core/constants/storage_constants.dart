class StorageConstants {
  // Secure Storage Keys (for sensitive data)
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userDataKey = 'user_data';
  
  // Shared Preferences Keys (for non-sensitive data)
  static const String isFirstLaunchKey = 'is_first_launch';
  static const String lastLoginEmailKey = 'last_login_email';
  static const String appThemeKey = 'app_theme';
  static const String languageKey = 'language';
  
  // Token expiry tracking
  static const String tokenExpiryKey = 'token_expiry';
  static const String lastTokenRefreshKey = 'last_token_refresh';
}
