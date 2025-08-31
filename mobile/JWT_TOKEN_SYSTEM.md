# JWT Token Validation System

This document explains the comprehensive JWT token validation and refresh system implemented in the Real Estate Mobile app.

## Overview

The mobile app now includes a robust JWT token validation system that:
- **Proactively checks** JWT token expiration before making any API requests
- **Automatically refreshes** expired tokens using refresh tokens
- **Handles refresh token expiration** gracefully by redirecting to login
- **Prevents API calls** with expired tokens
- **Uses JWT utilities** for proper token parsing and validation

## Architecture

### 1. JWT Utilities (`lib/core/utils/jwt_utils.dart`)

Core JWT token handling functions:

```dart
class JwtUtils {
  // Decode JWT token and extract payload
  static Map<String, dynamic>? decodeToken(String token)
  
  // Check if JWT token is expired
  static bool isTokenExpired(String token)
  
  // Check if token is expiring soon (within buffer time)
  static bool isTokenExpiringSoon(String token, {Duration buffer})
  
  // Check if token is valid (not expired and has required claims)
  static bool isTokenValid(String token)
  
  // Get token expiry DateTime
  static DateTime? getTokenExpiry(String token)
}
```

### 2. Enhanced Storage Service (`lib/core/services/storage_service.dart`)

Storage service now includes JWT-aware token validation:

```dart
class StorageService {
  // Check if token is expired using JWT validation
  Future<bool> isTokenExpired()
  
  // Check if token is expiring soon (within buffer time)
  Future<bool> isTokenExpiringSoon({Duration buffer})
  
  // Check if token is valid (not expired and has required claims)
  Future<bool> isTokenValid()
}
```

### 3. Enhanced Auth Service (`lib/core/services/auth_service.dart`)

Authentication service with improved token handling:

```dart
class AuthService {
  // Enhanced auto-login with JWT validation
  Future<AuthResult> checkAutoLogin()
  
  // Improved token refresh with JWT validation
  Future<bool> refreshToken()
  
  // JWT-aware successful authentication handling
  Future<void> _handleSuccessfulAuth(AuthResponse authResponse)
}
```

### 4. Enhanced API Service (`lib/core/services/api_service.dart`)

API service with proactive token validation:

```dart
class ApiService {
  // Proactive JWT validation before every request
  Future<bool> _validateAndRefreshTokenIfNeeded()
  
  // Enhanced token refresh with JWT validation
  Future<bool> _refreshTokenIfNeeded()
  
  // All HTTP methods now validate tokens before requests
  Future<http.Response> _makeRequest(...)
}
```

## How It Works

### 1. Token Validation Flow

```
API Request → Check JWT Token → Valid? → Make Request
                    ↓
                Expired/Expiring Soon?
                    ↓
                Refresh Token → Success? → Update Tokens → Make Request
                    ↓
                Failed? → Clear Data → Redirect to Login
```

### 2. Proactive Token Checking

Before every API request, the system:

1. **Checks if the access token is valid** using JWT validation
2. **Checks if the token is expiring soon** (within 5 minutes by default)
3. **Automatically refreshes** the token if needed
4. **Only proceeds** with the API request if the token is valid
5. **Handles refresh failures** by clearing user data and redirecting to login

### 3. Token Refresh Strategy

The system uses a **proactive refresh strategy**:

- **Buffer time**: 5 minutes before expiration
- **Automatic refresh**: When token is expiring soon
- **Fallback**: Manual refresh if automatic refresh fails
- **Graceful degradation**: Redirect to login if refresh fails

## Key Features

### ✅ **Proactive Validation**
- Every API request validates JWT tokens before proceeding
- No expired tokens are sent to the backend

### ✅ **Automatic Refresh**
- Tokens are refreshed automatically when expiring soon
- Seamless user experience with no manual intervention

### ✅ **JWT Compliance**
- Proper JWT token parsing and validation
- Respects JWT expiration claims (`exp` field)

### ✅ **Error Handling**
- Graceful handling of refresh token expiration
- Automatic logout and redirect to login on failures

### ✅ **Performance Optimized**
- Token validation happens only when needed
- Efficient JWT parsing without unnecessary operations

## Usage Examples

### 1. Making API Calls

```dart
// The API service automatically handles token validation
final response = await apiService.get('/api/properties');
// Token validation happens automatically before the request
```

### 2. Manual Token Validation

```dart
// Check if current token is valid
final isValid = await storageService.isTokenValid();

// Check if token is expiring soon
final isExpiringSoon = await storageService.isTokenExpiringSoon(
  buffer: Duration(minutes: 10)
);
```

### 3. Testing JWT Functionality

```dart
// Run JWT validation tests
JwtTest.runTests();
```

## Configuration

### Buffer Time Configuration

The default buffer time for proactive token refresh is **5 minutes**. This can be customized:

```dart
// In API service
if (JwtUtils.isTokenExpiringSoon(accessToken, buffer: const Duration(minutes: 10))) {
  // Refresh token if expiring within 10 minutes
}

// In storage service
final isExpiringSoon = await storageService.isTokenExpiringSoon(
  buffer: Duration(minutes: 15)
);
```

## Security Benefits

1. **No Expired Tokens**: Prevents API calls with expired JWT tokens
2. **Automatic Refresh**: Maintains continuous user sessions
3. **Secure Storage**: Uses Flutter Secure Storage for sensitive data
4. **JWT Validation**: Proper JWT format and expiration checking
5. **Graceful Degradation**: Secure logout on authentication failures

## Error Scenarios

### 1. Access Token Expired
- System automatically attempts refresh
- If successful, continues with original request
- If failed, redirects to login

### 2. Refresh Token Expired
- System cannot refresh access token
- User data is cleared
- User is redirected to login

### 3. Network Issues During Refresh
- Refresh attempt fails
- User data is cleared
- User is redirected to login

### 4. Invalid JWT Format
- Token is rejected as invalid
- System attempts refresh
- If refresh fails, redirects to login

## Testing

The system includes comprehensive testing utilities:

```dart
// Test JWT validation with various scenarios
JwtTest.runTests();

// Test includes:
// - Valid tokens
// - Expired tokens  
// - Invalid tokens
// - Tokens expiring soon
```

## Integration Points

The JWT validation system integrates with:

1. **Splash Screen**: Uses enhanced `AuthController.checkAutoLogin()`
2. **All API Calls**: Automatic token validation before requests
3. **Authentication Flow**: Seamless token refresh during login
4. **Storage Management**: Secure token storage and validation
5. **Error Handling**: Consistent error handling across the app

## Future Enhancements

Potential improvements for the JWT system:

1. **Token Rotation**: Implement refresh token rotation for security
2. **Offline Support**: Cache tokens for offline usage
3. **Biometric Auth**: Integrate with device biometric authentication
4. **Multi-Device Sync**: Synchronize tokens across user devices
5. **Analytics**: Track token refresh patterns and failures

## Conclusion

The implemented JWT token validation system provides a robust, secure, and user-friendly authentication experience. It ensures that:

- **No expired tokens** are ever sent to the backend
- **Users stay logged in** seamlessly with automatic token refresh
- **Security is maintained** through proper JWT validation
- **User experience is smooth** with no manual token management required

The system follows security best practices and provides a solid foundation for the mobile app's authentication requirements.
