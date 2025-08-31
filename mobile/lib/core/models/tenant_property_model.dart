import 'package:json_annotation/json_annotation.dart';
import 'tenant_enhanced_data_model.dart';

part 'tenant_property_model.g.dart';

@JsonSerializable()
class TenantProperty {
  final String id;
  final String unitName;
  final String propertyName;
  final String? rentAmount;
  final String? depositAmount;
  final String? currency;
  final DateTime contractStart;
  final DateTime? contractEnd;
  final String status; // active, expired, expiring_soon
  final String? unitType;
  final String? floorNumber;
  final String? blockName;

  // Enhanced data fields (now included directly in API response)
  final OwnerInfo? owner;
  final AgentInfo? agent;
  final String? image;

  // Financial summary data (embedded in queryset)
  final Map<String, dynamic>? financialSummary;

  const TenantProperty({
    required this.id,
    required this.unitName,
    required this.propertyName,
    required this.rentAmount,
    required this.depositAmount,
    required this.currency,
    required this.contractStart,
    this.contractEnd,
    required this.status,
    this.unitType,
    this.floorNumber,
    this.blockName,
    this.owner,
    this.agent,
    this.image,
    this.financialSummary,
  });

  factory TenantProperty.fromJson(Map<String, dynamic> json) =>
      _$TenantPropertyFromJson(json);

  Map<String, dynamic> toJson() => _$TenantPropertyToJson(this);

  // Helper getters with null safety
  String get displayName => '$propertyName - $unitName';

  String get fullAddress {
    List<String> parts = [unitName];
    if (floorNumber != null) parts.add('Floor $floorNumber');
    if (blockName != null) parts.add('Block $blockName');
    parts.add(propertyName);
    return parts.join(', ');
  }

  String get contractPeriod {
    final start = contractStart.toIso8601String().split('T')[0];
    final end = contractEnd?.toIso8601String().split('T')[0] ?? 'Ongoing';
    return '$start - $end';
  }

  bool get isActive => status.toLowerCase() == 'active';
  bool get isExpired => status.toLowerCase() == 'expired';
  bool get isExpiringSoon => status.toLowerCase() == 'expiring_soon';

  String get statusDisplay {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Active';
      case 'expired':
        return 'Expired';
      case 'expiring_soon':
        return 'Expiring Soon';
      default:
        return status;
    }
  }

  // Safe getters for nullable fields
  String get safeRentAmount => rentAmount ?? 'N/A';
  String get safeDepositAmount => depositAmount ?? 'N/A';
  String get safeCurrency => currency ?? 'USD';

  // Financial summary getters
  bool get hasFinancialSummary => financialSummary != null;
  double get totalAmountSpent =>
      financialSummary?['total_amount_spent']?.toDouble() ?? 0.0;
  Map<String, dynamic>? get lastPayment => financialSummary?['last_payment'];
}

@JsonSerializable()
class TenantPropertiesResponse {
  final int count;
  final List<TenantProperty> results;

  const TenantPropertiesResponse({required this.count, required this.results});

  factory TenantPropertiesResponse.fromJson(Map<String, dynamic> json) =>
      _$TenantPropertiesResponseFromJson(json);

  Map<String, dynamic> toJson() => _$TenantPropertiesResponseToJson(this);
}

@JsonSerializable()
class TenantPropertiesApiResponse {
  final bool error;
  final String? message;
  final TenantPropertiesResponse? data;

  const TenantPropertiesApiResponse({
    required this.error,
    this.message,
    this.data,
  });

  factory TenantPropertiesApiResponse.fromJson(Map<String, dynamic> json) =>
      _$TenantPropertiesApiResponseFromJson(json);

  Map<String, dynamic> toJson() => _$TenantPropertiesApiResponseToJson(this);
}

// Transaction models for recent payments
@JsonSerializable()
class TenantTransaction {
  final String id;
  final String reference;
  final String amount;
  final String method;
  final String status;
  final DateTime date;
  final String? invoiceNumber;
  final String? receiptUrl;

  const TenantTransaction({
    required this.id,
    required this.reference,
    required this.amount,
    required this.method,
    required this.status,
    required this.date,
    this.invoiceNumber,
    this.receiptUrl,
  });

  factory TenantTransaction.fromJson(Map<String, dynamic> json) =>
      _$TenantTransactionFromJson(json);

  Map<String, dynamic> toJson() => _$TenantTransactionToJson(this);

  // Helper getters
  String get formattedDate {
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  bool get isCompleted => status.toLowerCase() == 'completed';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isFailed => status.toLowerCase() == 'failed';

  String get statusDisplay {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  }
}

@JsonSerializable()
class TenantTransactionsResponse {
  final int count;
  final List<TenantTransaction> results;

  const TenantTransactionsResponse({
    required this.count,
    required this.results,
  });

  factory TenantTransactionsResponse.fromJson(Map<String, dynamic> json) =>
      _$TenantTransactionsResponseFromJson(json);

  Map<String, dynamic> toJson() => _$TenantTransactionsResponseToJson(this);
}

@JsonSerializable()
class TenantTransactionsApiResponse {
  final bool error;
  final String? message;
  final TenantTransactionsResponse? data;

  const TenantTransactionsApiResponse({
    required this.error,
    this.message,
    this.data,
  });

  factory TenantTransactionsApiResponse.fromJson(Map<String, dynamic> json) =>
      _$TenantTransactionsApiResponseFromJson(json);

  Map<String, dynamic> toJson() => _$TenantTransactionsApiResponseToJson(this);
}
