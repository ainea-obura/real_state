import 'dart:convert';
import 'package:get/get.dart';
import '../models/invoice_model.dart';
import '../models/payment_model.dart';
import '../models/invoice_item_model.dart';
import '../services/api_service.dart';
import '../constants/api_constants.dart';
import '../controllers/auth_controller.dart';

class OwnerFinanceService {
  final ApiService _apiService = Get.find<ApiService>();
  final AuthController _authController = Get.find<AuthController>();

  // Fetch owner invoices
  Future<InvoiceResult> fetchOwnerInvoices({
    required String userId,
    int page = 1,
    int pageSize = 20,
  }) async {
    try {
      print('OwnerFinanceService: Fetching owner invoices for user: $userId');

      final response = await _apiService.get(
        '${ApiConstants.ownerInvoicesEndpoint}?user_id=$userId&page=$page&page_size=$pageSize',
      );

      print('OwnerFinanceService: API response status: ${response.statusCode}');
      print('OwnerFinanceService: API response body: ${response.body}');

      if (response.statusCode == 200) {
        final responseData = response.body is String
            ? jsonDecode(response.body) as Map<String, dynamic>
            : response.body as Map<String, dynamic>;
        if (responseData['error'] == false) {
          final data = responseData['data'] as Map<String, dynamic>?;
          final List<dynamic> invoicesData =
              (data?['results'] as List<dynamic>?) ?? [];

          print('OwnerFinanceService: Found ${invoicesData.length} invoices');

          final invoices = invoicesData
              .map((json) => Invoice.fromJson(json))
              .toList();

          return InvoiceResult(
            invoices: invoices,
            total:
                int.tryParse(data?['count']?.toString() ?? '0') ??
                invoices.length,
            page: page,
            hasNext: data?['next'] != null,
          );
        } else {
          throw Exception(
            responseData['message'] ?? 'Failed to fetch owner invoices',
          );
        }
      } else {
        throw Exception('HTTP ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      print('OwnerFinanceService: Error fetching owner invoices: $e');
      rethrow;
    }
  }

  // Fetch invoice detail (same as tenant - gets invoice, payments, and items in one call)
  Future<InvoiceDetailResult> fetchInvoiceDetail({
    required String invoiceId,
  }) async {
    try {
      print('OwnerFinanceService: Fetching invoice detail for: $invoiceId');

      final endpoint = ApiConstants.invoiceDetailEndpoint.replaceAll(
        '{invoice_id}',
        invoiceId,
      );

      print('OwnerFinanceService: Endpoint: $endpoint');

      final response = await _apiService.get(endpoint);

      print('OwnerFinanceService: API response status: ${response.statusCode}');
      print('OwnerFinanceService: API response body: ${response.body}');

      if (response.statusCode == 200) {
        final responseData = response.body is String
            ? jsonDecode(response.body) as Map<String, dynamic>
            : response.body as Map<String, dynamic>;

        if (responseData['error'] == false) {
          final data = responseData['data'] as Map<String, dynamic>?;
          final invoiceData = data?['invoice'] as Map<String, dynamic>?;
          final List<dynamic> paymentsData =
              (data?['payments'] as List<dynamic>?) ?? [];
          final List<dynamic> itemsData =
              (data?['items'] as List<dynamic>?) ?? [];

          print(
            'OwnerFinanceService: Found ${paymentsData.length} payments and ${itemsData.length} items',
          );

          final payments = paymentsData
              .map((json) => Payment.fromJson(json))
              .toList();

          final items = itemsData
              .map((json) => InvoiceItem.fromJson(json))
              .toList();

          return InvoiceDetailResult(
            payments: payments,
            items: items,
            total: payments.length + items.length,
          );
        } else {
          throw Exception(
            responseData['message'] ?? 'Failed to fetch invoice detail',
          );
        }
      } else {
        throw Exception('HTTP ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      print('OwnerFinanceService: Error fetching invoice detail: $e');
      rethrow;
    }
  }
}

// Result classes for type safety
class InvoiceResult {
  final List<Invoice> invoices;
  final int total;
  final int page;
  final bool hasNext;

  InvoiceResult({
    required this.invoices,
    required this.total,
    required this.page,
    required this.hasNext,
  });
}

class InvoiceDetailResult {
  final List<Payment> payments;
  final List<InvoiceItem> items;
  final int total;

  InvoiceDetailResult({
    required this.payments,
    required this.items,
    required this.total,
  });
}
