// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tenant_document_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

TenantDocument _$TenantDocumentFromJson(Map<String, dynamic> json) =>
    TenantDocument(
      id: json['id'] as String,
      templateTitleSnapshot: json['template_title_snapshot'] as String,
      status: json['status'] as String,
      createdAt: json['created_at'] as String,
      documentUrl: json['document_url'] as String,
      propertyTenant: json['property_tenant'] as String,
      propertyPath: json['property_path'] as String,
    );

Map<String, dynamic> _$TenantDocumentToJson(TenantDocument instance) =>
    <String, dynamic>{
      'id': instance.id,
      'template_title_snapshot': instance.templateTitleSnapshot,
      'status': instance.status,
      'created_at': instance.createdAt,
      'document_url': instance.documentUrl,
      'property_tenant': instance.propertyTenant,
      'property_path': instance.propertyPath,
    };

TenantDocumentsResponse _$TenantDocumentsResponseFromJson(
  Map<String, dynamic> json,
) => TenantDocumentsResponse(
  count: (json['count'] as num).toInt(),
  results: (json['results'] as List<dynamic>)
      .map((e) => TenantDocument.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$TenantDocumentsResponseToJson(
  TenantDocumentsResponse instance,
) => <String, dynamic>{'count': instance.count, 'results': instance.results};

TenantDocumentApiResponse _$TenantDocumentApiResponseFromJson(
  Map<String, dynamic> json,
) => TenantDocumentApiResponse(
  error: json['error'] as bool,
  message: json['message'] as String?,
  data: json['data'] == null
      ? null
      : TenantDocumentsResponse.fromJson(json['data'] as Map<String, dynamic>),
);

Map<String, dynamic> _$TenantDocumentApiResponseToJson(
  TenantDocumentApiResponse instance,
) => <String, dynamic>{
  'error': instance.error,
  'message': instance.message,
  'data': instance.data,
};

UploadDocumentRequest _$UploadDocumentRequestFromJson(
  Map<String, dynamic> json,
) => UploadDocumentRequest(
  agreementId: json['agreement_id'] as String,
  file: json['file'] as String,
);

Map<String, dynamic> _$UploadDocumentRequestToJson(
  UploadDocumentRequest instance,
) => <String, dynamic>{
  'agreement_id': instance.agreementId,
  'file': instance.file,
};

UpdateDocumentStatusRequest _$UpdateDocumentStatusRequestFromJson(
  Map<String, dynamic> json,
) => UpdateDocumentStatusRequest(status: json['status'] as String);

Map<String, dynamic> _$UpdateDocumentStatusRequestToJson(
  UpdateDocumentStatusRequest instance,
) => <String, dynamic>{'status': instance.status};
