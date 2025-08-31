class AccountModel {
  final String id;
  final String accountName;
  final String accountType;
  final String accountNumber;
  final String? bankName;
  final String? accountCode;
  final bool isActive;
  final bool isDefault;
  final String? userId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  AccountModel({
    required this.id,
    required this.accountName,
    required this.accountType,
    required this.accountNumber,
    this.bankName,
    this.accountCode,
    required this.isActive,
    required this.isDefault,
    this.userId,
    this.createdAt,
    this.updatedAt,
  });

  // Helper method to parse various date formats
  static DateTime? _parseDate(dynamic dateValue) {
    if (dateValue == null) return null;

    try {
      // Try parsing as ISO string first
      if (dateValue is String) {
        // Handle common date formats
        if (dateValue.contains(',')) {
          // Format: "10 Aug 2025, 12:48"
          try {
            // Try to parse with intl package format
            return DateTime.parse(dateValue.replaceAll(',', ''));
          } catch (e) {
            // Fallback: try to parse manually
            try {
              final parts = dateValue.split(',');
              if (parts.length == 2) {
                final datePart = parts[0].trim();
                final timePart = parts[1].trim();

                // Parse date part (e.g., "10 Aug 2025")
                final dateParts = datePart.split(' ');
                if (dateParts.length == 3) {
                  final day = int.parse(dateParts[0]);
                  final month = _getMonthNumber(dateParts[1]);
                  final year = int.parse(dateParts[2]);

                  // Parse time part (e.g., "12:48")
                  final timeParts = timePart.split(':');
                  if (timeParts.length == 2) {
                    final hour = int.parse(timeParts[0]);
                    final minute = int.parse(timeParts[1]);

                    return DateTime(year, month, day, hour, minute);
                  }
                }
              }
            } catch (e) {}
          }
        }

        // Try standard DateTime.parse
        return DateTime.parse(dateValue);
      }

      // Handle timestamp
      if (dateValue is int) {
        return DateTime.fromMillisecondsSinceEpoch(dateValue * 1000);
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  // Helper method to convert month name to number
  static int _getMonthNumber(String monthName) {
    final months = {
      'Jan': 1,
      'Feb': 2,
      'Mar': 3,
      'Apr': 4,
      'May': 5,
      'Jun': 6,
      'Jul': 7,
      'Aug': 8,
      'Sep': 9,
      'Oct': 10,
      'Nov': 11,
      'Dec': 12,
    };
    return months[monthName] ?? 1;
  }

  factory AccountModel.fromJson(Map<String, dynamic> json) {
    return AccountModel(
      id: json['id'] ?? '',
      accountName: json['account_name'] ?? '',
      accountType: json['account_type'] ?? '',
      accountNumber: json['account_number'] ?? '',
      bankName: json['bank_name'],
      accountCode: json['account_code'],
      isActive: json['is_active'] ?? false,
      isDefault: json['is_default'] ?? false,
      userId: json['user_id'],
      createdAt: _parseDate(json['created_at']),
      updatedAt: _parseDate(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'account_name': accountName,
      'account_type': accountType,
      'account_number': accountNumber,
      'bank_name': bankName,
      'account_code': accountCode,
      'is_active': isActive,
      'is_default': isDefault,
      'user_id': userId,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  AccountModel copyWith({
    String? id,
    String? accountName,
    String? accountType,
    String? accountNumber,
    String? bankName,
    String? accountCode,
    bool? isActive,
    bool? isDefault,
    String? userId,
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
      isActive: isActive ?? this.isActive,
      isDefault: isDefault ?? this.isDefault,
      userId: userId ?? this.userId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'AccountModel(id: $id, accountName: $accountName, accountType: $accountType, accountNumber: $accountNumber, bankName: $bankName, accountCode: $accountCode, isActive: $isActive, isDefault: $isDefault)';
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
        other.isActive == isActive &&
        other.isDefault == isDefault;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        accountName.hashCode ^
        accountType.hashCode ^
        accountNumber.hashCode ^
        bankName.hashCode ^
        accountCode.hashCode ^
        isActive.hashCode ^
        isDefault.hashCode;
  }
}

class CreateAccountRequest {
  final String accountName;
  final String accountType;
  final String accountNumber;
  final String? bankName;
  final String? accountCode;
  final String userId;

  CreateAccountRequest({
    required this.accountName,
    required this.accountType,
    required this.accountNumber,
    this.bankName,
    this.accountCode,
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
  final String? bankName;
  final String? accountCode;
  final String userId;

  UpdateAccountRequest({
    required this.accountName,
    required this.accountType,
    required this.accountNumber,
    this.bankName,
    this.accountCode,
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
