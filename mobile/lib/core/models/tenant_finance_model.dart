import 'package:json_annotation/json_annotation.dart';

part 'tenant_finance_model.g.dart';

@JsonSerializable()
class TenantFinanceStats {
  @JsonKey(name: 'total_billed')
  final String totalBilled;
  @JsonKey(name: 'total_paid')
  final String totalPaid;
  final String outstanding;
  final String overdue;
  @JsonKey(name: 'paid_invoices')
  final int paidInvoices;
  @JsonKey(name: 'overdue_invoices')
  final int overdueInvoices;
  final String penalties;
  @JsonKey(name: 'avg_payment_delay')
  final int avgPaymentDelay;

  const TenantFinanceStats({
    required this.totalBilled,
    required this.totalPaid,
    required this.outstanding,
    required this.overdue,
    required this.paidInvoices,
    required this.overdueInvoices,
    required this.penalties,
    required this.avgPaymentDelay,
  });

  factory TenantFinanceStats.fromJson(Map<String, dynamic> json) =>
      _$TenantFinanceStatsFromJson(json);

  Map<String, dynamic> toJson() => _$TenantFinanceStatsToJson(this);
}

@JsonSerializable()
class TenantLease {
  final String unit;
  final String property;
  final String rent;
  final String deposit;
  final String currency;
  @JsonKey(name: 'contract_start')
  final String contractStart;
  @JsonKey(name: 'contract_end')
  final String contractEnd;

  const TenantLease({
    required this.unit,
    required this.property,
    required this.rent,
    required this.deposit,
    required this.currency,
    required this.contractStart,
    required this.contractEnd,
  });

  factory TenantLease.fromJson(Map<String, dynamic> json) =>
      _$TenantLeaseFromJson(json);

  Map<String, dynamic> toJson() => _$TenantLeaseToJson(this);
}

@JsonSerializable()
class TenantPenalty {
  final String type;
  final String amount;
  final String status;
  final String due;

  const TenantPenalty({
    required this.type,
    required this.amount,
    required this.status,
    required this.due,
  });

  factory TenantPenalty.fromJson(Map<String, dynamic> json) =>
      _$TenantPenaltyFromJson(json);

  Map<String, dynamic> toJson() => _$TenantPenaltyToJson(this);
}

@JsonSerializable()
class TenantInvoice {
  final String number;
  final String type;
  final String status;
  final String amount;
  final String due;

  const TenantInvoice({
    required this.number,
    required this.type,
    required this.status,
    required this.amount,
    required this.due,
  });

  factory TenantInvoice.fromJson(Map<String, dynamic> json) =>
      _$TenantInvoiceFromJson(json);

  Map<String, dynamic> toJson() => _$TenantInvoiceToJson(this);
}

@JsonSerializable()
class TenantPayment {
  final String ref;
  final String date;
  final String amount;
  final String method;
  final String status;

  const TenantPayment({
    required this.ref,
    required this.date,
    required this.amount,
    required this.method,
    required this.status,
  });

  factory TenantPayment.fromJson(Map<String, dynamic> json) =>
      _$TenantPaymentFromJson(json);

  Map<String, dynamic> toJson() => _$TenantPaymentToJson(this);
}

@JsonSerializable()
class TenantFinanceSummary {
  final TenantFinanceStats stats;
  final TenantLease lease;
  final List<TenantPenalty> penalties;
  @JsonKey(name: 'recent_invoices')
  final List<TenantInvoice> recentInvoices;
  @JsonKey(name: 'recent_payments')
  final List<TenantPayment> recentPayments;
  @JsonKey(name: 'bill_health_score')
  final int billHealthScore;

  const TenantFinanceSummary({
    required this.stats,
    required this.lease,
    required this.penalties,
    required this.recentInvoices,
    required this.recentPayments,
    required this.billHealthScore,
  });

  factory TenantFinanceSummary.fromJson(Map<String, dynamic> json) =>
      _$TenantFinanceSummaryFromJson(json);

  Map<String, dynamic> toJson() => _$TenantFinanceSummaryToJson(this);
}

@JsonSerializable()
class TenantFinanceApiResponse {
  final bool error;
  final String? message;
  final TenantFinanceSummary? data;

  const TenantFinanceApiResponse({
    required this.error,
    this.message,
    this.data,
  });

  factory TenantFinanceApiResponse.fromJson(Map<String, dynamic> json) =>
      _$TenantFinanceApiResponseFromJson(json);

  Map<String, dynamic> toJson() => _$TenantFinanceApiResponseToJson(this);
}
