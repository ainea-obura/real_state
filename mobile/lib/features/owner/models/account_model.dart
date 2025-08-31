class AccountModel {
  final String id;
  final String accountName;
  final String accountType;
  final String accountNumber;
  final String? bankName;
  final String? accountCode;
  final String userId;
  final bool isActive;
  final bool isDefault;
  final DateTime createdAt;
  final DateTime updatedAt;

  AccountModel({
    required this.id,
    required this.accountName,
    required this.accountType,
    required this.accountNumber,
    this.bankName,
    this.accountCode,
    required this.userId,
    required this.isActive,
    required this.isDefault,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AccountModel.fromJson(Map<String, dynamic> json) {
    try {
      print('AccountModel: Parsing JSON: $json');

      // Handle date parsing with better error handling
      DateTime parseDate(String? dateString, String fieldName) {
        if (dateString == null || dateString.isEmpty) {
          print('AccountModel: $fieldName is null/empty, using current time');
          return DateTime.now();
        }

        try {
          final parsed = DateTime.parse(dateString);
          print('AccountModel: Successfully parsed $fieldName: $parsed');
          return parsed;
        } catch (e) {
          print('AccountModel: Failed to parse $fieldName "$dateString": $e');
          return DateTime.now();
        }
      }

      final account = AccountModel(
        id: json['id']?.toString() ?? '',
        accountName: json['account_name']?.toString() ?? '',
        accountType: json['account_type']?.toString() ?? '',
        accountNumber: json['account_number']?.toString() ?? '',
        bankName: json['bank_name']?.toString(),
        accountCode: json['account_code']?.toString(),
        userId: json['user_id']?.toString() ?? '',
        isActive: json['is_active'] == true,
        isDefault: json['is_default'] == true,
        createdAt: parseDate(json['created_at'], 'created_at'),
        updatedAt: parseDate(json['updated_at'], 'updated_at'),
      );

      print(
        'AccountModel: Successfully created account: ${account.accountName}',
      );
      return account;
    } catch (e) {
      print('AccountModel: Error creating account from JSON: $e');
      print('AccountModel: JSON data: $json');
      rethrow;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'account_name': accountName,
      'account_type': accountType,
      'account_number': accountNumber,
      'bank_name': bankName,
      'account_code': accountCode,
      'user_id': userId,
      'is_active': isActive,
      'is_default': isDefault,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  AccountModel copyWith({
    String? id,
    String? accountName,
    String? accountType,
    String? accountNumber,
    String? bankName,
    String? accountCode,
    String? userId,
    bool? isActive,
    bool? isDefault,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return AccountModel(
      id: id ?? this.id,
      accountName: accountName ?? this.accountName,
      accountType: accountType ?? this.accountType,
      accountNumber: accountNumber ?? this.accountNumber,
      bankName: bankName ?? this.bankName,
      accountCode: accountCode ?? this.accountCode,
      userId: userId ?? this.userId,
      isActive: isActive ?? this.isActive,
      isDefault: isDefault ?? this.isDefault,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'AccountModel(id: $id, accountName: $accountName, accountType: $accountType, accountNumber: $accountNumber, bankName: $bankName, accountCode: $accountCode, userId: $userId, isActive: $isActive, isDefault: $isDefault, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AccountModel &&
        other.id == id &&
        other.accountName == accountName &&
        other.accountType == accountType &&
        other.accountNumber == accountNumber &&
        other.bankName == bankName &&
        other.accountCode == accountCode &&
        other.userId == userId &&
        other.isActive == isActive &&
        other.isDefault == isDefault &&
        other.createdAt == createdAt &&
        other.updatedAt == updatedAt;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        accountName.hashCode ^
        accountType.hashCode ^
        accountNumber.hashCode ^
        bankName.hashCode ^
        accountCode.hashCode ^
        userId.hashCode ^
        isActive.hashCode ^
        isDefault.hashCode ^
        createdAt.hashCode ^
        updatedAt.hashCode;
  }
}

class CreateAccountRequest {
  final String accountName;
  final String accountType;
  final String accountNumber;
  final String bankName;
  final String accountCode;
  final String userId;

  CreateAccountRequest({
    required this.accountName,
    required this.accountType,
    required this.accountNumber,
    required this.bankName,
    required this.accountCode,
    required this.userId,
  });

  Map<String, dynamic> toJson() {
    return {
      'account_name': accountName,
      'account_type': accountType,
      'account_number': accountNumber,
      'bank_name': bankName,
      'account_code': accountCode,
      'user_id': userId,
    };
  }
}

class UpdateAccountRequest {
  final String accountName;
  final String accountType;
  final String accountNumber;
  final String bankName;
  final String accountCode;
  final String userId;

  UpdateAccountRequest({
    required this.accountName,
    required this.accountType,
    required this.accountNumber,
    required this.bankName,
    required this.accountCode,
    required this.userId,
  });

  Map<String, dynamic> toJson() {
    return {
      'account_name': accountName,
      'account_type': accountType,
      'account_number': accountNumber,
      'bank_name': bankName,
      'account_code': accountCode,
      'user_id': userId,
    };
  }
}
