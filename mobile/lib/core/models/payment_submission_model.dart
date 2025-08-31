class PaymentSubmissionModel {
  final String invoiceId;
  final double amount;
  final String paymentMethod;
  final String accountId;
  final String? notes;
  final String userId;
  final DateTime paymentDate;

  PaymentSubmissionModel({
    required this.invoiceId,
    required this.amount,
    required this.paymentMethod,
    required this.accountId,
    this.notes,
    required this.userId,
    required this.paymentDate,
  });

  Map<String, dynamic> toJson() {
    return {
      'invoice_id': invoiceId,
      'amount': amount,
      'payment_method': paymentMethod,
      'account_id': accountId,
      'notes': notes,
      'user_id': userId,
      'payment_date': paymentDate.toIso8601String(),
    };
  }

  factory PaymentSubmissionModel.fromJson(Map<String, dynamic> json) {
    return PaymentSubmissionModel(
      invoiceId: json['invoice_id'] ?? '',
      amount: (json['amount'] ?? 0.0).toDouble(),
      paymentMethod: json['payment_method'] ?? '',
      accountId: json['account_id'] ?? '',
      notes: json['notes'],
      userId: json['user_id'] ?? '',
      paymentDate: DateTime.parse(
        json['payment_date'] ?? DateTime.now().toIso8601String(),
      ),
    );
  }

  PaymentSubmissionModel copyWith({
    String? invoiceId,
    double? amount,
    String? paymentMethod,
    String? accountId,
    String? notes,
    String? userId,
    DateTime? paymentDate,
  }) {
    return PaymentSubmissionModel(
      invoiceId: invoiceId ?? this.invoiceId,
      amount: amount ?? this.amount,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      accountId: accountId ?? this.accountId,
      notes: notes ?? this.notes,
      userId: userId ?? this.userId,
      paymentDate: paymentDate ?? this.paymentDate,
    );
  }

  @override
  String toString() {
    return 'PaymentSubmissionModel(invoiceId: $invoiceId, amount: $amount, paymentMethod: $paymentMethod, accountId: $accountId, notes: $notes, userId: $userId, paymentDate: $paymentDate)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is PaymentSubmissionModel &&
        other.invoiceId == invoiceId &&
        other.amount == amount &&
        other.paymentMethod == paymentMethod &&
        other.accountId == accountId &&
        other.notes == notes &&
        other.userId == userId &&
        other.paymentDate == paymentDate;
  }

  @override
  int get hashCode {
    return invoiceId.hashCode ^
        amount.hashCode ^
        paymentMethod.hashCode ^
        accountId.hashCode ^
        notes.hashCode ^
        userId.hashCode ^
        paymentDate.hashCode;
  }
}

class PaymentResponseModel {
  final bool success;
  final String message;
  final Map<String, dynamic>? data;
  final List<String>? errors;

  PaymentResponseModel({
    required this.success,
    required this.message,
    this.data,
    this.errors,
  });

  factory PaymentResponseModel.fromJson(Map<String, dynamic> json) {
    return PaymentResponseModel(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
      data: json['data'],
      errors: json['errors'] != null ? List<String>.from(json['errors']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'message': message,
      'data': data,
      'errors': errors,
    };
  }

  @override
  String toString() {
    return 'PaymentResponseModel(success: $success, message: $message, data: $data, errors: $errors)';
  }
}
