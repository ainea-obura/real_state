import 'package:json_annotation/json_annotation.dart';
import 'user_model.dart';

part 'auth_response_model.g.dart';

@JsonSerializable()
class AuthResponseModel {
  @JsonKey(name: 'access_token')
  final String accessToken;
  @JsonKey(name: 'refresh_token')
  final String refreshToken;
  final UserModel user;
  final String? message;
  final bool? error;

  const AuthResponseModel({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
    this.message,
    this.error,
  });

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) =>
      _$AuthResponseModelFromJson(json);
  Map<String, dynamic> toJson() => _$AuthResponseModelToJson(this);
}

@JsonSerializable()
class LoginErrorResponse {
  final bool error;
  final String? message;
  final String? email;
  @JsonKey(name: 'otp_required')
  final bool? otpRequired;
  @JsonKey(name: 'email_verified')
  final bool? emailVerified;
  @JsonKey(name: 'next_request_in')
  final int? nextRequestIn;
  final String? page;
  @JsonKey(name: 'retry_after')
  final int? retryAfter;

  const LoginErrorResponse({
    required this.error,
    this.message,
    this.email,
    this.otpRequired,
    this.emailVerified,
    this.nextRequestIn,
    this.page,
    this.retryAfter,
  });

  factory LoginErrorResponse.fromJson(Map<String, dynamic> json) =>
      _$LoginErrorResponseFromJson(json);
  Map<String, dynamic> toJson() => _$LoginErrorResponseToJson(this);
}

@JsonSerializable()
class RefreshTokenResponse {
  @JsonKey(name: 'access_token')
  final String accessToken;
  @JsonKey(name: 'refresh_token')
  final String? refreshToken;
  final UserModel? user;
  final bool? error;
  final String? message;

  const RefreshTokenResponse({
    required this.accessToken,
    this.refreshToken,
    this.user,
    this.error,
    this.message,
  });

  factory RefreshTokenResponse.fromJson(Map<String, dynamic> json) =>
      _$RefreshTokenResponseFromJson(json);
  Map<String, dynamic> toJson() => _$RefreshTokenResponseToJson(this);
}

// Password Reset Models
@JsonSerializable()
class PasswordResetRequest {
  final String email;

  const PasswordResetRequest({required this.email});

  factory PasswordResetRequest.fromJson(Map<String, dynamic> json) =>
      _$PasswordResetRequestFromJson(json);
  Map<String, dynamic> toJson() => _$PasswordResetRequestToJson(this);
}

@JsonSerializable()
class PasswordResetResponse {
  final bool error;
  final String message;
  @JsonKey(name: 'retry_after')
  final int? retryAfter;
  @JsonKey(name: 'next_request_in')
  final int? nextRequestIn;

  const PasswordResetResponse({
    required this.error,
    required this.message,
    this.retryAfter,
    this.nextRequestIn,
  });

  factory PasswordResetResponse.fromJson(Map<String, dynamic> json) =>
      _$PasswordResetResponseFromJson(json);
  Map<String, dynamic> toJson() => _$PasswordResetResponseToJson(this);
}

@JsonSerializable()
class VerifyPasswordResetOtpRequest {
  final String email;
  @JsonKey(name: 'otp_code')
  final String otpCode;

  const VerifyPasswordResetOtpRequest({
    required this.email,
    required this.otpCode,
  });

  factory VerifyPasswordResetOtpRequest.fromJson(Map<String, dynamic> json) =>
      _$VerifyPasswordResetOtpRequestFromJson(json);
  Map<String, dynamic> toJson() => _$VerifyPasswordResetOtpRequestToJson(this);
}

@JsonSerializable()
class VerifyPasswordResetOtpResponse {
  final bool error;
  final String message;

  const VerifyPasswordResetOtpResponse({
    required this.error,
    required this.message,
  });

  factory VerifyPasswordResetOtpResponse.fromJson(Map<String, dynamic> json) =>
      _$VerifyPasswordResetOtpResponseFromJson(json);
  Map<String, dynamic> toJson() => _$VerifyPasswordResetOtpResponseToJson(this);
}

@JsonSerializable()
class ResetPasswordRequest {
  final String email;
  @JsonKey(name: 'new_password')
  final String newPassword;

  const ResetPasswordRequest({required this.email, required this.newPassword});

  factory ResetPasswordRequest.fromJson(Map<String, dynamic> json) =>
      _$ResetPasswordRequestFromJson(json);
  Map<String, dynamic> toJson() => _$ResetPasswordRequestToJson(this);
}

@JsonSerializable()
class ResetPasswordResponse {
  final bool error;
  final String message;

  const ResetPasswordResponse({required this.error, required this.message});

  factory ResetPasswordResponse.fromJson(Map<String, dynamic> json) =>
      _$ResetPasswordResponseFromJson(json);
  Map<String, dynamic> toJson() => _$ResetPasswordResponseToJson(this);
}
