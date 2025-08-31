import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/models/invoice_model.dart';
import '../../../core/controllers/owner_finance_controller.dart';
import 'invoice_detail_screen.dart';
import 'owner_multi_invoice_payment_modal.dart';

class OwnerFinanceScreen extends StatefulWidget {
  const OwnerFinanceScreen({super.key});

  @override
  State<OwnerFinanceScreen> createState() => _OwnerFinanceScreenState();
}

class _OwnerFinanceScreenState extends State<OwnerFinanceScreen> {
  late OwnerFinanceController _controller;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _controller = Get.find<OwnerFinanceController>();
    // Data loading is now handled by the dashboard when tab is accessed
    _scrollController.addListener(_onScroll);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Data loading is now handled by the dashboard when tab is accessed
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    // Check if we're near the bottom and have more data to load
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      // Only load more if we're not already loading and have more data
      if (!_controller.isLoadingInvoices && _controller.hasMoreInvoices) {
        _controller.loadInvoices();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Advanced Filters
            _buildAdvancedFilters(),

            // Content
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  await _controller.refreshInvoices();
                },
                child: GetBuilder<OwnerFinanceController>(
                  builder: (controller) {
                    if (controller.error.isNotEmpty) {
                      return _buildErrorState(controller.error);
                    }

                    if (controller.isLoadingInvoices &&
                        controller.filteredInvoices.isEmpty) {
                      return _buildInitialLoadingState();
                    }

                    if (controller.filteredInvoices.isEmpty &&
                        !controller.isLoadingInvoices) {
                      return _buildEmptyState();
                    }

                    return _buildInvoicesList(controller);
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAdvancedFilters() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppColors.borderLight, width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with active filters and actions
          GetBuilder<OwnerFinanceController>(
            builder: (controller) => Row(
              children: [
                const Spacer(),
                // Active filters indicator
                if (_hasActiveFilters(controller))
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.primary.withOpacity(0.3),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      '${_getActiveFilterCount(controller)} active',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
                // Pay Selected Button (only show when in selection mode)
                if (controller.isSelectionMode &&
                    controller.hasSelectedInvoices)
                  Container(
                    margin: const EdgeInsets.only(right: 8),
                    child: ElevatedButton.icon(
                      onPressed: () => _showMultiInvoicePaymentModal(),
                      icon: const Icon(Icons.payment_rounded, size: 16),
                      label: Text(
                        'Pay ${controller.selectedInvoiceCount}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
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
                IconButton(
                  onPressed: () async {
                    await controller.refreshInvoices();
                  },
                  icon: const Icon(
                    Icons.refresh_rounded,
                    color: AppColors.primary,
                    size: 18,
                  ),
                  tooltip: 'Refresh Invoices',
                  padding: const EdgeInsets.all(4),
                  constraints: const BoxConstraints(
                    minWidth: 32,
                    minHeight: 32,
                  ),
                ),
                // Cancel Selection Button (only show when in selection mode)
                if (controller.isSelectionMode)
                  IconButton(
                    onPressed: controller.exitSelectionMode,
                    icon: const Icon(
                      Icons.close_rounded,
                      color: AppColors.error,
                      size: 18,
                    ),
                    tooltip: 'Cancel Selection',
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(
                      minWidth: 32,
                      minHeight: 32,
                    ),
                  ),
                IconButton(
                  onPressed: controller.clearFilters,
                  icon: const Icon(
                    Icons.filter_alt_off_rounded,
                    color: AppColors.textSecondary,
                    size: 18,
                  ),
                  tooltip: 'Clear All Filters',
                  padding: const EdgeInsets.all(4),
                  constraints: const BoxConstraints(
                    minWidth: 32,
                    minHeight: 32,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Status Filter Badges
          GetBuilder<OwnerFinanceController>(
            builder: (controller) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Status',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildStatusBadge(
                      'PAID',
                      controller.statusFilter.contains('PAID'),
                      controller,
                    ),
                    _buildStatusBadge(
                      'ISSUED',
                      controller.statusFilter.contains('ISSUED'),
                      controller,
                    ),
                    _buildStatusBadge(
                      'OVERDUE',
                      controller.statusFilter.contains('OVERDUE'),
                      controller,
                    ),
                    _buildStatusBadge(
                      'DRAFT',
                      controller.statusFilter.contains('DRAFT'),
                      controller,
                    ),
                    _buildStatusBadge(
                      'CANCELLED',
                      controller.statusFilter.contains('CANCELLED'),
                      controller,
                    ),
                  ],
                ),
                // Show selected statuses
                if (controller.statusFilter.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 4,
                    children: controller.statusFilter
                        .map(
                          (status) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: _getStatusColor(status).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _getStatusColor(status).withOpacity(0.3),
                                width: 1,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  status,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: _getStatusColor(status),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                InkWell(
                                  onTap: () =>
                                      controller.removeStatusFilter(status),
                                  borderRadius: BorderRadius.circular(8),
                                  child: Icon(
                                    Icons.close_rounded,
                                    size: 12,
                                    color: _getStatusColor(status),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Date Range Filter
          GetBuilder<OwnerFinanceController>(
            builder: (controller) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Due Date Range',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Filter invoices by when payment is due',
                  style: TextStyle(
                    fontSize: 10,
                    color: AppColors.textSecondary,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: 8),
                _buildDateRangeFilter(controller),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Apply Filters Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                // Force refresh with current filters
                _controller.refreshInvoices();
              },
              icon: const Icon(Icons.filter_alt_rounded, size: 16),
              label: const Text(
                'Apply Filters',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(
    String status,
    bool isSelected, [
    OwnerFinanceController? controller,
  ]) {
    final ctrl = controller ?? _controller;
    final statusColor = _getStatusColor(status);

    return InkWell(
      onTap: () {
        if (isSelected) {
          ctrl.removeStatusFilter(status);
        } else {
          ctrl.addStatusFilter(status);
        }
      },
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? statusColor.withOpacity(0.2) : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? statusColor : AppColors.borderLight,
            width: 1.5,
          ),
        ),
        child: Text(
          status,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isSelected ? statusColor : AppColors.textSecondary,
            letterSpacing: 0.2,
          ),
        ),
      ),
    );
  }

  Widget _buildDateRangeFilter([OwnerFinanceController? controller]) {
    final ctrl = controller ?? _controller;
    final hasDateRange =
        ctrl.dateFromFilter.isNotEmpty || ctrl.dateToFilter.isNotEmpty;

    return InkWell(
      onTap: () => _showDateRangePicker(ctrl),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: hasDateRange ? AppColors.primary : AppColors.borderLight,
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.calendar_today_rounded,
              size: 16,
              color: hasDateRange ? AppColors.primary : AppColors.textSecondary,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                hasDateRange
                    ? '${ctrl.dateFromFilter.isNotEmpty ? ctrl.dateFromFilter : 'Start'} - ${ctrl.dateToFilter.isNotEmpty ? ctrl.dateToFilter : 'End'}'
                    : 'Select due date range',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: hasDateRange
                      ? AppColors.textPrimary
                      : AppColors.textSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInvoicesList(OwnerFinanceController controller) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount:
          controller.filteredInvoices.length +
          (controller.hasMoreInvoices ? 1 : 0),
      itemBuilder: (context, index) {
        // Show loading indicator at the bottom when loading more
        if (index == controller.filteredInvoices.length) {
          return _buildLoadingMore();
        }

        final invoice = controller.filteredInvoices[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _buildInvoiceCard(invoice, controller),
        );
      },
    );
  }

  Widget _buildInvoiceCard(Invoice invoice, OwnerFinanceController controller) {
    final statusColor = _getStatusColor(invoice.status);
    final isPaid = invoice.status == 'PAID';
    final isOverdue = invoice.status == 'OVERDUE';
    final isCancelled = invoice.status == 'CANCELLED';
    final isSelected = controller.isSelected(invoice.id);
    final isSelectableForPayment = controller.isInvoiceSelectableForPayment(
      invoice.id,
    );

    return Container(
      decoration: BoxDecoration(
        color: isSelected
            ? AppColors.primary.withOpacity(0.1)
            : !isSelectableForPayment
            ? AppColors.textSecondary.withOpacity(0.05)
            : isPaid
            ? AppColors.success.withOpacity(0.05)
            : isOverdue || isCancelled
            ? AppColors.error.withOpacity(0.05)
            : AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelected
              ? AppColors.primary.withOpacity(0.5)
              : !isSelectableForPayment
              ? AppColors.textSecondary.withOpacity(0.3)
              : isPaid
              ? AppColors.success.withOpacity(0.2)
              : isOverdue || isCancelled
              ? AppColors.error.withOpacity(0.2)
              : AppColors.borderLight,
          width: isSelected ? 2.0 : 1.5,
        ),
      ),
      child: InkWell(
        onTap: () {
          if (controller.isSelectionMode) {
            // Only allow selection of payable invoices
            if (isSelectableForPayment) {
              controller.toggleInvoiceSelection(invoice.id);
            }
          } else {
            _navigateToInvoiceDetail(invoice);
          }
        },
        onLongPress: () {
          if (!controller.isSelectionMode) {
            controller.enterSelectionMode();
            controller.selectInvoice(invoice.id);
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: Invoice Number + Status Badge
              Row(
                children: [
                  // Selection Checkbox (only show in selection mode)
                  if (controller.isSelectionMode) ...[
                    Container(
                      margin: const EdgeInsets.only(right: 12),
                      child: Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.primary
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.borderLight,
                            width: 2,
                          ),
                        ),
                        child: isSelected
                            ? const Icon(
                                Icons.check,
                                size: 14,
                                color: Colors.white,
                              )
                            : null,
                      ),
                    ),
                  ],
                  // Invoice Icon and Number
                  Expanded(
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Icon(
                            Icons.receipt_long_rounded,
                            size: 14,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Invoice Number',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                  letterSpacing: 0.3,
                                ),
                              ),
                              Text(
                                invoice.invoiceNumber,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Status Badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: statusColor.withOpacity(0.3),
                        width: 1.5,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _getStatusIcon(invoice.status),
                          size: 12,
                          color: statusColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          invoice.status,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: statusColor,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              _buildInfoRow(
                icon: Icons.home_rounded,
                title: 'Property',
                value: invoice.displayPropertyName,
                iconColor: AppColors.info,
              ),

              const SizedBox(height: 12),

              // Amount and Due Date in same row
              Row(
                children: [
                  Expanded(
                    child: _buildInfoRow(
                      icon: Icons.attach_money_rounded,
                      title: 'Amount',
                      value: invoice.totalAmount,
                      iconColor: AppColors.primary,
                      isCompact: true,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildInfoRow(
                      icon: Icons.calendar_today_rounded,
                      title: 'Due Date',
                      value: _formatDate(invoice.dueDate),
                      iconColor: AppColors.warning,
                      isCompact: true,
                    ),
                  ),
                ],
              ),

              // Balance Section (if applicable)
              if (invoice.balance != '0' && invoice.balance.isNotEmpty) ...[
                const SizedBox(height: 12),
                _buildInfoRow(
                  icon: Icons.account_balance_wallet_rounded,
                  title: 'Outstanding Balance',
                  value: invoice.balance,
                  iconColor: AppColors.error,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline_rounded, size: 64, color: AppColors.error),
            const SizedBox(height: 16),
            Text(
              'Error Loading Invoices',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              error,
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => _controller.loadInvoices(),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInitialLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Loading invoices...'),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.receipt_long_outlined,
              size: 64,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
            Text(
              'No Invoices Found',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'There are no invoices matching your current filters.',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  void _navigateToInvoiceDetail(Invoice invoice) {
    Get.to(() => InvoiceDetailScreen(invoice: invoice));
  }

  void _showMultiInvoicePaymentModal() {
    // Validate selection state before opening modal
    if (!_controller.isSelectionMode) {
      Get.snackbar(
        'Selection Required',
        'Please enter selection mode first by long-pressing an invoice',
        snackPosition: SnackPosition.TOP,
        backgroundColor: AppColors.warning,
        colorText: Colors.white,
      );
      return;
    }

    if (_controller.selectedInvoices.isEmpty) {
      Get.snackbar(
        'No Invoices Selected',
        'Please select at least one invoice to pay',
        snackPosition: SnackPosition.TOP,
        backgroundColor: AppColors.error,
        colorText: Colors.white,
      );
      return;
    }

    // Ensure we have valid invoice data
    final selectedInvoices = _controller.selectedInvoices;
    if (selectedInvoices.isEmpty) {
      Get.snackbar(
        'Invalid Selection',
        'No valid invoices found. Please try selecting again.',
        snackPosition: SnackPosition.TOP,
        backgroundColor: AppColors.error,
        colorText: Colors.white,
      );
      return;
    }

    // Show multi-invoice payment modal
    Get.dialog(
      OwnerMultiInvoicePaymentModal(
        selectedInvoices: selectedInvoices,
        totalAmount: '\$${_controller.totalSelectedAmount.toStringAsFixed(2)}',
      ),
      barrierColor: Colors.black54,
    ).then((result) {
      // Handle modal result
      if (result == true) {
        // Payment was successful, refresh data and clear selection

        // Clear selection mode and selected invoices
        _controller.clearSelection();

        // Refresh invoice data
        _controller.loadInvoices();

        // Show success message
        Get.snackbar(
          'Payment Success',
          'Invoices updated successfully',
          snackPosition: SnackPosition.TOP,
          backgroundColor: AppColors.success,
          colorText: Colors.white,
          duration: const Duration(seconds: 3),
        );
      }
    });
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
      case 'CANCELLED':
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'PAID':
        return Icons.check_circle_rounded;
      case 'OVERDUE':
        return Icons.warning_rounded;
      case 'ISSUED':
        return Icons.schedule_rounded;
      case 'DRAFT':
        return Icons.edit_note_rounded;
      case 'CANCELLED':
        return Icons.cancel_rounded;
      default:
        return Icons.info_outline_rounded;
    }
  }

  bool _hasActiveFilters(OwnerFinanceController controller) {
    return controller.statusFilter.isNotEmpty ||
        controller.dateFromFilter.isNotEmpty ||
        controller.dateToFilter.isNotEmpty;
  }

  int _getActiveFilterCount(OwnerFinanceController controller) {
    int count = 0;
    count += controller.statusFilter.length;
    if (controller.dateFromFilter.isNotEmpty) count++;
    if (controller.dateToFilter.isNotEmpty) count++;
    return count;
  }

  void _showDateRangePicker([OwnerFinanceController? controller]) async {
    final ctrl = controller ?? _controller;

    try {
      final DateTimeRange? picked = await showDateRangePicker(
        context: context,
        firstDate: DateTime(2020),
        lastDate: DateTime.now().add(const Duration(days: 365)),
        initialDateRange: _getInitialDateRange(ctrl),
        builder: (context, child) {
          return Theme(
            data: Theme.of(context).copyWith(
              colorScheme: ColorScheme.light(
                primary: AppColors.primary,
                onPrimary: AppColors.white,
                surface: AppColors.white,
                onSurface: AppColors.textPrimary,
              ),
            ),
            child: child!,
          );
        },
      );

      if (picked != null) {
        final startDate = picked.start.toIso8601String().split('T')[0];
        final endDate = picked.end.toIso8601String().split('T')[0];

        ctrl.setDateFromFilter(startDate);
        ctrl.setDateToFilter(endDate);
      }
    } catch (e) {
      // Fallback to individual date pickers if range picker fails
      await _showIndividualDatePickers(ctrl);
    }
  }

  Future<void> _showIndividualDatePickers(
    OwnerFinanceController controller,
  ) async {
    // Show start date picker
    final startDate = await showDatePicker(
      context: context,
      initialDate: DateTime.now().subtract(const Duration(days: 30)),
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: AppColors.white,
              surface: AppColors.white,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (startDate != null) {
      // Show end date picker
      final endDate = await showDatePicker(
        context: context,
        initialDate: startDate.add(const Duration(days: 1)),
        firstDate: startDate,
        lastDate: DateTime.now().add(const Duration(days: 365)),
        builder: (context, child) {
          return Theme(
            data: Theme.of(context).copyWith(
              colorScheme: ColorScheme.light(
                primary: AppColors.primary,
                onPrimary: AppColors.white,
                surface: AppColors.white,
                onSurface: AppColors.textPrimary,
              ),
            ),
            child: child!,
          );
        },
      );

      if (endDate != null) {
        final startDateStr = startDate.toIso8601String().split('T')[0];
        final endDateStr = endDate.toIso8601String().split('T')[0];

        controller.setDateFromFilter(startDateStr);
        controller.setDateToFilter(endDateStr);
      }
    }
  }

  DateTimeRange? _getInitialDateRange([OwnerFinanceController? controller]) {
    final ctrl = controller ?? _controller;
    if (ctrl.dateFromFilter.isNotEmpty && ctrl.dateToFilter.isNotEmpty) {
      try {
        final startDate = DateTime.parse(ctrl.dateFromFilter);
        final endDate = DateTime.parse(ctrl.dateToFilter);
        return DateTimeRange(start: startDate, end: endDate);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String title,
    required String value,
    required Color iconColor,
    bool isCompact = false,
  }) {
    return Row(
      children: [
        Container(
          padding: EdgeInsets.all(isCompact ? 4 : 6),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(isCompact ? 4 : 6),
          ),
          child: Icon(icon, size: isCompact ? 12 : 14, color: iconColor),
        ),
        SizedBox(width: isCompact ? 8 : 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: isCompact ? 9 : 10,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: isCompact ? 13 : 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  height: 1.2,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingMore() {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Loading more invoices...',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
