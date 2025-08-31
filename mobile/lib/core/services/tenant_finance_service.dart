import 'dart:convert';
import 'package:get/get.dart';
import '../models/invoice_model.dart';
import '../models/payment_model.dart';
import '../models/invoice_item_model.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';

class TenantFinanceService {
  final ApiService _apiService = Get.find<ApiService>();

  Future<TenantInvoicesResult> fetchTenantInvoices({
    required String userId,
    required int page,
    required int pageSize,
  }) async {
    try {
      final endpoint =
          '${ApiConstants.tenantInvoicesEndpoint}?user_id=$userId&page=$page&page_size=$pageSize';

      final response = await _apiService.get(endpoint);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final jsonData = jsonDecode(response.body) as Map<String, dynamic>;

        if (jsonData['error'] == true || jsonData['data'] == null) {
          throw Exception(jsonData['message'] ?? 'Failed to fetch invoices');
        }

        final data = jsonData['data'] as Map<String, dynamic>;

        // Validate response structure
        if (!data.containsKey('results')) {
          throw Exception('Invalid API response: missing results field');
        }

        final results = data['results'] as List<dynamic>;

        if (results.isEmpty) {
          return TenantInvoicesResult(
            invoices: [],
            total: 0,
            page: page,
            pageSize: pageSize,
          );
        }

        final invoices = <Invoice>[];

        for (final item in results) {
          try {
            final invoice = _parseInvoiceFromApi(item as Map<String, dynamic>);
            invoices.add(invoice);
          } catch (e) {
            // Continue with other invoices instead of failing completely
            continue;
          }
        }

        return TenantInvoicesResult(
          invoices: invoices,
          total: data['total'] ?? invoices.length,
          page: data['page'] ?? page,
          pageSize: data['page_size'] ?? pageSize,
        );
      } else {
        throw Exception(
          'Failed to fetch invoices: ${response.statusCode} - ${response.body}',
        );
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<InvoiceDetailResult> fetchInvoiceDetail({
    required String invoiceId,
  }) async {
    try {
      final endpoint = ApiConstants.invoiceDetailEndpoint.replaceAll(
        '{invoice_id}',
        invoiceId,
      );

      print('=== fetchInvoiceDetail Debug ===');
      print('Endpoint: $endpoint');
      print('Full URL: ${ApiConstants.baseUrl}$endpoint');
      print('==============================');

      final response = await _apiService.get(endpoint);

      print('API Response Status: ${response.statusCode}');
      print('API Response Body: ${response.body}');

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final jsonData = jsonDecode(response.body) as Map<String, dynamic>;

        print('Parsed JSON: $jsonData');

        if (jsonData['error'] == true || jsonData['data'] == null) {
          throw Exception(
            jsonData['message'] ?? 'Failed to fetch invoice detail',
          );
        }

        final data = jsonData['data'] as Map<String, dynamic>;
        final invoiceData = data['invoice'] as Map<String, dynamic>;
        final paymentsData = data['payments'] as List<dynamic>;
        final itemsData = data['items'] as List<dynamic>;

        print('Invoice data: $invoiceData');
        print('Payments data: $paymentsData');
        print('Items data: $itemsData');

        final invoice = _parseInvoiceFromApi(invoiceData);
        final payments = <Payment>[];
        final items = <InvoiceItem>[];

        // Parse invoice items
        for (final itemData in itemsData) {
          try {
            final item = _parseInvoiceItemFromApi(
              itemData as Map<String, dynamic>,
            );
            items.add(item);
          } catch (e) {
            print('Error parsing item: $e');
            // Continue with other items
          }
        }

        // Parse payments
        for (final paymentData in paymentsData) {
          try {
            print('Parsing payment data: $paymentData');
            print('Payment amount field: ${paymentData['amount']}');
            print('Payment amount type: ${paymentData['amount'].runtimeType}');

            final payment = _parsePaymentFromApi(
              paymentData as Map<String, dynamic>,
            );
            payments.add(payment);
            print(
              'Successfully parsed payment: ${payment.transactionId} - ${payment.amount} (type: ${payment.amount.runtimeType})',
            );
          } catch (e) {
            print('Error parsing payment: $e');
            // Continue with other payments
          }
        }

        print('Parsed payments: ${payments.length}');
        print('Parsed items: ${items.length}');

        return InvoiceDetailResult(
          invoice: invoice,
          items: items,
          payments: payments,
        );
      } else {
        throw Exception(
          'Failed to fetch invoice detail: ${response.statusCode} - ${response.body}',
        );
      }
    } catch (e) {
      print('=== fetchInvoiceDetail Error ===');
      print('Error: $e');
      print('==============================');
      rethrow;
    }
  }

  // Method to fetch property details for an invoice
  Future<Map<String, dynamic>?> fetchPropertyDetailsForInvoice({
    required String invoiceId,
  }) async {
    try {
      // Try to get property details from the invoice detail endpoint first
      final endpoint = ApiConstants.invoiceDetailEndpoint.replaceAll(
        '{invoice_id}',
        invoiceId,
      );

      final response = await _apiService.get(endpoint);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final jsonData = jsonDecode(response.body) as Map<String, dynamic>;

        if (jsonData['error'] == true || jsonData['data'] == null) {
          return null;
        }

        final data = jsonData['data'] as Map<String, dynamic>;
        final invoiceData = data['invoice'] as Map<String, dynamic>;

        // Check if property information is available in the invoice
        final propertyInfo = <String, dynamic>{};

        // Try to extract property information from various possible fields
        if (invoiceData['property'] != null) {
          propertyInfo['property'] = invoiceData['property'];
        }
        if (invoiceData['property_details'] != null) {
          propertyInfo['property_details'] = invoiceData['property_details'];
        }
        if (invoiceData['unit'] != null) {
          propertyInfo['unit'] = invoiceData['unit'];
        }
        if (invoiceData['node'] != null) {
          propertyInfo['node'] = invoiceData['node'];
        }

        // If we found property information, return it
        if (propertyInfo.isNotEmpty) {
          return propertyInfo;
        }
      }

      return null;
    } catch (e) {
      // If there's an error, return null instead of throwing
      return null;
    }
  }

  Invoice _parseInvoiceFromApi(Map<String, dynamic> data) {
    try {
      // Use the generated fromJson method which handles null values safely
      return Invoice.fromJson(data);
    } catch (e) {
      throw Exception('Failed to parse invoice data: $e');
    }
  }

  Payment _parsePaymentFromApi(Map<String, dynamic> data) {
    try {
      return Payment(
        id: data['id'] as String,
        transactionId: data['transaction_id'] as String,
        amount: data['amount'] as String, // Keep as string, don't parse
        paymentMethod: data['payment_method'] as String,
        status: data['status'] as String,
        paymentDate: data['payment_date'] as String,
        currency: data['currency'] as String? ?? 'USD',
        notes: data['notes'] as String? ?? '',
      );
    } catch (e) {
      print('Error parsing payment: $e');
      print('Payment data: $data');
      throw Exception('Failed to parse payment data: $e');
    }
  }

  InvoiceItem _parseInvoiceItemFromApi(Map<String, dynamic> data) {
    try {
      return InvoiceItem(
        id: data['id'] as String,
        description: data['description'] as String,
        type: data['type'] as String,
        quantity: (data['quantity'] as num).toInt(),
        amount: data['amount'] as String,
        price: data['price'] as String,
        rate: data['rate'] as String,
        nodeName: data['node_name'] as String? ?? '',
        percentageRate: (data['percentage_rate'] as num?)?.toDouble(),
        serviceId: data['service_id'] as String?,
        penaltyId: data['penalty_id'] as String?,
      );
    } catch (e) {
      throw Exception('Failed to parse invoice item data: $e');
    }
  }
}

class TenantInvoicesResult {
  final List<Invoice> invoices;
  final int total;
  final int page;
  final int pageSize;

  TenantInvoicesResult({
    required this.invoices,
    required this.total,
    required this.page,
    required this.pageSize,
  });
}

class InvoiceDetailResult {
  final Invoice invoice;
  final List<InvoiceItem> items;
  final List<Payment> payments;

  InvoiceDetailResult({
    required this.invoice,
    required this.items,
    required this.payments,
  });
}
