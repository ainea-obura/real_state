import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/storage_constants.dart';
import '../models/user_model.dart';
import '../utils/jwt_utils.dart';

class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  // Secure storage for sensitive data
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  // Shared preferences for non-sensitive data
  SharedPreferences? _prefs;

  // Initialize shared preferences
  Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  // === TOKEN MANAGEMENT ===

  // Store tokens securely
  Future<void> storeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _secureStorage.write(
        key: StorageConstants.accessTokenKey,
        value: accessToken,
      ),
      _secureStorage.write(
        key: StorageConstants.refreshTokenKey,
        value: refreshToken,
      ),
    ]);
  }

  // Get access token
  Future<String?> getAccessToken() async {
    final token = await _secureStorage.read(
      key: StorageConstants.accessTokenKey,
    );
    return token;
  }

  // Get refresh token
  Future<String?> getRefreshToken() async {
    final token = await _secureStorage.read(
      key: StorageConstants.refreshTokenKey,
    );
    return token;
  }

  // Update access token only
  Future<void> updateAccessToken(String accessToken) async {
    await _secureStorage.write(
      key: StorageConstants.accessTokenKey,
      value: accessToken,
    );
  }

  // Clear all tokens
  Future<void> clearTokens() async {
    await Future.wait([
      _secureStorage.delete(key: StorageConstants.accessTokenKey),
      _secureStorage.delete(key: StorageConstants.refreshTokenKey),
    ]);
  }

  // === USER DATA MANAGEMENT ===

  // Store user data
  Future<void> storeUserData(UserModel user) async {
    final userData = jsonEncode(user.toJson());
    await _secureStorage.write(
      key: StorageConstants.userDataKey,
      value: userData,
    );
  }

  // Get user data
  Future<UserModel?> getUserData() async {
    final userData = await _secureStorage.read(
      key: StorageConstants.userDataKey,
    );
    if (userData != null) {
      try {
        final userJson = jsonDecode(userData) as Map<String, dynamic>;
        return UserModel.fromJson(userJson);
      } catch (e) {
        // If parsing fails, clear corrupted data
        await clearUserData();
        return null;
      }
    }
    return null;
  }

  // Clear user data
  Future<void> clearUserData() async {
    await _secureStorage.delete(key: StorageConstants.userDataKey);
  }

  // === TOKEN EXPIRY TRACKING ===

  // Store token expiry time
  Future<void> storeTokenExpiry(DateTime expiryTime) async {
    await _prefs?.setString(
      StorageConstants.tokenExpiryKey,
      expiryTime.toIso8601String(),
    );
  }

  // Get token expiry time
  Future<DateTime?> getTokenExpiry() async {
    final expiryString = _prefs?.getString(StorageConstants.tokenExpiryKey);
    if (expiryString != null) {
      try {
        return DateTime.parse(expiryString);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // Check if token is expired using JWT validation
  Future<bool> isTokenExpired() async {
    final accessToken = await getAccessToken();
    if (accessToken == null) return true;

    // Use JWT utils to check expiration
    return JwtUtils.isTokenExpired(accessToken);
  }

  // Check if token is expiring soon (within buffer time)
  Future<bool> isTokenExpiringSoon({
    Duration buffer = const Duration(minutes: 5),
  }) async {
    final accessToken = await getAccessToken();
    if (accessToken == null) return true;

    return JwtUtils.isTokenExpiringSoon(accessToken, buffer: buffer);
  }

  // Check if token is valid (not expired and has required claims)
  Future<bool> isTokenValid() async {
    final accessToken = await getAccessToken();
    if (accessToken == null) return false;

    return JwtUtils.isTokenValid(accessToken);
  }

  // === APP PREFERENCES ===

  // Store last login email for convenience
  Future<void> storeLastLoginEmail(String email) async {
    await _prefs?.setString(StorageConstants.lastLoginEmailKey, email);
  }

  // Get last login email
  String? getLastLoginEmail() {
    return _prefs?.getString(StorageConstants.lastLoginEmailKey);
  }

  // Check if first launch
  bool isFirstLaunch() {
    return _prefs?.getBool(StorageConstants.isFirstLaunchKey) ?? true;
  }

  // Set first launch completed
  Future<void> setFirstLaunchCompleted() async {
    await _prefs?.setBool(StorageConstants.isFirstLaunchKey, false);
  }

  // === CLEAR ALL DATA ===

  // Complete logout - clear all stored data
  Future<void> clearAllData() async {
    await Future.wait([
      clearTokens(),
      clearUserData(),
      _prefs?.clear() ?? Future.value(),
    ]);
  }

  // Check if user has tokens and data (regardless of expiry)
  Future<bool> hasValidSession() async {
    final accessToken = await getAccessToken();
    final refreshToken = await getRefreshToken();
    final user = await getUserData();

    // We have a session if we have tokens and user data
    // Token expiry will be handled separately in checkAutoLogin
    final hasSession =
        accessToken != null && refreshToken != null && user != null;
    return hasSession;
  }
}
