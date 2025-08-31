import 'dart:convert';
import 'dart:async';
import '../../../core/services/api_service.dart';
import '../../../core/models/api_error_model.dart';

class PaymentService {
  final ApiService _apiService;

  PaymentService(this._apiService);

  /// Submit a payment for an invoice
  Future<Map<String, dynamic>> submitPayment(
    Map<String, dynamic> paymentData,
  ) async {
    try {
      final response = await _apiService
          .post(
            '/finance/payments/record-payment',
            body: paymentData,
            includeAuth: true,
          )
          .timeout(
            const Duration(seconds: 90),
            onTimeout: () {
              throw TimeoutException(
                'Payment request timed out. Your payment may still be processing.',
              );
            },
          );

      return _handleResponse(response);
    } on ApiException catch (e) {
      return {
        'success': false,
        'message': 'Payment submission failed: ${e.error.message}',
      };
    } on TimeoutException catch (e) {
      return {'success': false, 'message': e.message, 'timeout': true};
    } catch (e) {
      return {
        'success': false,
        'message': 'Payment submission failed: ${e.toString()}',
      };
    }
  }

  /// Get payment history for a specific invoice
  Future<Map<String, dynamic>> getPaymentHistory(String invoiceId) async {
    try {
      final response = await _apiService.get(
        '/finance/payments/history/$invoiceId/',
        includeAuth: true,
      );

      return _handleResponse(response);
    } on ApiException catch (e) {
      return {
        'success': false,
        'message': 'Failed to load payment history: ${e.error.message}',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Failed to load payment history: ${e.toString()}',
      };
    }
  }

  /// Get payment methods available for the user
  Future<Map<String, dynamic>> getPaymentMethods(String userId) async {
    try {
      final response = await _apiService.get(
        '/finance/payments/payment-methods/$userId/',
        includeAuth: true,
      );

      return _handleResponse(response);
    } on ApiException catch (e) {
      return {
        'success': false,
        'message': 'Failed to load payment methods: ${e.error.message}',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Failed to load payment methods: ${e.toString()}',
      };
    }
  }

  /// Validate payment data before submission
  Future<Map<String, dynamic>> validatePayment(
    Map<String, dynamic> paymentData,
  ) async {
    try {
      final response = await _apiService.post(
        '/finance/payments/validate-payment',
        body: paymentData,
        includeAuth: true,
      );

      return _handleResponse(response);
    } on ApiException catch (e) {
      return {
        'success': false,
        'message': 'Payment validation failed: ${e.error.message}',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Payment validation failed: ${e.toString()}',
      };
    }
  }

  /// Check payment status for a specific invoice
  Future<Map<String, dynamic>> checkPaymentStatus(String invoiceId) async {
    try {
      final response = await _apiService
          .get('/finance/payments/status/$invoiceId/', includeAuth: true)
          .timeout(
            const Duration(seconds: 30),
            onTimeout: () {
              throw TimeoutException('Payment status check timed out.');
            },
          );

      return _handleResponse(response);
    } on ApiException catch (e) {
      return {
        'success': false,
        'message': 'Failed to check payment status: ${e.error.message}',
      };
    } on TimeoutException catch (e) {
      return {'success': false, 'message': e.message, 'timeout': true};
    } catch (e) {
      return {
        'success': false,
        'message': 'Failed to check payment status: ${e.toString()}',
      };
    }
  }

  /// Simple response handler - follows web version pattern
  Map<String, dynamic> _handleResponse(dynamic response) {
    try {
      final responseBody = json.decode(response.body) as Map<String, dynamic>;

      // Check if API returned an error (follows web pattern)
      if (responseBody['error'] == true) {
        return {
          'success': false,
          'message': responseBody['message'] ?? 'Operation failed',
          'errors': responseBody['errors'],
        };
      }

      // Success case
      return {
        'success': true,
        'data': responseBody['data'] ?? responseBody,
        'message':
            responseBody['message'] ?? 'Operation completed successfully',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Failed to parse response: ${e.toString()}',
      };
    }
  }
}
