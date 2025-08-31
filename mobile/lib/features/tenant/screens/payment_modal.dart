import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/toast_utils.dart';
import '../../../core/controllers/auth_controller.dart';
import '../../../core/models/invoice_model.dart';
import '../services/account_service.dart';
import '../services/payment_service.dart' as TenantPaymentService;
import 'payment_success_screen.dart';
import '../../../core/config/api_config.dart';
import '../../../core/utils/payment_method_utils.dart';

class PaymentModal extends StatefulWidget {
  final Invoice invoice;

  const PaymentModal({super.key, required this.invoice});

  @override
  State<PaymentModal> createState() => _PaymentModalState();
}

class _PaymentModalState extends State<PaymentModal> {
  final AuthController _authController = Get.find<AuthController>();
  TenantPaymentService.PaymentService? _paymentService;
  bool _isServiceAvailable = false;

  @override
  void initState() {
    super.initState();
    _initializePaymentService();
    _loadUserPaymentMethods();
    _initializeAmount();
    _resetRetryCount();
  }

  void _resetRetryCount() {
    _retryCount = 0;
  }

  void _initializePaymentService() {
    try {
      if (kDebugMode) {
        print('=== TenantPaymentService Initialization Debug ===');
        print(
          'Attempting to find TenantPaymentService with tag: tenant_payment_service',
        );
        print('Available services in Get: ${Get.keys}');
      }

      _paymentService = Get.find<TenantPaymentService.PaymentService>(
        tag: 'tenant_payment_service',
      );
      _isServiceAvailable = true;
      if (kDebugMode) {
        print('PaymentService initialized successfully via Get.find');
        print('Service instance: $_paymentService');
      }
    } catch (e) {
      _isServiceAvailable = false;
      if (kDebugMode) {
        print('PaymentService Get.find failed: $e');
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
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();
  bool _isLoading = false;
  bool _isLoadingPaymentMethods = false;
  int _retryCount = 0;
  static const int _maxRetries = 2;

  void _initializeAmount() {
    // Set initial amount to invoice balance
    if (widget.invoice.balance.isNotEmpty && widget.invoice.balance != '0') {
      _amountController.text = _parseAmount(widget.invoice.balance).toString();
    }
  }

  Future<void> _loadUserPaymentMethods() async {
    setState(() => _isLoadingPaymentMethods = true);

    try {
      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        throw Exception('User not authenticated');
      }

      // Fetch user's saved accounts from the database
      final accounts = await AccountService.getUserAccounts(currentUser.id);

      // Debug: Show raw accounts data
      if (kDebugMode) {
        print('=== Raw Accounts Data ===');
        print('Total accounts from API: ${accounts.length}');
        for (int i = 0; i < accounts.length; i++) {
          final account = accounts[i];
          print('Account $i:');
          print('  ID: ${account.id}');
          print('  Name: ${account.accountName}');
          print('  Type: ${account.accountType}');
          print('  Number: ${account.accountNumber}');
          print('  Bank Name: ${account.bankName}');
          print('  Account Code: ${account.accountCode}');
          print('  Is Active: ${account.isActive}');
          print('  Is Default: ${account.isDefault}');
        }
        print('========================');
      }

      // Filter only active accounts and map them to payment methods
      final activeAccounts = accounts
          .where((account) => account.isActive)
          .toList();

      // Debug: Show active accounts
      if (kDebugMode) {
        print('=== Active Accounts ===');
        print('Active accounts count: ${activeAccounts.length}');
        for (int i = 0; i < activeAccounts.length; i++) {
          final account = activeAccounts[i];
          print(
            'Active Account $i: ${account.accountName} - Code: ${account.accountCode}',
          );
        }
        print('======================');
      }

      // Filter accounts that have accountCode and map them to payment methods
      final validAccounts = activeAccounts
          .where(
            (account) =>
                account.accountCode != null && account.accountCode!.isNotEmpty,
          )
          .toList();

      // Debug: Show valid accounts
      if (kDebugMode) {
        print('=== Valid Accounts (with accountCode) ===');
        print('Valid accounts count: ${validAccounts.length}');
        for (int i = 0; i < validAccounts.length; i++) {
          final account = validAccounts[i];
          print(
            'Valid Account $i: ${account.accountName} - Code: ${account.accountCode}',
          );
        }
        print('========================================');
      }

      // If no accounts have accountCode, use all active accounts as fallback
      if (validAccounts.isEmpty) {
        if (kDebugMode) {
          print('=== No accounts with accountCode, using fallback ===');
          print('Using all active accounts as fallback');
        }
        validAccounts.addAll(activeAccounts);
      }

      // Map account bank names to payment method codes for BESA
      _availablePaymentMethods = validAccounts.map((account) {
        // Use the real accountCode from the API, or fallback to account ID if missing
        String paymentMethodCode = account.accountCode ?? account.id;
        String displayName = account.accountName;

        // Debug logging to see what's in each account
        if (kDebugMode) {
          print('=== Account Debug ===');
          print('Account ID: ${account.id}');
          print('Account Name: ${account.accountName}');
          print('Account Type: ${account.accountType}');
          print('Account Number: ${account.accountNumber}');
          print('Bank Name: ${account.bankName}');
          print('Account Code: ${account.accountCode}');
          print('Final Payment Code: $paymentMethodCode');
          print('Is Active: ${account.isActive}');
          print('===================');
        }

        return {
          'code':
              paymentMethodCode, // This is the real account_code from API or fallback
          'name': displayName,
          'accountId': account.id, // Keep reference to the account
          'accountName': account.accountName, // Full account name
          'accountType': account.accountType, // Bank or Mobile
          'accountNumber': account.accountNumber, // Account number or phone
          'bankName': account.bankName, // Provider name
        };
      }).toList();

      // Auto-select first payment method if available
      if (_availablePaymentMethods.isNotEmpty) {
        _selectedPaymentMethod = _availablePaymentMethods.first['code']!;
      } else {
        _selectedPaymentMethod = ''; // Reset if no valid accounts
      }

      // Debug logging to see final mapped data
      if (kDebugMode) {
        print('=== Final Mapped Data ===');
        print('Total accounts loaded: ${accounts.length}');
        print('Active accounts: ${activeAccounts.length}');
        print('Mapped payment methods: ${_availablePaymentMethods.length}');
        for (int i = 0; i < _availablePaymentMethods.length; i++) {
          final method = _availablePaymentMethods[i];
          print('Method $i:');
          print('  Code: ${method['code']} (Real account_code from API)');
          print('  Name: ${method['name']}');
          print('  Account Name: ${method['accountName']}');
          print('  Account Type: ${method['accountType']}');
          print('  Account Number: ${method['accountNumber']}');
          print('  Bank Name: ${method['bankName']}');
        }
        print('========================');
      }
    } catch (e) {
      ToastUtils.showError('Failed to load payment methods: ${e.toString()}');
    } finally {
      setState(() => _isLoadingPaymentMethods = false);
    }
  }

  String _getPaymentMethodName() {
    try {
      final method = _availablePaymentMethods.firstWhere(
        (m) => m['code'] == _selectedPaymentMethod,
      );
      return method['name'] ?? 'Unknown';
    } catch (e) {
      return 'Unknown';
    }
  }

  /// Get the mapped payment method code for debug display
  String _getMappedPaymentMethodCode() {
    try {
      final selectedMethod = _availablePaymentMethods.firstWhere(
        (m) => m['code'] == _selectedPaymentMethod,
      );
      return PaymentMethodUtils.mapAccountTypeToPaymentMethod(
        accountType: selectedMethod['accountType'] ?? '',
        bankName: selectedMethod['bankName'] ?? '',
        fallbackCode: _selectedPaymentMethod,
      );
    } catch (e) {
      return _selectedPaymentMethod; // Fallback to original code
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

  double _getInvoiceBalance() {
    return _parseAmount(widget.invoice.balance);
  }

  double _getPaymentAmount() {
    return double.tryParse(_amountController.text) ?? 0.0;
  }

  bool _isValidPayment() {
    final amount = _getPaymentAmount();
    final balance = _getInvoiceBalance();

    if (kDebugMode) {
      print('=== Payment Validation Debug ===');
      print('Amount: $amount');
      print('Balance: $balance');
      print('Amount > 0: ${amount > 0}');
      print('Amount <= Balance: ${amount <= balance}');
      print('Payment Method Selected: ${_selectedPaymentMethod.isNotEmpty}');
      print('Service Available: $_isServiceAvailable');
      print('==============================');
    }

    return amount > 0 &&
        amount <= balance &&
        _selectedPaymentMethod.isNotEmpty &&
        _isServiceAvailable;
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

  String? _getAmountError() {
    final amount = _getPaymentAmount();
    final balance = _getInvoiceBalance();

    if (amount <= 0) {
      return 'Payment amount must be greater than 0';
    }

    if (amount > balance) {
      return 'Payment amount cannot exceed invoice balance (${balance.toStringAsFixed(2)})';
    }

    return null;
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

      final paymentData = {
        'recipientType': 'tenant', // Since this is for tenant payments
        'recipient': {'id': currentUser.id, 'name': currentUser.displayName},
        'paymentDate': DateTime.now().toIso8601String().split(
          'T',
        )[0], // YYYY-MM-DD format
        'paymentMethod': paymentMethodCode, // Mapped payment method code
        'selectedAccountName':
            selectedAccountName, // Add account name for display
        'amountPaid': _getPaymentAmount(),
        'notes': _notesController.text.trim(),
        'sendReceipt': false,
        'invoicesApplied': [
          {
            'id': widget.invoice.id,
            'invoiceNumber': widget.invoice.invoiceNumber,
            'amount': _parseAmount(widget.invoice.totalAmount),
            'appliedAmount': _getPaymentAmount(),
          },
        ],
        'transactionsApplied': [], // No transactions for mobile payments
        'totalApplied': _getPaymentAmount(),
        'balance': 0, // Since we're paying the full balance
        'status': 'PAID',
      };

      if (kDebugMode) {
        print('=== Payment Data Debug ===');
        print('Payment Data: $paymentData');
        print('Selected Account Name: $selectedAccountName');
        print('Original Method Code: $_selectedPaymentMethod');
        print('Mapped Payment Method: $paymentMethodCode');
        print(
          'Payment Method Name: ${PaymentMethodUtils.getPaymentMethodName(paymentMethodCode)}',
        );
        print('Amount Paid: ${_getPaymentAmount()}');
        print('Calling PaymentService.submitPayment...');
        print('========================');
      }

      // Call payment service (timeout is now handled in the service)
      final result = await _paymentService!.submitPayment(paymentData);

      if (kDebugMode) {
        print('=== API Response Debug ===');
        print('Full Response: $result');
        print('Response Type: ${result.runtimeType}');
        print('Success: ${result['success']}');
        print('Message: ${result['message']}');
        print('Error: ${result['error']}');
        print('Timeout: ${result['timeout']}');
        print('========================');
      }

      if (result['success'] == true) {
        ToastUtils.showSuccess('Payment submitted successfully!');

        // Reset retry count on success
        _retryCount = 0;

        // Navigate to success screen
        Get.off(
          () => PaymentSuccessScreen(
            invoice: widget.invoice,
            paymentData: paymentData,
          ),
        );
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
        print('Payment submission error: $e');
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

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        width: double.maxFinite,
        constraints: const BoxConstraints(maxHeight: 600),
        padding: const EdgeInsets.all(24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.payment_rounded,
                      color: AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Make Payment',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          'Invoice: ${widget.invoice.invoiceNumber}',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Get.back(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Debug Info (remove in production)
              if (kDebugMode) _buildDebugInfo(),

              // Service Status Warning (if service not available)
              if (!_isServiceAvailable) _buildServiceWarning(),

              // Payment Method Selection
              _buildPaymentMethodSection(),
              const SizedBox(height: 20),

              // Payment Amount
              _buildAmountSection(),
              const SizedBox(height: 20),

              // Notes
              _buildNotesSection(),
              const SizedBox(height: 24),

              // Submit Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isValidPayment() && !_isLoading
                      ? _submitPayment
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isLoading
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'Processing Payment...',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        )
                      : const Text(
                          'Submit Payment',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
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
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
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
                    color: AppColors.warning.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppColors.warning.withOpacity(0.3),
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
          ),
        ),
      ),
    );
  }

  Widget _buildAmountSection() {
    final amountError = _getAmountError();
    final balance = _getInvoiceBalance();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Payment Amount',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _amountController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            hintText: 'Enter payment amount',
            prefixText: 'KES ',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: amountError != null
                    ? AppColors.error
                    : Colors.grey[300]!,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: amountError != null
                    ? AppColors.error
                    : AppColors.primary,
                width: 2,
              ),
            ),
            errorText: amountError,
            helperText:
                'Maximum: KES ${_getInvoiceBalance().toStringAsFixed(2)}',
          ),
          onChanged: (value) {
            setState(() {}); // Rebuild to update validation
          },
        ),
      ],
    );
  }

  Widget _buildPaymentMethodSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Payment Method',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        if (_isLoadingPaymentMethods)
          const Center(child: CircularProgressIndicator())
        else if (_availablePaymentMethods.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey[300]!),
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
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedPaymentMethod,
                hint: const Text('Select payment method'),
                isExpanded: true,
                items: _availablePaymentMethods.map((method) {
                  return DropdownMenuItem<String>(
                    value:
                        method['code'] ?? '', // Value is the bank_code for BESA
                    child: Container(
                      constraints: const BoxConstraints(maxHeight: 40),
                      child: Row(
                        children: [
                          Icon(
                            (method['accountType'] ?? '') == 'bank'
                                ? Icons.account_balance
                                : Icons.phone_android,
                            size: 16,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  method['accountName'] ?? 'Unknown Account',
                                  style: const TextStyle(
                                    fontSize: 13,
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
                                          fontSize: 11,
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
                                        fontSize: 10,
                                        color: Colors.grey[500],
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

  Widget _buildNotesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Notes (Optional)',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _notesController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Add any notes about this payment...',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.primary, width: 2),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDebugInfo() {
    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Debug Info',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Colors.blue[700],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Selected Method Code: $_selectedPaymentMethod',
            style: TextStyle(fontSize: 11, color: Colors.blue[600]),
          ),
          Text(
            'Mapped Payment Method: ${_getMappedPaymentMethodCode()}',
            style: TextStyle(fontSize: 11, color: Colors.blue[600]),
          ),
          Text(
            'Payment Method Name: ${_getPaymentMethodName()}',
            style: TextStyle(fontSize: 11, color: Colors.blue[600]),
          ),
          Text(
            'Available Methods: ${_availablePaymentMethods.length}',
            style: TextStyle(fontSize: 11, color: Colors.blue[600]),
          ),
          Text(
            'Amount: ${_amountController.text.isEmpty ? 'Empty' : _amountController.text}',
            style: TextStyle(fontSize: 11, color: Colors.blue[600]),
          ),
          Text(
            'Balance: ${_getInvoiceBalance()}',
            style: TextStyle(fontSize: 11, color: Colors.blue[600]),
          ),
          Text(
            'Is Valid: ${_isValidPayment()}',
            style: TextStyle(fontSize: 11, color: Colors.blue[600]),
          ),
          Text(
            'Payment Service Available: $_isServiceAvailable',
            style: TextStyle(fontSize: 11, color: Colors.blue[600]),
          ),
          Text(
            'API Base URL: ${ApiConfig.baseUrl}',
            style: TextStyle(fontSize: 11, color: Colors.blue[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildServiceWarning() {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.yellow.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.yellow.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.warning_amber_rounded,
                color: Colors.yellow[700],
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Payment service is currently unavailable. Please try again later or contact support.',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.yellow[700],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () {
                  _initializePaymentService(); // Retry initialization
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.yellow[200],
                  foregroundColor: Colors.yellow[800],
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Retry',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
