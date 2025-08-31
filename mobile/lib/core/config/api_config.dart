class ApiConfig {
  // Base URL - Update this to match your backend
  static const String baseUrl = 'http://172.20.10.243:8000';
  static const String apiVersion = 'v1';

  // Full API URL
  static String get fullApiUrl => '$baseUrl/api/$apiVersion';

  // Request timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Headers
  static const Map<String, String> defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Token refresh buffer time (refresh 5 minutes before expiry)
  static const Duration tokenRefreshBuffer = Duration(minutes: 5);
}
