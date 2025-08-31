// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

UserModel _$UserModelFromJson(Map<String, dynamic> json) => UserModel(
  id: json['id'] as String,
  username: json['username'] as String,
  fullName: json['full_name'] as String?,
  firstName: json['first_name'] as String?,
  lastName: json['last_name'] as String?,
  email: json['email'] as String,
  avatar: json['avatar'] as String?,
  company: json['company'] as String?,
  type: json['type'] as String,
  forcePasswordChange: json['force_password_change'] as bool? ?? false,
  isVerified: json['is_verified'] as bool? ?? false,
  isTenantVerified: json['is_tenant_verified'] as bool? ?? false,
  isOwnerVerified: json['is_owner_verified'] as bool? ?? false,
);

Map<String, dynamic> _$UserModelToJson(UserModel instance) => <String, dynamic>{
  'id': instance.id,
  'username': instance.username,
  'full_name': instance.fullName,
  'first_name': instance.firstName,
  'last_name': instance.lastName,
  'email': instance.email,
  'avatar': instance.avatar,
  'company': instance.company,
  'type': instance.type,
  'force_password_change': instance.forcePasswordChange,
  'is_verified': instance.isVerified,
  'is_tenant_verified': instance.isTenantVerified,
  'is_owner_verified': instance.isOwnerVerified,
};
