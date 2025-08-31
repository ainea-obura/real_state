import 'package:json_annotation/json_annotation.dart';

part 'api_error_model.g.dart';

@JsonSerializable()
class ApiErrorModel {
  final bool error;
  final String message;
  final int? statusCode;
  final Map<String, dynamic>? details;

  const ApiErrorModel({
    required this.error,
    required this.message,
    this.statusCode,
    this.details,
  });

  factory ApiErrorModel.fromJson(Map<String, dynamic> json) => 
      _$ApiErrorModelFromJson(json);
  Map<String, dynamic> toJson() => _$ApiErrorModelToJson(this);

  // Factory constructors for common errors
  factory ApiErrorModel.networkError() => const ApiErrorModel(
    error: true,
    message: 'Please check your internet connection',
    statusCode: 0,
  );

  factory ApiErrorModel.serverError() => const ApiErrorModel(
    error: true,
    message: 'Server error occurred. Please try again later',
    statusCode: 500,
  );

  factory ApiErrorModel.unauthorized() => const ApiErrorModel(
    error: true,
    message: 'You are not authorized to access this resource',
    statusCode: 401,
  );

  factory ApiErrorModel.sessionExpired() => const ApiErrorModel(
    error: true,
    message: 'Your session has expired. Please login again',
    statusCode: 401,
  );

  factory ApiErrorModel.badRequest(String message) => ApiErrorModel(
    error: true,
    message: message,
    statusCode: 400,
  );

  factory ApiErrorModel.custom(String message, {int? statusCode}) => ApiErrorModel(
    error: true,
    message: message,
    statusCode: statusCode,
  );
}

// Exception class for API errors
class ApiException implements Exception {
  final ApiErrorModel error;

  const ApiException(this.error);

  @override
  String toString() => 'ApiException: ${error.message}';
}
