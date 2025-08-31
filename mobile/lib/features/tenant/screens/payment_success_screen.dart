import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/enhanced_card.dart';
import '../../../core/models/invoice_model.dart';
import '../../../core/utils/payment_method_utils.dart';

class PaymentSuccessScreen extends StatelessWidget {
  final Invoice invoice;
  final Map<String, dynamic> paymentData;

  const PaymentSuccessScreen({
    super.key,
    required this.invoice,
    required this.paymentData,
  });

  @override
  Widget build(BuildContext context) {
    // Debug logging to see what data we're receiving
    if (kDebugMode) {
      print('=== Payment Success Screen Debug ===');
      print('Invoice ID: ${invoice.id}');
      print('Invoice Number: ${invoice.invoiceNumber}');
      print('Total Amount: ${invoice.totalAmount}');
      print('Balance: ${invoice.balance}');
      print('Payment Data: $paymentData');
      print('Amount Paid: ${paymentData['amountPaid']}');
      print('Payment Method: ${paymentData['paymentMethod']}');
      print('Selected Account Name: ${paymentData['selectedAccountName']}');
      print('==============================');
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Get.back(),
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        title: const Text(
          'Payment Success',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const SizedBox(height: 20),

            // Success Icon and Message
            Container(
              padding: const EdgeInsets.all(40),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppColors.success.withOpacity(0.3),
                  width: 2,
                ),
              ),
              child: Column(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      color: Colors.white,
                      size: 50,
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Payment Successful!',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.success,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your payment has been processed successfully.',
                    style: TextStyle(
                      fontSize: 16,
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Payment Details Card
            EnhancedCard(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            Icons.receipt_rounded,
                            color: AppColors.primary,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 16),
                        const Text(
                          'Payment Details',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    _buildDetailRow('Invoice Number', invoice.invoiceNumber),
                    _buildDetailRow(
                      'Amount Paid',
                      'KES ${paymentData['amountPaid']?.toStringAsFixed(2) ?? 'N/A'}',
                    ),
                    _buildDetailRow(
                      'Payment Method',
                      _getPaymentMethodName(paymentData['paymentMethod'] ?? ''),
                    ),
                    _buildDetailRow(
                      'Payment Date',
                      _formatDate(DateTime.now()),
                    ),
                    if (paymentData['notes']?.isNotEmpty == true)
                      _buildDetailRow('Notes', paymentData['notes'] ?? ''),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Invoice Summary Card
            EnhancedCard(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.info.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            Icons.info_rounded,
                            color: AppColors.info,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 16),
                        const Text(
                          'Invoice Summary',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    _buildSummaryRow(
                      'Total Amount',
                      'KES ${_parseAmount(invoice.totalAmount).toStringAsFixed(2)}',
                      AppColors.textPrimary,
                    ),
                    _buildSummaryRow(
                      'Previous Balance',
                      'KES ${_parseAmount(invoice.balance).toStringAsFixed(2)}',
                      AppColors.warning,
                    ),
                    _buildSummaryRow(
                      'Amount Paid',
                      'KES ${paymentData['amountPaid']?.toStringAsFixed(2) ?? '0.00'}',
                      AppColors.success,
                    ),
                    _buildSummaryRow(
                      'New Balance',
                      _calculateNewBalance(),
                      AppColors.info,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Simple Done Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Get.until((route) => route.isFirst),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Done',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  String _getPaymentMethodName(String paymentMethodCode) {
    if (paymentMethodCode.isEmpty) return 'N/A';

    try {
      // Use the utility function to get the human-readable name
      return PaymentMethodUtils.getPaymentMethodName(paymentMethodCode);
    } catch (e) {
      // Fallback to the original code if utility function fails
      if (paymentMethodCode.contains('_')) {
        return paymentMethodCode
            .split('_')
            .map(
              (word) =>
                  word.substring(0, 1).toUpperCase() +
                  word.substring(1).toLowerCase(),
            )
            .join(' ');
      }
      return paymentMethodCode.substring(0, 1).toUpperCase() +
          paymentMethodCode.substring(1).toLowerCase();
    }
  }

  String _calculateNewBalance() {
    try {
      final currentBalance = _parseAmount(invoice.balance);
      final paymentAmount = paymentData['amountPaid'] ?? 0.0;
      final newBalance = currentBalance - paymentAmount;

      if (newBalance <= 0) {
        return 'PAID';
      } else {
        return 'KES ${newBalance.toStringAsFixed(2)}';
      }
    } catch (e) {
      return 'N/A';
    }
  }

  double _parseAmount(String amount) {
    try {
      // Extract numeric value from formatted string like "KES 1,100"
      final numericMatch = RegExp(r'[\d,]+\.?\d*').firstMatch(amount);
      if (numericMatch != null) {
        final numericString = numericMatch.group(0)!.replaceAll(',', '');
        return double.tryParse(numericString) ?? 0.0;
      }
      return 0.0;
    } catch (e) {
      return 0.0;
    }
  }
}
