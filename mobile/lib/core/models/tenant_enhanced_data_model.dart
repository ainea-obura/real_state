import 'package:json_annotation/json_annotation.dart';

part 'tenant_enhanced_data_model.g.dart';

@JsonSerializable()
class TenantEnhancedData {
  final double totalAmountSpent;
  final LastPayment? lastPayment;
  final List<PropertyOwnerAgent> propertiesWithOwnersAgents;
  final String? currency;

  TenantEnhancedData({
    required this.totalAmountSpent,
    this.lastPayment,
    required this.propertiesWithOwnersAgents,
    this.currency,
  });

  factory TenantEnhancedData.fromJson(Map<String, dynamic> json) =>
      _$TenantEnhancedDataFromJson(json);

  Map<String, dynamic> toJson() => _$TenantEnhancedDataToJson(this);
}

@JsonSerializable()
class LastPayment {
  final double amount;
  final String currency;
  final String date;
  final String status;

  LastPayment({
    required this.amount,
    required this.currency,
    required this.date,
    required this.status,
  });

  factory LastPayment.fromJson(Map<String, dynamic> json) =>
      _$LastPaymentFromJson(json);

  Map<String, dynamic> toJson() => _$LastPaymentToJson(this);
}

@JsonSerializable()
class PropertyOwnerAgent {
  final String assignmentId;
  final OwnerInfo? owner;
  final AgentInfo? agent;
  final String? image;

  PropertyOwnerAgent({
    required this.assignmentId,
    this.owner,
    this.agent,
    this.image,
  });

  factory PropertyOwnerAgent.fromJson(Map<String, dynamic> json) =>
      _$PropertyOwnerAgentFromJson(json);

  Map<String, dynamic> toJson() => _$PropertyOwnerAgentToJson(this);
}

@JsonSerializable()
class OwnerInfo {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String? profileImage;

  OwnerInfo({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.profileImage,
  });

  factory OwnerInfo.fromJson(Map<String, dynamic> json) =>
      _$OwnerInfoFromJson(json);

  Map<String, dynamic> toJson() => _$OwnerInfoToJson(this);
}

@JsonSerializable()
class AgentInfo {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String? profileImage;

  AgentInfo({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.profileImage,
  });

  factory AgentInfo.fromJson(Map<String, dynamic> json) =>
      _$AgentInfoFromJson(json);

  Map<String, dynamic> toJson() => _$AgentInfoToJson(this);
}
