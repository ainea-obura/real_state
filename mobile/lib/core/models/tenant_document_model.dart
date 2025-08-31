import 'package:json_annotation/json_annotation.dart';

part 'tenant_document_model.g.dart';

@JsonSerializable()
class TenantDocument {
  final String id;
  @JsonKey(name: 'template_title_snapshot')
  final String templateTitleSnapshot;
  final String status;
  @JsonKey(name: 'created_at')
  final String createdAt;
  @JsonKey(name: 'document_url')
  final String documentUrl;
  @JsonKey(name: 'property_tenant')
  final String propertyTenant;
  @JsonKey(name: 'property_path')
  final String propertyPath;

  const TenantDocument({
    required this.id,
    required this.templateTitleSnapshot,
    required this.status,
    required this.createdAt,
    required this.documentUrl,
    required this.propertyTenant,
    required this.propertyPath,
  });

  factory TenantDocument.fromJson(Map<String, dynamic> json) =>
      _$TenantDocumentFromJson(json);

  Map<String, dynamic> toJson() => _$TenantDocumentToJson(this);

  // Helper getters
  String get displayTitle => templateTitleSnapshot.isNotEmpty
      ? templateTitleSnapshot
      : 'Untitled Document';

  String get formattedStatus => status.isNotEmpty
      ? '${status[0].toUpperCase()}${status.substring(1)}'
      : 'Unknown';

  DateTime get createdDate => DateTime.parse(createdAt);

  bool get isPending => status == 'pending';
  bool get isDraft => status == 'draft';
  bool get isSigned => status == 'signed';
  bool get isActive => status == 'active';
  bool get isExpired => status == 'expired';
  bool get isTerminated => status == 'terminated';

  bool get canSign => isDraft || isPending;
}

@JsonSerializable()
class TenantDocumentsResponse {
  final int count;
  final List<TenantDocument> results;

  const TenantDocumentsResponse({required this.count, required this.results});

  factory TenantDocumentsResponse.fromJson(Map<String, dynamic> json) =>
      _$TenantDocumentsResponseFromJson(json);

  Map<String, dynamic> toJson() => _$TenantDocumentsResponseToJson(this);
}

@JsonSerializable()
class TenantDocumentApiResponse {
  final bool error;
  final String? message;
  final TenantDocumentsResponse? data;

  const TenantDocumentApiResponse({
    required this.error,
    this.message,
    this.data,
  });

  factory TenantDocumentApiResponse.fromJson(Map<String, dynamic> json) =>
      _$TenantDocumentApiResponseFromJson(json);

  Map<String, dynamic> toJson() => _$TenantDocumentApiResponseToJson(this);
}

@JsonSerializable()
class UploadDocumentRequest {
  @JsonKey(name: 'agreement_id')
  final String agreementId;
  final String file;

  const UploadDocumentRequest({required this.agreementId, required this.file});

  factory UploadDocumentRequest.fromJson(Map<String, dynamic> json) =>
      _$UploadDocumentRequestFromJson(json);

  Map<String, dynamic> toJson() => _$UploadDocumentRequestToJson(this);
}

@JsonSerializable()
class UpdateDocumentStatusRequest {
  final String status;

  const UpdateDocumentStatusRequest({required this.status});

  factory UpdateDocumentStatusRequest.fromJson(Map<String, dynamic> json) =>
      _$UpdateDocumentStatusRequestFromJson(json);

  Map<String, dynamic> toJson() => _$UpdateDocumentStatusRequestToJson(this);
}
