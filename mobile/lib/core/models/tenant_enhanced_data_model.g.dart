// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tenant_enhanced_data_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

TenantEnhancedData _$TenantEnhancedDataFromJson(Map<String, dynamic> json) =>
    TenantEnhancedData(
      totalAmountSpent: (json['totalAmountSpent'] as num).toDouble(),
      lastPayment: json['lastPayment'] == null
          ? null
          : LastPayment.fromJson(json['lastPayment'] as Map<String, dynamic>),
      propertiesWithOwnersAgents:
          (json['propertiesWithOwnersAgents'] as List<dynamic>)
              .map(
                (e) => PropertyOwnerAgent.fromJson(e as Map<String, dynamic>),
              )
              .toList(),
      currency: json['currency'] as String?,
    );

Map<String, dynamic> _$TenantEnhancedDataToJson(TenantEnhancedData instance) =>
    <String, dynamic>{
      'totalAmountSpent': instance.totalAmountSpent,
      'lastPayment': instance.lastPayment,
      'propertiesWithOwnersAgents': instance.propertiesWithOwnersAgents,
      'currency': instance.currency,
    };

LastPayment _$LastPaymentFromJson(Map<String, dynamic> json) => LastPayment(
  amount: (json['amount'] as num).toDouble(),
  currency: json['currency'] as String,
  date: json['date'] as String,
  status: json['status'] as String,
);

Map<String, dynamic> _$LastPaymentToJson(LastPayment instance) =>
    <String, dynamic>{
      'amount': instance.amount,
      'currency': instance.currency,
      'date': instance.date,
      'status': instance.status,
    };

PropertyOwnerAgent _$PropertyOwnerAgentFromJson(Map<String, dynamic> json) =>
    PropertyOwnerAgent(
      assignmentId: json['assignmentId'] as String,
      owner: json['owner'] == null
          ? null
          : OwnerInfo.fromJson(json['owner'] as Map<String, dynamic>),
      agent: json['agent'] == null
          ? null
          : AgentInfo.fromJson(json['agent'] as Map<String, dynamic>),
      image: json['image'] as String?,
    );

Map<String, dynamic> _$PropertyOwnerAgentToJson(PropertyOwnerAgent instance) =>
    <String, dynamic>{
      'assignmentId': instance.assignmentId,
      'owner': instance.owner,
      'agent': instance.agent,
      'image': instance.image,
    };

OwnerInfo _$OwnerInfoFromJson(Map<String, dynamic> json) => OwnerInfo(
  id: json['id'] as String,
  name: json['name'] as String,
  email: json['email'] as String,
  phone: json['phone'] as String,
  profileImage: json['profileImage'] as String?,
);

Map<String, dynamic> _$OwnerInfoToJson(OwnerInfo instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'email': instance.email,
  'phone': instance.phone,
  'profileImage': instance.profileImage,
};

AgentInfo _$AgentInfoFromJson(Map<String, dynamic> json) => AgentInfo(
  id: json['id'] as String,
  name: json['name'] as String,
  email: json['email'] as String,
  phone: json['phone'] as String,
  profileImage: json['profileImage'] as String?,
);

Map<String, dynamic> _$AgentInfoToJson(AgentInfo instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'email': instance.email,
  'phone': instance.phone,
  'profileImage': instance.profileImage,
};
