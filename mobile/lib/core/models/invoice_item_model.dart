class InvoiceItem {
  final String id;
  final String description;
  final String type;
  final int quantity;
  final String amount;
  final String price;
  final String rate;
  final String nodeName;
  final double? percentageRate;
  final String? serviceId;
  final String? penaltyId;
  final String? invoiceId; // Add invoiceId field

  InvoiceItem({
    required this.id,
    required this.description,
    required this.type,
    required this.quantity,
    required this.amount,
    required this.price,
    required this.rate,
    required this.nodeName,
    this.percentageRate,
    this.serviceId,
    this.penaltyId,
    this.invoiceId,
  });

  factory InvoiceItem.fromJson(Map<String, dynamic> json) {
    // Handle null values safely
    return InvoiceItem(
      id: json['id']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      type: json['type']?.toString() ?? 'unknown',
      quantity: json['quantity']?.toInt() ?? 1,
      amount: json['amount']?.toString() ?? '0',
      price: json['price']?.toString() ?? '0',
      rate: json['rate']?.toString() ?? '0',
      nodeName: json['node_name']?.toString() ?? '',
      percentageRate: json['percentage_rate']?.toDouble(),
      serviceId: json['serviceId']?.toString(),
      penaltyId: json['penaltyId']?.toString(),
      invoiceId:
          json['invoice_id']?.toString() ?? json['invoiceId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'description': description,
      'type': type,
      'quantity': quantity,
      'amount': amount,
      'price': price,
      'rate': rate,
      'node_name': nodeName,
      'percentage_rate': percentageRate,
      'serviceId': serviceId,
      'penaltyId': penaltyId,
      'invoice_id': invoiceId,
    };
  }
}
