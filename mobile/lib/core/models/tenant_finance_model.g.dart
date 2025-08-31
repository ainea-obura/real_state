// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tenant_finance_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

TenantFinanceStats _$TenantFinanceStatsFromJson(Map<String, dynamic> json) =>
    TenantFinanceStats(
      totalBilled: json['total_billed'] as String,
      totalPaid: json['total_paid'] as String,
      outstanding: json['outstanding'] as String,
      overdue: json['overdue'] as String,
      paidInvoices: (json['paid_invoices'] as num).toInt(),
      overdueInvoices: (json['overdue_invoices'] as num).toInt(),
      penalties: json['penalties'] as String,
      avgPaymentDelay: (json['avg_payment_delay'] as num).toInt(),
    );

Map<String, dynamic> _$TenantFinanceStatsToJson(TenantFinanceStats instance) =>
    <String, dynamic>{
      'total_billed': instance.totalBilled,
      'total_paid': instance.totalPaid,
      'outstanding': instance.outstanding,
      'overdue': instance.overdue,
      'paid_invoices': instance.paidInvoices,
      'overdue_invoices': instance.overdueInvoices,
      'penalties': instance.penalties,
      'avg_payment_delay': instance.avgPaymentDelay,
    };

TenantLease _$TenantLeaseFromJson(Map<String, dynamic> json) => TenantLease(
  unit: json['unit'] as String,
  property: json['property'] as String,
  rent: json['rent'] as String,
  deposit: json['deposit'] as String,
  currency: json['currency'] as String,
  contractStart: json['contract_start'] as String,
  contractEnd: json['contract_end'] as String,
);

Map<String, dynamic> _$TenantLeaseToJson(TenantLease instance) =>
    <String, dynamic>{
      'unit': instance.unit,
      'property': instance.property,
      'rent': instance.rent,
      'deposit': instance.deposit,
      'currency': instance.currency,
      'contract_start': instance.contractStart,
      'contract_end': instance.contractEnd,
    };

TenantPenalty _$TenantPenaltyFromJson(Map<String, dynamic> json) =>
    TenantPenalty(
      type: json['type'] as String,
      amount: json['amount'] as String,
      status: json['status'] as String,
      due: json['due'] as String,
    );

Map<String, dynamic> _$TenantPenaltyToJson(TenantPenalty instance) =>
    <String, dynamic>{
      'type': instance.type,
      'amount': instance.amount,
      'status': instance.status,
      'due': instance.due,
    };

TenantInvoice _$TenantInvoiceFromJson(Map<String, dynamic> json) =>
    TenantInvoice(
      number: json['number'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      amount: json['amount'] as String,
      due: json['due'] as String,
    );

Map<String, dynamic> _$TenantInvoiceToJson(TenantInvoice instance) =>
    <String, dynamic>{
      'number': instance.number,
      'type': instance.type,
      'status': instance.status,
      'amount': instance.amount,
      'due': instance.due,
    };

TenantPayment _$TenantPaymentFromJson(Map<String, dynamic> json) =>
    TenantPayment(
      ref: json['ref'] as String,
      date: json['date'] as String,
      amount: json['amount'] as String,
      method: json['method'] as String,
      status: json['status'] as String,
    );

Map<String, dynamic> _$TenantPaymentToJson(TenantPayment instance) =>
    <String, dynamic>{
      'ref': instance.ref,
      'date': instance.date,
      'amount': instance.amount,
      'method': instance.method,
      'status': instance.status,
    };

TenantFinanceSummary _$TenantFinanceSummaryFromJson(
  Map<String, dynamic> json,
) => TenantFinanceSummary(
  stats: TenantFinanceStats.fromJson(json['stats'] as Map<String, dynamic>),
  lease: TenantLease.fromJson(json['lease'] as Map<String, dynamic>),
  penalties: (json['penalties'] as List<dynamic>)
      .map((e) => TenantPenalty.fromJson(e as Map<String, dynamic>))
      .toList(),
  recentInvoices: (json['recent_invoices'] as List<dynamic>)
      .map((e) => TenantInvoice.fromJson(e as Map<String, dynamic>))
      .toList(),
  recentPayments: (json['recent_payments'] as List<dynamic>)
      .map((e) => TenantPayment.fromJson(e as Map<String, dynamic>))
      .toList(),
  billHealthScore: (json['bill_health_score'] as num).toInt(),
);

Map<String, dynamic> _$TenantFinanceSummaryToJson(
  TenantFinanceSummary instance,
) => <String, dynamic>{
  'stats': instance.stats,
  'lease': instance.lease,
  'penalties': instance.penalties,
  'recent_invoices': instance.recentInvoices,
  'recent_payments': instance.recentPayments,
  'bill_health_score': instance.billHealthScore,
};

TenantFinanceApiResponse _$TenantFinanceApiResponseFromJson(
  Map<String, dynamic> json,
) => TenantFinanceApiResponse(
  error: json['error'] as bool,
  message: json['message'] as String?,
  data: json['data'] == null
      ? null
      : TenantFinanceSummary.fromJson(json['data'] as Map<String, dynamic>),
);

Map<String, dynamic> _$TenantFinanceApiResponseToJson(
  TenantFinanceApiResponse instance,
) => <String, dynamic>{
  'error': instance.error,
  'message': instance.message,
  'data': instance.data,
};
