import 'dart:convert';

class JwtUtils {
  /// Decode JWT token and extract payload
  static Map<String, dynamic>? decodeToken(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) {
        return null;
      }

      // Decode the payload part (second part)
      final payload = parts[1];
      final normalized = base64Url.normalize(payload);
      final resp = utf8.decode(base64Url.decode(normalized));
      final payloadMap = json.decode(resp) as Map<String, dynamic>;

      return payloadMap;
    } catch (e) {
      return null;
    }
  }

  /// Check if JWT token is expired
  static bool isTokenExpired(String token) {
    try {
      final payload = decodeToken(token);
      if (payload == null) {
        return true;
      }

      final exp = payload['exp'];
      if (exp == null) {
        return true;
      }

      // JWT exp is in seconds, convert to milliseconds
      final expiryTime = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
      final now = DateTime.now();

      return now.isAfter(expiryTime);
    } catch (e) {
      return true;
    }
  }

  /// Check if JWT token will expire within a buffer time
  static bool isTokenExpiringSoon(
    String token, {
    Duration buffer = const Duration(minutes: 5),
  }) {
    try {
      final payload = decodeToken(token);
      if (payload == null) {
        return true;
      }

      final exp = payload['exp'];
      if (exp == null) {
        return true;
      }

      // JWT exp is in seconds, convert to milliseconds
      final expiryTime = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
      final now = DateTime.now();
      final bufferTime = expiryTime.subtract(buffer);

      return now.isAfter(bufferTime);
    } catch (e) {
      return true;
    }
  }

  /// Get token expiration time
  static DateTime? getTokenExpiry(String token) {
    try {
      final payload = decodeToken(token);
      if (payload == null) return null;

      final exp = payload['exp'];
      if (exp == null) return null;

      // JWT exp is in seconds, convert to milliseconds
      return DateTime.fromMillisecondsSinceEpoch(exp * 1000);
    } catch (e) {
      return null;
    }
  }

  /// Get token issued at time
  static DateTime? getTokenIssuedAt(String token) {
    try {
      final payload = decodeToken(token);
      if (payload == null) return null;

      final iat = payload['iat'];
      if (iat == null) return null;

      // JWT iat is in seconds, convert to milliseconds
      return DateTime.fromMillisecondsSinceEpoch(iat * 1000);
    } catch (e) {
      return null;
    }
  }

  /// Get user ID from token
  static String? getUserId(String token) {
    try {
      final payload = decodeToken(token);
      if (payload == null) return null;

      return payload['user_id']?.toString();
    } catch (e) {
      return null;
    }
  }

  /// Get user type from token
  static String? getUserType(String token) {
    try {
      final payload = decodeToken(token);
      if (payload == null) return null;

      return payload['user_type']?.toString();
    } catch (e) {
      return null;
    }
  }

  /// Check if token is valid (not expired and has required claims)
  static bool isTokenValid(String token) {
    try {
      if (isTokenExpired(token)) {
        return false;
      }

      final payload = decodeToken(token);
      if (payload == null) {
        return false;
      }

      // Check for required claims
      final hasUserId = payload['user_id'] != null;
      final hasExp = payload['exp'] != null;

      final isValid = hasUserId && hasExp;
      return isValid;
    } catch (e) {
      return false;
    }
  }

  /// Get time until token expires
  static Duration? getTimeUntilExpiry(String token) {
    try {
      final expiry = getTokenExpiry(token);
      if (expiry == null) return null;

      final now = DateTime.now();
      if (now.isAfter(expiry)) return Duration.zero;

      return expiry.difference(now);
    } catch (e) {
      return null;
    }
  }
}
