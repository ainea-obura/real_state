import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/toast_utils.dart';
import '../../../core/controllers/auth_controller.dart';
import '../../../core/models/invoice_model.dart';
import '../services/account_service.dart';
import '../services/payment_service.dart' as OwnerPaymentService;
import '../../../core/config/api_config.dart';
import '../../../core/utils/payment_method_utils.dart';

class OwnerMultiInvoicePaymentModal extends StatefulWidget {
  final List<Invoice> selectedInvoices;
  final String totalAmount;

  const OwnerMultiInvoicePaymentModal({
    super.key,
    required this.selectedInvoices,
    required this.totalAmount,
  });

  @override
  State<OwnerMultiInvoicePaymentModal> createState() =>
      _OwnerMultiInvoicePaymentModalState();
}

class _OwnerMultiInvoicePaymentModalState
    extends State<OwnerMultiInvoicePaymentModal> {
  final AuthController _authController = Get.find<AuthController>();
  OwnerPaymentService.PaymentService? _paymentService;
  bool _isServiceAvailable = false;

  @override
  void initState() {
    super.initState();
    _initializePaymentService();
    _loadUserPaymentMethods();
    _initializeInvoiceAmountControllers();
    _resetRetryCount();
  }

  void _resetRetryCount() {
    _retryCount = 0;
  }

  void _initializePaymentService() {
    try {
      if (kDebugMode) {
        print('=== OwnerPaymentService Initialization Debug ===');
        print(
          'Attempting to find OwnerPaymentService with tag: owner_payment_service',
        );
        print('Available services in Get: ${Get.keys}');
      }

      _paymentService = Get.find<OwnerPaymentService.PaymentService>(
        tag: 'owner_payment_service',
      );
      _isServiceAvailable = true;
      if (kDebugMode) {
        print('OwnerPaymentService initialized successfully via Get.find');
        print('Service instance: $_paymentService');
      }
    } catch (e) {
      _isServiceAvailable = false;
      if (kDebugMode) {
        print('OwnerPaymentService Get.find failed: $e');
        print('Error type: ${e.runtimeType}');
        print('Available services: ${Get.keys}');
      }
      ToastUtils.showError(
        'Payment service not available. Please restart the app.',
      );
    }
  }

  void _handleServiceUnavailable() {
    setState(() {
      _isServiceAvailable = false;
      _isLoading = false;
    });

    ToastUtils.showError(
      'Payment service is currently unavailable. Please try again later.',
    );
  }

  // State variables
  List<Map<String, String?>> _availablePaymentMethods = [];
  String _selectedPaymentMethod = '';
  final TextEditingController _notesController = TextEditingController();
  bool _isLoading = false;
  bool _isLoadingPaymentMethods = false;
  int _retryCount = 0;
  static const int _maxRetries = 2;

  // Invoice amount controllers for individual amounts
  final Map<String, TextEditingController> _invoiceAmountControllers = {};

  void _initializeInvoiceAmountControllers() {
    // Safety check: ensure we have valid invoices
    if (widget.selectedInvoices.isEmpty) {
      Get.snackbar(
        'No Invoices',
        'No invoices provided to the modal',
        snackPosition: SnackPosition.TOP,
        backgroundColor: AppColors.error,
        colorText: Colors.white,
      );
      Get.back(); // Close the modal
      return;
    }

    // Clear any existing controllers first
    for (final controller in _invoiceAmountControllers.values) {
      controller.dispose();
    }
    _invoiceAmountControllers.clear();

    // Create new controllers for each invoice
    for (final invoice in widget.selectedInvoices) {
      if (invoice.id.isNotEmpty) {
        _invoiceAmountControllers[invoice.id] = TextEditingController(
          text: _parseAmount(invoice.balance).toString(),
        );
        print(
          'Created controller for invoice ${invoice.id}: ${invoice.invoiceNumber}',
        );
      } else {
        print('Warning: Invoice with empty ID found: ${invoice.invoiceNumber}');
      }
    }

    // Verify we have controllers for all invoices
    if (_invoiceAmountControllers.length != widget.selectedInvoices.length) {
      print(
        'Warning: Not all invoices have controllers. Expected: ${widget.selectedInvoices.length}, Got: ${_invoiceAmountControllers.length}',
      );
      print(
        'Invoice IDs: ${widget.selectedInvoices.map((i) => i.id).toList()}',
      );
      print('Controller keys: ${_invoiceAmountControllers.keys.toList()}');
    } else {
      print(
        'Successfully created ${_invoiceAmountControllers.length} controllers for ${widget.selectedInvoices.length} invoices',
      );
    }
  }

  @override
  void dispose() {
    for (final controller in _invoiceAmountControllers.values) {
      controller.dispose();
    }
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadUserPaymentMethods() async {
    setState(() => _isLoadingPaymentMethods = true);

    try {
      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        throw Exception('User not authenticated');
      }

      final accounts = await AccountService.getUserAccounts(currentUser.id);
      final activeAccounts = accounts
          .where((account) => account.isActive)
          .toList();
      final validAccounts = activeAccounts
          .where(
            (account) =>
                account.accountCode != null && account.accountCode!.isNotEmpty,
          )
          .toList();

      if (validAccounts.isEmpty) {
        validAccounts.addAll(activeAccounts);
      }

      _availablePaymentMethods = validAccounts.map((account) {
        String paymentMethodCode = account.accountCode ?? account.id;
        String displayName = account.accountName;

        return {
          'code': paymentMethodCode,
          'name': displayName,
          'accountId': account.id,
          'accountName': account.accountName,
          'accountType': account.accountType,
          'accountNumber': account.accountNumber,
          'bankName': account.bankName,
        };
      }).toList();

      if (_availablePaymentMethods.isNotEmpty) {
        _selectedPaymentMethod = _availablePaymentMethods.first['code']!;
      }
    } catch (e) {
      ToastUtils.showError('Failed to load payment methods: ${e.toString()}');
    } finally {
      setState(() => _isLoadingPaymentMethods = false);
    }
  }

  double _parseAmount(String amount) {
    try {
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

  double _getTotalPaymentAmount() {
    double total = 0.0;
    for (final controller in _invoiceAmountControllers.values) {
      total += double.tryParse(controller.text) ?? 0.0;
    }
    return total;
  }

  bool _isValidPayment() {
    final amount = _getTotalPaymentAmount();
    final totalBalance = widget.selectedInvoices.fold<double>(
      0.0,
      (sum, invoice) => sum + _parseAmount(invoice.balance),
    );

    if (kDebugMode) {
      print('=== Multi-Invoice Payment Validation Debug ===');
      print('Total Amount: $amount');
      print('Total Balance: $totalBalance');
      print('Amount > 0: ${amount > 0}');
      print('Amount <= Total Balance: ${amount <= totalBalance}');
      print('Payment Method Selected: ${_selectedPaymentMethod.isNotEmpty}');
      print('Service Available: $_isServiceAvailable');
      print('==============================');
    }

    return amount > 0 &&
        amount <= totalBalance &&
        _selectedPaymentMethod.isNotEmpty &&
        _isServiceAvailable;
  }

  String? _getAmountError() {
    final amount = _getTotalPaymentAmount();
    final totalBalance = widget.selectedInvoices.fold<double>(
      0.0,
      (sum, invoice) => sum + _parseAmount(invoice.balance),
    );

    if (amount <= 0) {
      return 'Payment amount must be greater than 0';
    }

    if (amount > totalBalance) {
      return 'Payment amount cannot exceed total invoice balance (${totalBalance.toStringAsFixed(2)})';
    }

    return null;
  }

  bool _shouldRetryError(String errorMessage) {
    // Only retry for technical/network errors, not business logic errors
    final technicalErrors = [
      'network',
      'connection',
      'timeout',
      'server error',
      'internal error',
      'unavailable',
      'failed to connect',
    ];

    final lowerError = errorMessage.toLowerCase();
    return technicalErrors.any((error) => lowerError.contains(error));
  }

  Future<void> _cancelPayment() async {
    if (_isLoading) {
      // Reset loading state
      setState(() {
        _isLoading = false;
        _retryCount = 0;
      });

      Get.back(); // Close the modal
      ToastUtils.showInfo('Payment cancelled.');
    }
  }

  Future<void> _submitPayment() async {
    if (!_isValidPayment()) {
      if (kDebugMode) {
        print('Payment validation failed - cannot submit');
      }
      return;
    }

    // Prevent multiple submissions
    if (_isLoading) {
      if (kDebugMode) {
        print('Payment already in progress - ignoring duplicate submission');
      }
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Check if payment service is available
      if (_paymentService == null) {
        _handleServiceUnavailable();
        return;
      }

      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        throw Exception('User not authenticated');
      }

      // Get the selected account name for display
      String selectedAccountName = 'Unknown';
      try {
        final selectedMethod = _availablePaymentMethods.firstWhere(
          (m) => m['code'] == _selectedPaymentMethod,
        );
        selectedAccountName = selectedMethod['accountName'] ?? 'Unknown';
      } catch (e) {
        selectedAccountName = 'Unknown';
      }

      // Map account type to payment method code using utility
      String paymentMethodCode = '';
      try {
        final selectedMethod = _availablePaymentMethods.firstWhere(
          (m) => m['code'] == _selectedPaymentMethod,
        );
        paymentMethodCode = PaymentMethodUtils.mapAccountTypeToPaymentMethod(
          accountType: selectedMethod['accountType'] ?? '',
          bankName: selectedMethod['bankName'] ?? '',
          fallbackCode: _selectedPaymentMethod,
        );
      } catch (e) {
        paymentMethodCode = _selectedPaymentMethod; // Fallback to original code
      }

      final invoicesApplied = widget.selectedInvoices.map((invoice) {
        final amount =
            double.tryParse(
              _invoiceAmountControllers[invoice.id]?.text ?? '0',
            ) ??
            0.0;
        return {
          'id': invoice.id,
          'invoiceNumber': invoice.invoiceNumber,
          'amount': _parseAmount(invoice.totalAmount),
          'appliedAmount': amount,
        };
      }).toList();

      final paymentData = {
        'recipientType': 'owner', // Changed from 'tenant' to 'owner'
        'recipient': {'id': currentUser.id, 'name': currentUser.displayName},
        'paymentDate': DateTime.now().toIso8601String().split('T')[0],
        'paymentMethod': paymentMethodCode,
        'selectedAccountName': selectedAccountName,
        'amountPaid': _getTotalPaymentAmount(),
        'notes': _notesController.text.trim(),
        'sendReceipt': false,
        'invoicesApplied': invoicesApplied,
        'transactionsApplied': [],
        'totalApplied': _getTotalPaymentAmount(),
        'balance': 0,
        'status': 'PAID',
      };

      if (kDebugMode) {
        print('=== Multi-Invoice Payment Data Debug ===');
        print('Payment Data: $paymentData');
        print('Selected Invoices: ${widget.selectedInvoices.length}');
        print('Total Amount: ${_getTotalPaymentAmount()}');
        print('Selected Account Name: $selectedAccountName');
        print('Original Method Code: $_selectedPaymentMethod');
        print('Mapped Payment Method: $paymentMethodCode');
        print('Calling PaymentService.submitPayment...');
        print('========================');
      }

      // Call payment service (timeout is now handled in the service)
      if (kDebugMode) {
        print('=== Calling PaymentService.submitPayment ===');
        print('Payment Data: $paymentData');
      }

      final result = await _paymentService!.submitPayment(paymentData);

      if (kDebugMode) {
        print('=== API Response Debug ===');
        print('Full Response: $result');
        print('Response Type: ${result.runtimeType}');
        print('Success: ${result['success']}');
        print('Success Type: ${result['success'].runtimeType}');
        print('Success == true: ${result['success'] == true}');
        print('Message: ${result['message']}');
        print('Error: ${result['error']}');
        print('Timeout: ${result['timeout']}');
        print('========================');
      }

      if (result['success'] == true) {
        if (kDebugMode) {
          print('=== SUCCESS: Payment submitted successfully! ===');
          print('Showing success toast...');
        }
        ToastUtils.showSuccess('Payment submitted successfully!');

        if (kDebugMode) {
          print('Toast shown, waiting 2 seconds before closing modal...');
        }

        // Wait a bit to ensure toast is visible before closing modal
        await Future.delayed(const Duration(seconds: 2));

        if (kDebugMode) {
          print('Now closing modal...');
        }
        Get.back(result: true); // Return success to refresh the finance screen
      } else {
        // Check if this is a timeout case
        if (result['timeout'] == true) {
          ToastUtils.showWarning(
            'Payment request timed out. Your payment may still be processing. Please check your payment history later.',
          );
          Get.back(); // Close the modal
          return;
        }

        // Extract the actual error message from the backend response
        String errorMessage = 'Payment failed';
        if (result['message'] != null &&
            result['message'].toString().isNotEmpty) {
          errorMessage = result['message'].toString();
        } else if (result['error'] != null &&
            result['error'].toString().isNotEmpty) {
          errorMessage = result['error'].toString();
        }

        // Show the actual error message from backend
        ToastUtils.showError(errorMessage);

        // Check if we should retry (only for network/technical errors, not business logic errors)
        if (_retryCount < _maxRetries && _shouldRetryError(errorMessage)) {
          _retryCount++;
          ToastUtils.showWarning('Retrying... ($_retryCount/$_maxRetries)');

          // Wait a moment before retrying
          await Future.delayed(const Duration(seconds: 2));

          // Retry the payment
          await _submitPayment();
          return;
        } else {
          // Max retries reached or business logic error
          _retryCount = 0; // Reset for next attempt
          if (_shouldRetryError(errorMessage)) {
            ToastUtils.showError(
              'Payment failed after $_maxRetries attempts. Please try again later.',
            );
          }
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('Multi-invoice payment submission error: $e');
        print('Error type: ${e.runtimeType}');
        print('Stack trace: ${StackTrace.current}');
      }

      // Handle different types of errors
      if (e.toString().contains('timed out')) {
        ToastUtils.showWarning(
          'Payment request timed out. Your payment may still be processing. Please check your payment history later.',
        );
      } else if (e.toString().contains('network') ||
          e.toString().contains('connection')) {
        ToastUtils.showError(
          'Network error. Please check your connection and try again.',
        );
      } else {
        ToastUtils.showError('Payment submission failed: ${e.toString()}');
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Safety check: ensure controllers are initialized
    if (_invoiceAmountControllers.isEmpty &&
        widget.selectedInvoices.isNotEmpty) {
      // Re-initialize controllers if they're missing
      _initializeInvoiceAmountControllers();
    }

    // If still no controllers, show error state
    if (_invoiceAmountControllers.isEmpty) {
      return Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Container(
          width: double.maxFinite,
          constraints: const BoxConstraints(maxHeight: 200),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.error_outline_rounded,
                color: AppColors.error,
                size: 48,
              ),
              const SizedBox(height: 16),
              Text(
                'Error Initializing Payment Modal',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Unable to initialize payment controllers. Please try again.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => Get.back(),
                child: const Text('Close'),
              ),
            ],
          ),
        ),
      );
    }

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        width: double.maxFinite,
        constraints: const BoxConstraints(maxHeight: 650),
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Compact Header
              _buildCompactHeader(),

              const SizedBox(height: 20),

              // Payment Method Section (First)
              _buildPaymentMethodSection(),

              const SizedBox(height: 20),

              // Invoices List (Direct in main flow)
              _buildInvoicesList(),

              const SizedBox(height: 20),

              // Notes Section (Last)
              _buildNotesSection(),

              const SizedBox(height: 20),

              // Submit Button
              _buildSubmitButton(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCompactHeader() {
    return Row(
      children: [
        // Payment Icon
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            Icons.payment_rounded,
            color: AppColors.primary,
            size: 22,
          ),
        ),

        const SizedBox(width: 12),

        // Title and Count
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Pay Multiple Invoices',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '${widget.selectedInvoices.length} invoice${widget.selectedInvoices.length == 1 ? '' : 's'} selected',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),

        // Close Button
        IconButton(
          onPressed: () => Get.back(),
          icon: const Icon(Icons.close, size: 20),
          style: IconButton.styleFrom(
            backgroundColor: Colors.grey.withValues(alpha: 0.1),
            padding: const EdgeInsets.all(8),
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentMethodSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header
        Row(
          children: [
            Icon(Icons.payment_rounded, size: 18, color: AppColors.primary),
            const SizedBox(width: 8),
            Text(
              'Payment Method',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        // Payment Method Dropdown
        if (_isLoadingPaymentMethods)
          Container(
            padding: const EdgeInsets.all(20),
            child: const Center(child: CircularProgressIndicator()),
          )
        else if (_availablePaymentMethods.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
            ),
            child: const Center(
              child: Text(
                'No payment methods available. Please add a payment account first.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            ),
          )
        else
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: AppColors.borderLight, width: 1.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedPaymentMethod,
                hint: const Text('Select payment method'),
                isExpanded: true,
                items: _availablePaymentMethods.map((method) {
                  return DropdownMenuItem<String>(
                    value: method['code'] ?? '',
                    child: Container(
                      constraints: const BoxConstraints(maxHeight: 50),
                      child: Row(
                        children: [
                          Icon(
                            (method['accountType'] ?? '') == 'bank'
                                ? Icons.account_balance
                                : Icons.phone_android,
                            size: 18,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  method['accountName'] ?? 'Unknown Account',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1,
                                ),
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        method['accountNumber'] ?? '',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[600],
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                        maxLines: 1,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      method['bankName'] ?? 'Unknown',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey[500],
                                        fontWeight: FontWeight.w500,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                      maxLines: 1,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
                onChanged: (String? methodCode) {
                  setState(() {
                    _selectedPaymentMethod = methodCode ?? '';
                  });
                },
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildInvoicesList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header
        Row(
          children: [
            Icon(
              Icons.receipt_long_rounded,
              size: 18,
              color: AppColors.primary,
            ),
            const SizedBox(width: 8),
            Text(
              'Invoice Details',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        // Invoices List (Simple, no cards)
        ...widget.selectedInvoices
            .where((invoice) => _invoiceAmountControllers[invoice.id] != null)
            .map((invoice) {
              final controller = _invoiceAmountControllers[invoice.id]!;
              final balance = _parseAmount(invoice.balance);

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Simple Invoice Label
                  Text(
                    'Invoice ${invoice.invoiceNumber}',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Amount Input Row
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: controller,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(fontSize: 16),
                          decoration: InputDecoration(
                            labelText: 'Amount to Pay',
                            prefixText: 'KES ',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            helperText: 'Max: ${balance.toStringAsFixed(2)}',
                            helperStyle: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          onChanged: (value) {
                            // Validate input doesn't exceed balance
                            final inputAmount = double.tryParse(value) ?? 0.0;
                            if (inputAmount > balance) {
                              controller.text = balance.toString();
                            }
                            setState(() {});
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Use Full Balance Button
                      IconButton(
                        onPressed: () {
                          controller.text = balance.toString();
                          setState(() {});
                        },
                        icon: const Icon(Icons.restore, size: 20),
                        tooltip: 'Use Full Balance',
                        style: IconButton.styleFrom(
                          backgroundColor: AppColors.primary.withValues(
                            alpha: 0.1,
                          ),
                          foregroundColor: AppColors.primary,
                          padding: const EdgeInsets.all(8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],
              );
            })
            ,

        // Total Amount Display
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.success.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.success.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              Icon(Icons.calculate_rounded, color: AppColors.success, size: 20),
              const SizedBox(width: 12),
              Text(
                'Total Payment:',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              Text(
                'KES ${_getTotalPaymentAmount().toStringAsFixed(2)}',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.success,
                ),
              ),
            ],
          ),
        ),

        // Error Display
        if (_getAmountError() != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.error.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.error.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.error_outline_rounded,
                  color: AppColors.error,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _getAmountError()!,
                    style: TextStyle(fontSize: 14, color: AppColors.error),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildNotesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.note_rounded, size: 18, color: AppColors.primary),
            const SizedBox(width: 8),
            Text(
              'Notes (Optional)',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _notesController,
          maxLines: 3,
          style: const TextStyle(fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Add any notes about this payment...',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.borderLight, width: 1.5),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.primary, width: 2),
            ),
            filled: true,
            fillColor: Colors.grey.withValues(alpha: 0.05),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
      ],
    );
  }

  Widget _buildSubmitButton() {
    return Column(
      children: [
        // Submit Button
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: _isValidPayment() && !_isLoading ? _submitPayment : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: _isLoading
                ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Text(
                        'Processing Payment...',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.payment_rounded, size: 20),
                      const SizedBox(width: 12),
                      Text(
                        'Submit Payment',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
          ),
        ),

        // Cancel Payment Button (only show when loading)
        if (_isLoading) ...[
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: _cancelPayment,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: BorderSide(color: AppColors.error),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Cancel Payment',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],

        // Timeout warning
        if (_isLoading) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: AppColors.warning.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline_rounded,
                  color: AppColors.warning,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Payment processing may take up to 35 seconds. Please wait...',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.warning,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
