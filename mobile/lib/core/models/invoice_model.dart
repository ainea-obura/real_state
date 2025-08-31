class Invoice {
  final String id;
  final String invoiceNumber;
  final String description;
  final String totalAmount; // Changed to String to handle formatted currency
  final String balance; // Changed to String to handle formatted currency
  final String status;
  final String issueDate;
  final String dueDate;
  final String currency;
  final String propertyName;
  final String propertyAddress;
  final String? unitName;
  final String? projectName;

  Invoice({
    required this.id,
    required this.invoiceNumber,
    required this.description,
    required this.totalAmount,
    required this.balance,
    required this.status,
    required this.issueDate,
    required this.dueDate,
    required this.currency,
    required this.propertyName,
    required this.propertyAddress,
    this.unitName,
    this.projectName,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) {
    // Handle the backend response structure with better null safety
    String id = json['id']?.toString() ?? '';
    String description = json['description']?.toString() ?? '';
    String currency = json['currency']?.toString() ?? 'USD';
    String status = json['status']?.toString() ?? 'DRAFT';
    String issueDate =
        json['issue_date']?.toString() ?? json['issueDate']?.toString() ?? '';
    String dueDate =
        json['due_date']?.toString() ?? json['dueDate']?.toString() ?? '';
    String invoiceNumber =
        json['invoice_number']?.toString() ??
        json['invoiceNumber']?.toString() ??
        '';

    // Handle total_amount and balance fields from backend
    String totalAmount =
        json['total']?.toString() ?? // Backend sends 'total'
        json['total_amount']?.toString() ?? // Fallback
        json['totalAmount']?.toString() ?? // Fallback
        '0';
    String balance = json['balance']?.toString() ?? '0';

    // Handle property fields with multiple possible field names
    String propertyName =
        json['property_name']?.toString() ??
        json['propertyName']?.toString() ??
        json['property']?.toString() ??
        json['property_title']?.toString() ??
        json['propertyTitle']?.toString() ??
        '';

    String propertyAddress =
        json['property_address']?.toString() ??
        json['propertyAddress']?.toString() ??
        json['address']?.toString() ??
        json['location']?.toString() ??
        '';

    // Extract unit and project name from property object if it exists
    String? unitName;
    String? projectName;

    // Check if property is an object with unit and projectName fields
    if (json['property'] is Map<String, dynamic>) {
      final propertyData = json['property'] as Map<String, dynamic>;
      unitName = propertyData['unit']?.toString();
      projectName = propertyData['projectName']?.toString();
    }

    // Also check for direct unit and projectName fields
    unitName ??= json['unit']?.toString();
    projectName ??= json['projectName']?.toString();

    return Invoice(
      id: id,
      invoiceNumber: invoiceNumber,
      description: description,
      totalAmount: totalAmount,
      balance: balance,
      status: status,
      issueDate: issueDate,
      dueDate: dueDate,
      currency: currency,
      propertyName: propertyName,
      propertyAddress: propertyAddress,
      unitName: unitName,
      projectName: projectName,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'invoiceNumber': invoiceNumber,
      'description': description,
      'totalAmount': totalAmount,
      'balance': balance,
      'status': status,
      'issueDate': issueDate,
      'dueDate': dueDate,
      'currency': currency,
      'propertyName': propertyName,
      'propertyAddress': propertyAddress,
      'unitName': unitName,
      'projectName': projectName,
    };
  }

  bool get isPaid => status == 'PAID';
  bool get isOverdue => status == 'OVERDUE';
  bool get isPending => status == 'ISSUED' || status == 'DRAFT';

  // Property information with fallbacks
  String get displayPropertyName {
    if (unitName != null && projectName != null) {
      return '$unitName - $projectName';
    } else if (unitName != null) {
      return unitName!;
    } else if (projectName != null) {
      return projectName!;
    } else if (propertyName.isNotEmpty) {
      return propertyName;
    }
    return 'Property';
  }

  String get displayPropertyAddress =>
      propertyAddress.isNotEmpty ? propertyAddress : 'Address not specified';

  bool get hasPropertyInfo =>
      propertyName.isNotEmpty ||
      propertyAddress.isNotEmpty ||
      unitName != null ||
      projectName != null;
}
