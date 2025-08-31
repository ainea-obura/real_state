import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/models/invoice_model.dart';
import '../../../core/models/payment_model.dart';
import '../../../core/models/invoice_item_model.dart';
import '../../../core/services/owner_finance_service.dart';
import '../../../core/utils/payment_method_utils.dart';
import 'package:get/get.dart';
import 'owner_payment_modal.dart';

class InvoiceDetailScreen extends StatefulWidget {
  final Invoice invoice;

  const InvoiceDetailScreen({super.key, required this.invoice});

  @override
  State<InvoiceDetailScreen> createState() => _InvoiceDetailScreenState();
}

class _InvoiceDetailScreenState extends State<InvoiceDetailScreen> {
  final ScrollController _scrollController = ScrollController();

  // Local state for this screen
  final RxList<Payment> _payments = <Payment>[].obs;
  final RxList<InvoiceItem> _invoiceItems = <InvoiceItem>[].obs;
  final RxBool _isLoadingPayments = false.obs;
  final RxBool _isLoadingInvoiceItems = false.obs;
  final RxString _error = ''.obs;
  final RxBool _hasMorePayments = true.obs;

  @override
  void initState() {
    super.initState();

    // Debug logging to troubleshoot payment loading
    print('=== InvoiceDetailScreen Debug ===');
    print('Invoice ID: ${widget.invoice.id}');
    print('Invoice Status: ${widget.invoice.status}');
    print('Invoice Balance: ${widget.invoice.balance}');
    print('===============================');

    // Load invoice details (payments and items) directly from this screen
    _loadInvoiceDetails();
    _scrollController.addListener(_onScroll);

    // Add a safety timeout to prevent infinite loading
    Future.delayed(const Duration(seconds: 10), () {
      if (mounted && _isLoadingInvoiceItems.value) {
        // If still loading after 10 seconds, force reset the loading state
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      // Only load more payments if we have more to load
      if (_hasMorePayments.value && !_isLoadingPayments.value) {
        _loadInvoiceDetails();
      }
    }
  }

  /// Load invoice details (payments and items) directly from this screen
  Future<void> _loadInvoiceDetails() async {
    if (_isLoadingPayments.value || _isLoadingInvoiceItems.value) return;

    try {
      _isLoadingPayments.value = true;
      _isLoadingInvoiceItems.value = true;
      _error.value = '';

      // Get the service from GetX
      final financeService = Get.find<OwnerFinanceService>();

      final result = await financeService.fetchInvoiceDetail(
        invoiceId: widget.invoice.id,
      );

      // Clear existing data for this invoice
      _payments.removeWhere(
        (payment) => payment.invoiceId == widget.invoice.id,
      );
      _invoiceItems.removeWhere((item) => item.invoiceId == widget.invoice.id);

      // Add new data
      _payments.addAll(result.payments);
      _invoiceItems.addAll(result.items);

      setState(() {});

      // Show success toast if data was loaded
      if (result.payments.isNotEmpty || result.items.isNotEmpty) {
        print('Invoice details refreshed successfully');
      }
    } catch (e) {
      _error.value = 'Failed to load invoice details: $e';
      print('Error loading invoice details: $e');
    } finally {
      _isLoadingPayments.value = false;
      _isLoadingInvoiceItems.value = false;
    }
  }

  void _showPaymentModal() async {
    final result = await Get.dialog(
      OwnerPaymentModal(invoice: widget.invoice),
      barrierDismissible: false,
    );

    // If payment was successful, refresh the invoice details
    if (result == true) {
      _loadInvoiceDetails();
    }
  }

  /// Check if the invoice can be paid
  /// Only ISSUED and PARTIAL invoices can be paid
  bool _canPayInvoice() {
    return widget.invoice.balance.isNotEmpty &&
        widget.invoice.balance != '0' &&
        (widget.invoice.status == 'ISSUED' ||
            widget.invoice.status == 'PARTIAL');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Get.back(),
          icon: const Icon(
            Icons.arrow_back_rounded,
            color: AppColors.textPrimary,
          ),
        ),
        title: Text(
          'Invoice ${widget.invoice.invoiceNumber}',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        actions: [
          // Refresh Button
          Obx(
            () => IconButton(
              onPressed:
                  _isLoadingPayments.value || _isLoadingInvoiceItems.value
                  ? null
                  : () => _loadInvoiceDetails(),
              icon: _isLoadingPayments.value || _isLoadingInvoiceItems.value
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          AppColors.primary,
                        ),
                      ),
                    )
                  : const Icon(
                      Icons.refresh_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
            ),
          ),
          // Status Badge
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _getStatusColor(widget.invoice.status).withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _getStatusColor(
                    widget.invoice.status,
                  ).withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Text(
                widget.invoice.status,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: _getStatusColor(widget.invoice.status),
                ),
              ),
            ),
          ),
          // Payment Button - Only show if invoice can be paid
          if (_canPayInvoice())
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: ElevatedButton.icon(
                onPressed: () => _showPaymentModal(),
                icon: const Icon(Icons.payment_rounded, size: 16),
                label: const Text(
                  'Pay Now',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadInvoiceDetails,
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Combined Invoice & Unit Information Section
              _buildCombinedInvoiceUnitSection(),
              const SizedBox(height: 24),

              // Invoice Items Section
              _buildInvoiceItemsSection(),
              const SizedBox(height: 24),

              // Payment History Section
              _buildPaymentHistorySection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCombinedInvoiceUnitSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with Invoice Icon
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.receipt_long_rounded,
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
                      'Invoice ${widget.invoice.invoiceNumber}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    if (widget.invoice.description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        widget.invoice.description,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Unit Information Section
          Row(
            children: [
              Icon(Icons.home_rounded, color: AppColors.success, size: 20),
              const SizedBox(width: 12),
              Text(
                'Unit Information',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Unit Details - Fallback to invoice property data
          if (widget.invoice.hasPropertyInfo) ...[
            _buildFallbackUnitInfo(),
          ] else ...[
            _buildNoUnitInfoState(),
          ],
          const SizedBox(height: 20),

          // Invoice Financial Details
          Row(
            children: [
              Icon(
                Icons.attach_money_rounded,
                color: AppColors.primary,
                size: 20,
              ),
              const SizedBox(width: 12),
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
          const SizedBox(height: 16),

          // Amount and Balance
          Row(
            children: [
              Expanded(
                child: _buildInfoItem(
                  'Total Amount',
                  widget.invoice.totalAmount,
                  Icons.attach_money_rounded,
                  AppColors.primary,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildInfoItem(
                  'Balance Due',
                  widget.invoice.balance,
                  Icons.account_balance_wallet_rounded,
                  _parseAmount(widget.invoice.balance) > 0
                      ? AppColors.warning
                      : AppColors.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Dates
          Row(
            children: [
              Expanded(
                child: _buildInfoItem(
                  'Issue Date',
                  _formatDate(widget.invoice.issueDate),
                  Icons.calendar_today_rounded,
                  AppColors.info,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildInfoItem(
                  'Due Date',
                  _formatDate(widget.invoice.dueDate),
                  Icons.event_rounded,
                  AppColors.warning,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildFallbackUnitInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.invoice.displayPropertyName,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          widget.invoice.displayPropertyAddress,
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
      ],
    );
  }

  Widget _buildNoUnitInfoState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Icon(
              Icons.info_outline_rounded,
              color: AppColors.warning,
              size: 32,
            ),
            const SizedBox(height: 12),
            Text(
              'Unit Information Not Available',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'This invoice may be for a general service or the unit details are not configured.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInvoiceItemsSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.list_alt_rounded, color: AppColors.warning, size: 20),
              const SizedBox(width: 12),
              Text(
                'Invoice Items',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          Obx(() {
            if (_error.value.isNotEmpty && _invoiceItems.isEmpty) {
              return _buildErrorState(_error.value);
            }

            if (_invoiceItems.isEmpty && !_isLoadingInvoiceItems.value) {
              return _buildNoItemsState();
            }

            if (_isLoadingInvoiceItems.value) {
              return const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(),
                ),
              );
            }

            return Column(
              children: _invoiceItems.map((item) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _buildInvoiceItemRow(item),
                );
              }).toList(),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildInvoiceItemRow(InvoiceItem item) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderLight, width: 1),
      ),
      child: Row(
        children: [
          // Item Icon and Type
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _getItemTypeColor(item.type).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              _getItemTypeIcon(item.type),
              size: 16,
              color: _getItemTypeColor(item.type),
            ),
          ),
          const SizedBox(width: 12),

          // Item Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.description,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: _getItemTypeColor(item.type).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: _getItemTypeColor(item.type).withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        item.type.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: _getItemTypeColor(item.type),
                        ),
                      ),
                    ),
                    if (item.nodeName.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Icon(
                        Icons.location_on_rounded,
                        size: 12,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        item.nodeName,
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),

          // Item Price
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                item.price,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '${item.quantity} × ${item.amount}',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNoItemsState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            Icon(
              Icons.list_alt_rounded,
              color: AppColors.textSecondary,
              size: 32,
            ),
            const SizedBox(height: 12),
            Text(
              'No Items Found',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'This invoice doesn\'t have any items.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            Icon(Icons.error_outline_rounded, color: AppColors.error, size: 32),
            const SizedBox(height: 12),
            Text(
              'Error Loading Items',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                error,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () {
                _loadInvoiceDetails();
              },
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('Retry', style: TextStyle(fontSize: 12)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentHistorySection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.history_rounded, color: AppColors.info, size: 20),
              const SizedBox(width: 12),
              Text(
                'Payment History',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          Obx(() {
            if (_payments.isEmpty && !_isLoadingPayments.value) {
              return _buildNoPaymentHistoryState();
            }

            if (_isLoadingPayments.value) {
              return const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(),
                ),
              );
            }

            return Column(
              children: [
                // Payment List
                ListView.builder(
                  controller: _scrollController,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount:
                      _payments.length + (_hasMorePayments.value ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == _payments.length) {
                      return _buildLoadingMore();
                    }

                    final payment = _payments[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _buildPaymentHistoryRow(payment),
                    );
                  },
                ),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _buildLoadingMore() {
    return const Padding(
      padding: EdgeInsets.all(16),
      child: Center(child: CircularProgressIndicator()),
    );
  }

  Widget _buildPaymentHistoryRow(Payment payment) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderLight, width: 1),
      ),
      child: Row(
        children: [
          // Payment Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _getPaymentStatusColor(payment.status).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.payment_rounded,
              color: _getPaymentStatusColor(payment.status),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),

          // Payment Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  payment.transactionId,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _getPaymentMethodDisplayName(payment.paymentMethod),
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatDate(payment.paymentDate),
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),

          // Payment Amount and Status
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                payment.amount,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getPaymentStatusColor(
                    payment.status,
                  ).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: _getPaymentStatusColor(
                      payment.status,
                    ).withOpacity(0.3),
                    width: 1,
                  ),
                ),
                child: Text(
                  payment.status,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: _getPaymentStatusColor(payment.status),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNoPaymentHistoryState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            Icon(
              Icons.history_rounded,
              color: AppColors.textSecondary,
              size: 32,
            ),
            const SizedBox(height: 12),
            Text(
              'No Payment History',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Payment history will appear here once payments are made.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PAID':
        return AppColors.success;
      case 'OVERDUE':
        return AppColors.error;
      case 'ISSUED':
        return AppColors.warning;
      case 'DRAFT':
        return AppColors.textSecondary;
      default:
        return AppColors.textSecondary;
    }
  }

  Color _getPaymentStatusColor(String status) {
    switch (status) {
      case 'Completed':
        return AppColors.success;
      case 'Pending':
        return AppColors.warning;
      case 'Failed':
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  }

  Color _getItemTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'rent':
        return AppColors.primary;
      case 'service':
        return AppColors.success;
      case 'penalty':
        return AppColors.error;
      case 'fixed':
        return AppColors.info;
      case 'percentage':
        return AppColors.warning;
      case 'variable':
        return AppColors.secondary;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData _getItemTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'rent':
        return Icons.home_rounded;
      case 'service':
        return Icons.build_rounded;
      case 'penalty':
        return Icons.warning_rounded;
      case 'fixed':
        return Icons.attach_money_rounded;
      case 'percentage':
        return Icons.percent_rounded;
      case 'variable':
        return Icons.tune_rounded;
      default:
        return Icons.receipt_rounded;
    }
  }

  String _formatDate(String dateString) {
    if (dateString.isEmpty) {
      return 'N/A';
    }

    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString.isEmpty ? 'N/A' : dateString;
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

  /// Get the human-readable payment method name from the payment method code
  String _getPaymentMethodDisplayName(String paymentMethodCode) {
    if (paymentMethodCode.isEmpty) return 'Unknown';

    try {
      // Use the utility function to get the human-readable name
      return PaymentMethodUtils.getPaymentMethodName(paymentMethodCode);
    } catch (e) {
      // Fallback to the original code if utility function fails
      return paymentMethodCode;
    }
  }
}
