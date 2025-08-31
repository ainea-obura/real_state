// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tenant_property_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

TenantProperty _$TenantPropertyFromJson(Map<String, dynamic> json) =>
    TenantProperty(
      id: json['id'] as String,
      unitName: json['unitName'] as String,
      propertyName: json['propertyName'] as String,
      rentAmount: json['rentAmount'] as String?,
      depositAmount: json['depositAmount'] as String?,
      currency: json['currency'] as String?,
      contractStart: DateTime.parse(json['contractStart'] as String),
      contractEnd: json['contractEnd'] == null
          ? null
          : DateTime.parse(json['contractEnd'] as String),
      status: json['status'] as String,
      unitType: json['unitType'] as String?,
      floorNumber: json['floorNumber'] as String?,
      blockName: json['blockName'] as String?,
      owner: json['owner'] == null
          ? null
          : OwnerInfo.fromJson(json['owner'] as Map<String, dynamic>),
      agent: json['agent'] == null
          ? null
          : AgentInfo.fromJson(json['agent'] as Map<String, dynamic>),
      image: json['image'] as String?,
      financialSummary: json['financialSummary'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$TenantPropertyToJson(TenantProperty instance) =>
    <String, dynamic>{
      'id': instance.id,
      'unitName': instance.unitName,
      'propertyName': instance.propertyName,
      'rentAmount': instance.rentAmount,
      'depositAmount': instance.depositAmount,
      'currency': instance.currency,
      'contractStart': instance.contractStart.toIso8601String(),
      'contractEnd': instance.contractEnd?.toIso8601String(),
      'status': instance.status,
      'unitType': instance.unitType,
      'floorNumber': instance.floorNumber,
      'blockName': instance.blockName,
      'owner': instance.owner,
      'agent': instance.agent,
      'image': instance.image,
      'financialSummary': instance.financialSummary,
    };

TenantPropertiesResponse _$TenantPropertiesResponseFromJson(
  Map<String, dynamic> json,
) => TenantPropertiesResponse(
  count: (json['count'] as num).toInt(),
  results: (json['results'] as List<dynamic>)
      .map((e) => TenantProperty.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$TenantPropertiesResponseToJson(
  TenantPropertiesResponse instance,
) => <String, dynamic>{'count': instance.count, 'results': instance.results};

TenantPropertiesApiResponse _$TenantPropertiesApiResponseFromJson(
  Map<String, dynamic> json,
) => TenantPropertiesApiResponse(
  error: json['error'] as bool,
  message: json['message'] as String?,
  data: json['data'] == null
      ? null
      : TenantPropertiesResponse.fromJson(json['data'] as Map<String, dynamic>),
);

Map<String, dynamic> _$TenantPropertiesApiResponseToJson(
  TenantPropertiesApiResponse instance,
) => <String, dynamic>{
  'error': instance.error,
  'message': instance.message,
  'data': instance.data,
};

TenantTransaction _$TenantTransactionFromJson(Map<String, dynamic> json) =>
    TenantTransaction(
      id: json['id'] as String,
      reference: json['reference'] as String,
      amount: json['amount'] as String,
      method: json['method'] as String,
      status: json['status'] as String,
      date: DateTime.parse(json['date'] as String),
      invoiceNumber: json['invoiceNumber'] as String?,
      receiptUrl: json['receiptUrl'] as String?,
    );

Map<String, dynamic> _$TenantTransactionToJson(TenantTransaction instance) =>
    <String, dynamic>{
      'id': instance.id,
      'reference': instance.reference,
      'amount': instance.amount,
      'method': instance.method,
      'status': instance.status,
      'date': instance.date.toIso8601String(),
      'invoiceNumber': instance.invoiceNumber,
      'receiptUrl': instance.receiptUrl,
    };

TenantTransactionsResponse _$TenantTransactionsResponseFromJson(
  Map<String, dynamic> json,
) => TenantTransactionsResponse(
  count: (json['count'] as num).toInt(),
  results: (json['results'] as List<dynamic>)
      .map((e) => TenantTransaction.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$TenantTransactionsResponseToJson(
  TenantTransactionsResponse instance,
) => <String, dynamic>{'count': instance.count, 'results': instance.results};

TenantTransactionsApiResponse _$TenantTransactionsApiResponseFromJson(
  Map<String, dynamic> json,
) => TenantTransactionsApiResponse(
  error: json['error'] as bool,
  message: json['message'] as String?,
  data: json['data'] == null
      ? null
      : TenantTransactionsResponse.fromJson(
          json['data'] as Map<String, dynamic>,
        ),
);

Map<String, dynamic> _$TenantTransactionsApiResponseToJson(
  TenantTransactionsApiResponse instance,
) => <String, dynamic>{
  'error': instance.error,
  'message': instance.message,
  'data': instance.data,
};
