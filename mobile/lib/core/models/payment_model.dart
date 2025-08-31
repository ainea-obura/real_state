class Payment {
  final String id;
  final String transactionId;
  final String amount; // Changed from double to String
  final String paymentMethod;
  final String status;
  final String paymentDate;
  final String currency;
  final String notes;
  final String? invoiceId; // Add invoiceId field

  Payment({
    required this.id,
    required this.transactionId,
    required this.amount,
    required this.paymentMethod,
    required this.status,
    required this.paymentDate,
    required this.currency,
    required this.notes,
    this.invoiceId,
  }) {
    // Debug logging to see what type amount is
    print('=== Payment Constructor Debug ===');
    print('Creating Payment with amount: $amount');
    print('Amount type: ${amount.runtimeType}');
    print('Amount is String: ${amount is String}');
    print('Amount is double: ${amount is double}');
    print('===============================');
  }

  factory Payment.fromJson(Map<String, dynamic> json) {
    // Handle null values safely
    return Payment(
      id: json['id']?.toString() ?? '',
      transactionId: json['transactionId']?.toString() ?? '',
      amount: json['amount']?.toString() ?? '0', // Keep as string
      paymentMethod: json['paymentMethod']?.toString() ?? 'Unknown',
      status: json['status']?.toString() ?? 'Pending',
      paymentDate: json['paymentDate']?.toString() ?? '',
      currency: json['currency']?.toString() ?? 'USD',
      notes: json['notes']?.toString() ?? '',
      invoiceId:
          json['invoice_id']?.toString() ?? json['invoiceId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'transactionId': transactionId,
      'amount': amount,
      'paymentMethod': paymentMethod,
      'status': status,
      'paymentDate': paymentDate,
      'currency': currency,
      'notes': notes,
      'invoice_id': invoiceId,
    };
  }

  bool get isCompleted => status == 'Completed';
  bool get isPending => status == 'Pending';
  bool get isFailed => status == 'Failed';
}
