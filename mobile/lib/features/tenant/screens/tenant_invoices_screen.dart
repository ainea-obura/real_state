import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';

class TenantInvoicesScreen extends StatefulWidget {
  const TenantInvoicesScreen({super.key});

  @override
  State<TenantInvoicesScreen> createState() => _TenantInvoicesScreenState();
}

class _TenantInvoicesScreenState extends State<TenantInvoicesScreen> {
  // Track selected invoice IDs
  final Set<String> selectedInvoices = <String>{};
  // Track if bulk payment section is expanded
  bool isBulkPaymentExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Main scrollable content
          Expanded(
            child: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Invoices Section Header
                    const Text(
                      'My Invoices',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Invoice List
                    _buildInvoiceList(),

                    // Add bottom padding to prevent content from being hidden behind the button
                    if (selectedInvoices.isNotEmpty)
                      const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ),

          // Bulk Payment Button - Fixed at bottom, outside scrollable area
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            height: selectedInvoices.isNotEmpty ? 80 : 0,
            child: selectedInvoices.isNotEmpty
                ? Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      border: Border(
                        top: BorderSide(
                          color: AppColors.border.withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                          offset: const Offset(0, -2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              _showBulkPaymentDialog();
                            },
                            icon: const Icon(Icons.payment_rounded, size: 20),
                            label: Text(
                              'Pay Selected (${selectedInvoices.length})',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: AppColors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton.icon(
                          onPressed: _clearAllSelections,
                          icon: const Icon(Icons.clear, size: 20),
                          label: const Text(
                            'Clear',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.muted,
                            foregroundColor: AppColors.textSecondary,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 16,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  void _toggleInvoiceSelection(String invoiceNumber) {
    print('Before toggle: $selectedInvoices');
    setState(() {
      if (selectedInvoices.contains(invoiceNumber)) {
        selectedInvoices.remove(invoiceNumber);
        print('Removed $invoiceNumber');
      } else {
        selectedInvoices.add(invoiceNumber);
        print('Added $invoiceNumber');
      }
    });
    print('After toggle: $selectedInvoices');
    print('Selected count: ${selectedInvoices.length}');
    print('Should show button: ${selectedInvoices.isNotEmpty}');
  }

  void _clearAllSelections() {
    setState(() {
      selectedInvoices.clear();
    });
  }

  Widget _buildInvoiceList() {
    final invoices = [
      {
        'number': 'INV-2024-001',
        'description': 'January 2025 Rent',
        'amount': '\$1,200.00',
        'dueDate': 'Due Jan 31, 2025',
        'status': 'Issued',
        'statusColor': AppColors.warning,
        'isPaid': false,
      },
      {
        'number': 'INV-2024-002',
        'description': 'February 2025 Rent',
        'amount': '\$1,200.00',
        'dueDate': 'Due Feb 28, 2025',
        'status': 'Partial',
        'statusColor': AppColors.warning,
        'isPaid': false,
      },
      {
        'number': 'INV-2024-012',
        'description': 'December 2024 Rent',
        'amount': '\$1,200.00',
        'dueDate': 'Paid Dec 28, 2024',
        'status': 'Paid',
        'statusColor': AppColors.success,
        'isPaid': true,
      },
      {
        'number': 'INV-2024-011',
        'description': 'November 2024 Rent',
        'amount': '\$1,200.00',
        'dueDate': 'Paid Nov 29, 2024',
        'status': 'Paid',
        'statusColor': AppColors.success,
        'isPaid': true,
      },
      {
        'number': 'INV-2024-010',
        'description': 'October 2024 Rent',
        'amount': '\$1,200.00',
        'dueDate': 'Paid Oct 30, 2024',
        'status': 'Paid',
        'statusColor': AppColors.success,
        'isPaid': true,
      },
    ];

    return Column(
      children: invoices.map((invoice) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _buildInvoiceCard(
            invoice['number'] as String,
            invoice['description'] as String,
            invoice['amount'] as String,
            invoice['dueDate'] as String,
            invoice['status'] as String,
            invoice['statusColor'] as Color,
          ),
        );
      }).toList(),
    );
  }

  Widget _buildInvoiceCard(
    String invoiceNumber,
    String description,
    String amount,
    String dueDate,
    String statusText,
    Color statusColor,
  ) {
    // Determine background color and border based on status
    Color backgroundColor;
    Color borderColor;

    switch (statusText.toLowerCase()) {
      case 'paid':
        backgroundColor = AppColors.success.withOpacity(0.05);
        borderColor = AppColors.success.withOpacity(0.2);
        break;
      case 'issued':
        backgroundColor = AppColors.warning.withOpacity(0.05);
        borderColor = AppColors.warning.withOpacity(0.2);
        break;
      case 'draft':
        backgroundColor = AppColors.info.withOpacity(0.05);
        borderColor = AppColors.info.withOpacity(0.2);
        break;
      default:
        backgroundColor = AppColors.muted.withOpacity(0.05);
        borderColor = AppColors.muted.withOpacity(0.2);
    }

    final bool isPaid = statusText.toLowerCase() == 'paid';
    final bool isDraft = statusText.toLowerCase() == 'draft';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Selection Checkbox + Invoice Number + Status Badge
          Row(
            children: [
              // Selection Checkbox
              Checkbox(
                value: selectedInvoices.contains(invoiceNumber),
                onChanged: (bool? value) {
                  print(
                    'Checkbox tapped for $invoiceNumber, current selection: $selectedInvoices',
                  );
                  _toggleInvoiceSelection(invoiceNumber);
                  print('After toggle, selection: $selectedInvoices');
                },
                activeColor: AppColors.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 8),

              // Invoice Number Section
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.receipt_long_rounded,
                            size: 16,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Invoice',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              Text(
                                invoiceNumber,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              // Status Badge
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: statusColor.withOpacity(0.3),
                    width: 1.5,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _getStatusIcon(statusText),
                      size: 14,
                      color: statusColor,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      statusText,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Description Section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppColors.border.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.description_rounded,
                  size: 18,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    description,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      height: 1.3,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Amount and Due Date Row
          Row(
            children: [
              // Amount Section
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primary.withOpacity(0.2),
                      width: 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.attach_money_rounded,
                            size: 16,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Amount',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        amount,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Due Date Section
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.info.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.info.withOpacity(0.2),
                      width: 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.calendar_today_rounded,
                            size: 16,
                            color: AppColors.info,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Due Date',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        dueDate,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.info,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Action Row
          Row(
            children: [
              // Status Info
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        _getStatusIcon(statusText),
                        size: 16,
                        color: statusColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Status: $statusText',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'paid':
        return Icons.check_circle_rounded;
      case 'issued':
        return Icons.schedule_rounded;
      case 'draft':
        return Icons.edit_note_rounded;
      default:
        return Icons.info_outline_rounded;
    }
  }

  void _showBulkPaymentDialog() {
    Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.payment_rounded,
                color: AppColors.primary,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Bulk Payment (${selectedInvoices.length} invoices)',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.muted,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Selected Invoices:',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...selectedInvoices.map(
                    (invoiceId) => Text(
                      '• $invoiceId',
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Please select your payment method:',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: Text(
              'Cancel',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Get.back();
              Get.snackbar(
                'Bulk Payment Initiated',
                'Payment for ${selectedInvoices.length} invoices is being processed...',
                backgroundColor: AppColors.success,
                colorText: AppColors.white,
                snackPosition: SnackPosition.TOP,
                borderRadius: 12,
                margin: const EdgeInsets.all(16),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('Pay with M-Pesa'),
          ),
        ],
      ),
    );
  }
}
