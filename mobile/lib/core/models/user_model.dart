import 'package:json_annotation/json_annotation.dart';

part 'user_model.g.dart';

@JsonSerializable()
class UserModel {
  final String id;
  final String username;
  @JsonKey(name: 'full_name')
  final String? fullName;
  @JsonKey(name: 'first_name')
  final String? firstName;
  @JsonKey(name: 'last_name')
  final String? lastName;
  final String email;
  final String? avatar;
  final String? company;
  final String? phone;
  @JsonKey(name: 'company_name')
  final String? companyName;
  final String? position;
  final String type;
  @JsonKey(name: 'force_password_change')
  final bool forcePasswordChange;
  @JsonKey(name: 'is_verified')
  final bool isVerified;
  @JsonKey(name: 'is_tenant_verified')
  final bool isTenantVerified;
  @JsonKey(name: 'is_owner_verified')
  final bool isOwnerVerified;

  const UserModel({
    required this.id,
    required this.username,
    this.fullName,
    this.firstName,
    this.lastName,
    required this.email,
    this.avatar,
    this.company,
    this.phone,
    this.companyName,
    this.position,
    required this.type,
    this.forcePasswordChange = false,
    this.isVerified = false,
    this.isTenantVerified = false,
    this.isOwnerVerified = false,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);
  Map<String, dynamic> toJson() => _$UserModelToJson(this);

  // Helper methods
  bool get isOwner => type == 'owner';
  bool get isTenant => type == 'tenant';
  bool get isAuthorized => type == 'owner' || type == 'tenant';

  // Additional getters for compatibility
  String get userType => type;
  bool get isActive => isVerified;
  DateTime get createdAt => DateTime.now(); // Placeholder
  DateTime get updatedAt => DateTime.now(); // Placeholder

  String get displayName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName'.trim();
    }
    if (fullName?.isNotEmpty ?? false) {
      return fullName!;
    }
    return username;
  }

  UserModel copyWith({
    String? id,
    String? username,
    String? fullName,
    String? firstName,
    String? lastName,
    String? email,
    String? avatar,
    String? company,
    String? phone,
    String? companyName,
    String? position,
    String? type,
    bool? forcePasswordChange,
    bool? isVerified,
    bool? isTenantVerified,
    bool? isOwnerVerified,
  }) {
    return UserModel(
      id: id ?? this.id,
      username: username ?? this.username,
      fullName: fullName ?? this.fullName,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      avatar: avatar ?? this.avatar,
      company: company ?? this.company,
      phone: phone ?? this.phone,
      companyName: companyName ?? this.companyName,
      position: position ?? this.position,
      type: type ?? this.type,
      forcePasswordChange: forcePasswordChange ?? this.forcePasswordChange,
      isVerified: isVerified ?? this.isVerified,
      isTenantVerified: isTenantVerified ?? this.isTenantVerified,
      isOwnerVerified: isOwnerVerified ?? this.isOwnerVerified,
    );
  }
}
