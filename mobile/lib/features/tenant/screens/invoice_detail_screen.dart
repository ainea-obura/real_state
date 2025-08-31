import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/models/invoice_model.dart';
import '../../../core/models/payment_model.dart';
import '../../../core/models/invoice_item_model.dart';
import '../../../core/services/tenant_finance_service.dart';
import '../../../core/utils/payment_method_utils.dart';
import 'package:get/get.dart';
import 'payment_modal.dart';

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

  // @override
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
      final financeService = Get.find<TenantFinanceService>();

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
      PaymentModal(invoice: widget.invoice),
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
                  _isLoadingInvoiceItems.value || _isLoadingPayments.value
                  ? null
                  : () => _loadInvoiceDetails(),
              icon: _isLoadingInvoiceItems.value || _isLoadingPayments.value
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

              // Invoice Summary Section - Commented out as requested
              // _buildInvoiceSummary(),
              // const SizedBox(height: 24),

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
              const Spacer(),
              // Refresh button for unit information
              GetBuilder<TenantFinanceController>(
                builder: (controller) {
                  return IconButton(
                    onPressed: controller.isLoadingPropertyInfo
                        ? null
                        : () => controller.fetchPropertyInfo(widget.invoice.id),
                    icon: controller.isLoadingPropertyInfo
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh_rounded, size: 18),
                    tooltip: 'Refresh Unit Information',
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(
                      minWidth: 32,
                      minHeight: 32,
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Unit Details
          GetBuilder<TenantFinanceController>(
            builder: (controller) {
              if (controller.isLoadingPropertyInfo) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: CircularProgressIndicator(),
                  ),
                );
              }

              if (controller.hasPropertyInfo) {
                return _buildPropertyDetails(controller.propertyInfo);
              }

              // Fallback to invoice property data
              if (widget.invoice.hasPropertyInfo) {
                return _buildFallbackUnitInfo();
              }

              // Show fallback information when no unit data is available
              return _buildNoUnitInfoState();
            },
          ),
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

  // Invoice Summary - Commented out as requested
  /*
  Widget _buildInvoiceSummary() {
    final totalAmount = _parseAmount(widget.invoice.totalAmount);
    final balance = _parseAmount(widget.invoice.balance);
    final paidAmount = totalAmount - balance;
    final paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) : 0.0;

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
          // Payment Summary - Commented out as requested
          /*
          Row(
            children: [
              Icon(Icons.payment_rounded, color: AppColors.success, size: 20),
              const SizedBox(width: 12),
              Text(
                'Payment Summary',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Payment Progress Bar
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Payment Progress',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  Text(
                    '${(paymentProgress * 100).toStringAsFixed(1)}%',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: paymentProgress,
                backgroundColor: AppColors.borderLight,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.success),
                minHeight: 8,
                borderRadius: BorderRadius.circular(4),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Payment Details Grid
          Row(
            children: [
              Expanded(
                child: _buildSummaryItem(
                  'Total Amount',
                  widget.invoice.totalAmount,
                  AppColors.textPrimary,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildSummaryItem(
                  'Amount Paid',
                  'KES ${paidAmount.toStringAsFixed(2)}',
                  AppColors.success,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildSummaryItem(
                  'Balance Due',
                  widget.invoice.balance,
                  balance > 0 ? AppColors.warning : AppColors.success,
                ),
              ),
            ],
          ),
          */

          // Payment Action Button
          if (balance > 0) ...[
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _showPaymentModal,
                icon: const Icon(Icons.payment_rounded),
                label: const Text(
                  'Make Payment',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
  */

  Widget _buildSummaryItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: color,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildPropertyInfoSection() {
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
              Icon(Icons.home_rounded, color: AppColors.success, size: 20),
              const SizedBox(width: 12),
              Text(
                'Property Information',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              // Refresh button for property information
              GetBuilder<TenantFinanceController>(
                builder: (controller) {
                  return IconButton(
                    onPressed: controller.isLoadingPropertyInfo
                        ? null
                        : () => controller.fetchPropertyInfo(widget.invoice.id),
                    icon: controller.isLoadingPropertyInfo
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh_rounded, size: 18),
                    tooltip: 'Refresh Property Information',
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(
                      minWidth: 32,
                      minHeight: 32,
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Display property information from controller
          GetBuilder<TenantFinanceController>(
            builder: (controller) {
              if (controller.isLoadingPropertyInfo) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: CircularProgressIndicator(),
                  ),
                );
              }

              if (controller.hasPropertyInfo) {
                return _buildPropertyDetails(controller.propertyInfo);
              }

              // Fallback to invoice property data
              if (widget.invoice.hasPropertyInfo) {
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
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                );
              }

              // Show fallback information when no property data is available
              return _buildNoPropertyInfoState();
            },
          ),
        ],
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

          GetBuilder<TenantFinanceController>(
            builder: (controller) {
              if (controller.error.isNotEmpty &&
                  controller.invoiceItems.isEmpty) {
                return _buildErrorState(controller.error);
              }

              if (controller.invoiceItems.isEmpty &&
                  !controller.isLoadingInvoiceItems) {
                return _buildNoItemsState();
              }

              if (controller.isLoadingInvoiceItems) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(),
                  ),
                );
              }

              return Column(
                children: controller.invoiceItems.map((item) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _buildInvoiceItemRow(item),
                  );
                }).toList(),
              );
            },
          ),
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                ElevatedButton.icon(
                  onPressed: () {
                    _controller.loadInvoiceDetails(widget.invoice.id);
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
                ElevatedButton.icon(
                  onPressed: () {
                    _controller.handleEmptyData();
                  },
                  icon: const Icon(Icons.info_outline_rounded, size: 16),
                  label: const Text(
                    'Show Info',
                    style: TextStyle(fontSize: 12),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.info,
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
              const Spacer(),
              // Refresh button for payment history
              GetBuilder<TenantFinanceController>(
                builder: (controller) {
                  return IconButton(
                    onPressed: controller.isLoadingPayments
                        ? null
                        : () => controller.completeReset(widget.invoice.id),
                    icon: controller.isLoadingPayments
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh_rounded, size: 18),
                    tooltip: 'Refresh Payment History',
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(
                      minWidth: 32,
                      minHeight: 32,
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          GetBuilder<TenantFinanceController>(
            builder: (controller) {
              // Debug logging for payment history
              print('=== Payment History Debug ===');
              print('Payments count: ${controller.payments.length}');
              print('Loading payments: ${controller.isLoadingPayments}');
              print('Loading items: ${controller.isLoadingInvoiceItems}');
              print('Error: ${controller.error}');
              print('Has more payments: ${controller.hasMorePayments}');
              print('============================');

              if (controller.payments.isEmpty &&
                  !controller.isLoadingPayments) {
                return _buildNoPaymentHistoryState();
              }

              if (controller.isLoadingPayments) {
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
                        controller.payments.length +
                        (controller.hasMorePayments ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == controller.payments.length) {
                        return _buildLoadingMore();
                      }

                      final payment = controller.payments[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _buildPaymentHistoryRow(payment),
                      );
                    },
                  ),
                ],
              );
            },
          ),
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
                payment
                    .amount, // Display amount as-is since it's already formatted
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

  String _calculateTotalPaid(List<Payment> payments) {
    print('=== _calculateTotalPaid Debug ===');
    print('Payments count: ${payments.length}');

    if (payments.isEmpty) {
      print('No payments to calculate');
      return 'KES 0.00';
    }

    double total = 0.0;

    for (int i = 0; i < payments.length; i++) {
      final payment = payments[i];
      print('Processing payment $i: ${payment.transactionId}');

      try {
        // Since backend always returns string amounts, expect String
        final parsedAmount = _parseAmount(payment.amount);
        print('Successfully parsed string amount: $parsedAmount');
        total += parsedAmount;
      } catch (e) {
        print('Error processing payment $i: $e');
        print(
          'Payment details: ${payment.transactionId}, amount: ${payment.amount}',
        );
        // Continue with other payments
        continue;
      }
    }

    print('Final total: $total');
    print('===============================');
    return 'KES ${total.toStringAsFixed(2)}';
  }

  String _getLastPaymentDate(List<Payment> payments) {
    if (payments.isEmpty) return 'N/A';

    try {
      final sortedPayments = List<Payment>.from(payments)
        ..sort(
          (a, b) => DateTime.parse(
            b.paymentDate,
          ).compareTo(DateTime.parse(a.paymentDate)),
        );

      return _formatDate(sortedPayments.first.paymentDate);
    } catch (e) {
      return 'N/A';
    }
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

  Widget _buildNoPropertyInfoState() {
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
              'Property Information Not Available',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'This invoice may be for a general service or the property details are not configured.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () {
                _controller.fetchPropertyInfo(widget.invoice.id);
              },
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text(
                'Refresh Property Info',
                style: TextStyle(fontSize: 12),
              ),
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

  Widget _buildPropertyDetails(Map<String, dynamic> propertyData) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Property name/title
        if (propertyData['property'] != null) ...[
          Text(
            _extractPropertyName(propertyData['property']),
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
        ],

        // Unit information
        if (propertyData['unit'] != null) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: AppColors.primary.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Text(
              'Unit: ${_extractUnitInfo(propertyData['unit'])}',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],

        // Property address/location
        if (propertyData['property_details'] != null) ...[
          Text(
            _extractPropertyAddress(propertyData['property_details']),
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
        ] else if (propertyData['node'] != null) ...[
          Text(
            _extractNodeInfo(propertyData['node']),
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
        ],
      ],
    );
  }

  Widget _buildUnitDetails(Map<String, dynamic> unitData) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Unit name/title
        if (unitData['unit'] != null) ...[
          Text(
            _extractUnitName(unitData['unit']),
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
        ],

        // Unit number
        if (unitData['unit_number'] != null) ...[
          Text(
            'Unit Number: ${unitData['unit_number']}',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
        ],

        // Unit floor
        if (unitData['floor'] != null) ...[
          Text(
            'Floor: ${unitData['floor']}',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
        ],

        // Unit type
        if (unitData['type'] != null) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: AppColors.primary.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Text(
              'Type: ${_extractUnitType(unitData['type'])}',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],

        // Unit description
        if (unitData['description'] != null) ...[
          Text(
            'Description: ${unitData['description']}',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
        ],

        // Unit status
        if (unitData['status'] != null) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.warning.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: AppColors.warning.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Text(
              'Status: ${_extractUnitStatus(unitData['status'])}',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.warning,
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],

        // Unit assigned to
        if (unitData['assigned_to'] != null) ...[
          Text(
            'Assigned To: ${_extractAssignedTo(unitData['assigned_to'])}',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
        ],

        // Unit notes
        if (unitData['notes'] != null) ...[
          Text(
            'Notes: ${unitData['notes']}',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
        ],
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
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () {
                _controller.fetchPropertyInfo(widget.invoice.id);
              },
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text(
                'Refresh Unit Info',
                style: TextStyle(fontSize: 12),
              ),
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

  // Helper methods to extract property information
  String _extractPropertyName(dynamic property) {
    if (property is Map<String, dynamic>) {
      return property['name']?.toString() ??
          property['title']?.toString() ??
          property['property_name']?.toString() ??
          'Property';
    }
    return property?.toString() ?? 'Property';
  }

  String _extractUnitName(dynamic unit) {
    if (unit is Map<String, dynamic>) {
      return unit['name']?.toString() ??
          unit['unit_name']?.toString() ??
          unit['number']?.toString() ??
          'Unit';
    }
    return unit?.toString() ?? 'Unit';
  }

  String _extractUnitInfo(dynamic unit) {
    if (unit is Map<String, dynamic>) {
      return unit['name']?.toString() ??
          unit['unit_name']?.toString() ??
          unit['number']?.toString() ??
          'Unit';
    }
    return unit?.toString() ?? 'Unit';
  }

  String _extractUnitType(dynamic type) {
    if (type is Map<String, dynamic>) {
      return type['name']?.toString() ??
          type['type']?.toString() ??
          type['description']?.toString() ??
          'Type not specified';
    }
    return type?.toString() ?? 'Type not specified';
  }

  String _extractUnitStatus(dynamic status) {
    if (status is Map<String, dynamic>) {
      return status['name']?.toString() ??
          status['status']?.toString() ??
          status['description']?.toString() ??
          'Status not specified';
    }
    return status?.toString() ?? 'Status not specified';
  }

  String _extractAssignedTo(dynamic assignedTo) {
    if (assignedTo is Map<String, dynamic>) {
      return assignedTo['name']?.toString() ??
          assignedTo['assigned_to']?.toString() ??
          assignedTo['description']?.toString() ??
          'Assigned not specified';
    }
    return assignedTo?.toString() ?? 'Assigned not specified';
  }

  String _extractPropertyAddress(dynamic propertyDetails) {
    if (propertyDetails is Map<String, dynamic>) {
      return propertyDetails['address']?.toString() ??
          propertyDetails['location']?.toString() ??
          propertyDetails['street']?.toString() ??
          'Address not specified';
    }
    return propertyDetails?.toString() ?? 'Address not specified';
  }

  String _extractNodeInfo(dynamic node) {
    if (node is Map<String, dynamic>) {
      return node['address']?.toString() ??
          node['location']?.toString() ??
          node['description']?.toString() ??
          'Location not specified';
    }
    return node?.toString() ?? 'Location not specified';
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
