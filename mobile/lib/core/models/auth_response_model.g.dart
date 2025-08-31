// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_response_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AuthResponseModel _$AuthResponseModelFromJson(Map<String, dynamic> json) =>
    AuthResponseModel(
      accessToken: json['access_token'] as String,
      refreshToken: json['refresh_token'] as String,
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
      message: json['message'] as String?,
      error: json['error'] as bool?,
    );

Map<String, dynamic> _$AuthResponseModelToJson(AuthResponseModel instance) =>
    <String, dynamic>{
      'access_token': instance.accessToken,
      'refresh_token': instance.refreshToken,
      'user': instance.user,
      'message': instance.message,
      'error': instance.error,
    };

LoginErrorResponse _$LoginErrorResponseFromJson(Map<String, dynamic> json) =>
    LoginErrorResponse(
      error: json['error'] as bool,
      message: json['message'] as String?,
      email: json['email'] as String?,
      otpRequired: json['otp_required'] as bool?,
      emailVerified: json['email_verified'] as bool?,
      nextRequestIn: (json['next_request_in'] as num?)?.toInt(),
      page: json['page'] as String?,
      retryAfter: (json['retry_after'] as num?)?.toInt(),
    );

Map<String, dynamic> _$LoginErrorResponseToJson(LoginErrorResponse instance) =>
    <String, dynamic>{
      'error': instance.error,
      'message': instance.message,
      'email': instance.email,
      'otp_required': instance.otpRequired,
      'email_verified': instance.emailVerified,
      'next_request_in': instance.nextRequestIn,
      'page': instance.page,
      'retry_after': instance.retryAfter,
    };

RefreshTokenResponse _$RefreshTokenResponseFromJson(
  Map<String, dynamic> json,
) => RefreshTokenResponse(
  accessToken: json['access_token'] as String,
  refreshToken: json['refresh_token'] as String?,
  user: json['user'] == null
      ? null
      : UserModel.fromJson(json['user'] as Map<String, dynamic>),
  error: json['error'] as bool?,
  message: json['message'] as String?,
);

Map<String, dynamic> _$RefreshTokenResponseToJson(
  RefreshTokenResponse instance,
) => <String, dynamic>{
  'access_token': instance.accessToken,
  'refresh_token': instance.refreshToken,
  'user': instance.user,
  'error': instance.error,
  'message': instance.message,
};

PasswordResetRequest _$PasswordResetRequestFromJson(
  Map<String, dynamic> json,
) => PasswordResetRequest(email: json['email'] as String);

Map<String, dynamic> _$PasswordResetRequestToJson(
  PasswordResetRequest instance,
) => <String, dynamic>{'email': instance.email};

PasswordResetResponse _$PasswordResetResponseFromJson(
  Map<String, dynamic> json,
) => PasswordResetResponse(
  error: json['error'] as bool,
  message: json['message'] as String,
  retryAfter: (json['retry_after'] as num?)?.toInt(),
  nextRequestIn: (json['next_request_in'] as num?)?.toInt(),
);

Map<String, dynamic> _$PasswordResetResponseToJson(
  PasswordResetResponse instance,
) => <String, dynamic>{
  'error': instance.error,
  'message': instance.message,
  'retry_after': instance.retryAfter,
  'next_request_in': instance.nextRequestIn,
};

VerifyPasswordResetOtpRequest _$VerifyPasswordResetOtpRequestFromJson(
  Map<String, dynamic> json,
) => VerifyPasswordResetOtpRequest(
  email: json['email'] as String,
  otpCode: json['otp_code'] as String,
);

Map<String, dynamic> _$VerifyPasswordResetOtpRequestToJson(
  VerifyPasswordResetOtpRequest instance,
) => <String, dynamic>{'email': instance.email, 'otp_code': instance.otpCode};

VerifyPasswordResetOtpResponse _$VerifyPasswordResetOtpResponseFromJson(
  Map<String, dynamic> json,
) => VerifyPasswordResetOtpResponse(
  error: json['error'] as bool,
  message: json['message'] as String,
);

Map<String, dynamic> _$VerifyPasswordResetOtpResponseToJson(
  VerifyPasswordResetOtpResponse instance,
) => <String, dynamic>{'error': instance.error, 'message': instance.message};

ResetPasswordRequest _$ResetPasswordRequestFromJson(
  Map<String, dynamic> json,
) => ResetPasswordRequest(
  email: json['email'] as String,
  newPassword: json['new_password'] as String,
);

Map<String, dynamic> _$ResetPasswordRequestToJson(
  ResetPasswordRequest instance,
) => <String, dynamic>{
  'email': instance.email,
  'new_password': instance.newPassword,
};

ResetPasswordResponse _$ResetPasswordResponseFromJson(
  Map<String, dynamic> json,
) => ResetPasswordResponse(
  error: json['error'] as bool,
  message: json['message'] as String,
);

Map<String, dynamic> _$ResetPasswordResponseToJson(
  ResetPasswordResponse instance,
) => <String, dynamic>{'error': instance.error, 'message': instance.message};
