import 'package:get/get.dart';
import '../models/invoice_model.dart';
import '../models/payment_model.dart';
import '../models/invoice_item_model.dart';
import '../services/owner_finance_service.dart';
import '../controllers/auth_controller.dart';

class OwnerFinanceController extends GetxController {
  final OwnerFinanceService _financeService = Get.find<OwnerFinanceService>();

  final RxList<Invoice> _invoices = <Invoice>[].obs;
  final RxList<Invoice> _filteredInvoices = <Invoice>[].obs;
  final RxList<Payment> _payments = <Payment>[].obs;
  final RxList<InvoiceItem> _invoiceItems = <InvoiceItem>[].obs;
  final RxBool _isLoadingInvoices = false.obs;
  final RxBool _isLoadingPayments = false.obs;
  final RxBool _isLoadingInvoiceItems = false.obs;
  final RxString _error = ''.obs;
  final RxBool _hasMoreInvoices = true.obs;
  final RxBool _hasMorePayments = true.obs;

  // Filter states
  final RxList<String> _statusFilter = <String>[].obs;
  final RxString _dateFromFilter = ''.obs;
  final RxString _dateToFilter = ''.obs;

  // Pagination
  int _currentPage = 1;
  static const int _pageSize = 20;

  List<Invoice> get invoices => _filteredInvoices;
  List<Invoice> get filteredInvoices => _filteredInvoices;
  List<Payment> get payments => _payments;
  List<InvoiceItem> get invoiceItems => _invoiceItems;
  bool get isLoadingInvoices => _isLoadingInvoices.value;
  bool get isLoadingPayments => _isLoadingPayments.value;
  bool get isLoadingInvoiceItems => _isLoadingInvoiceItems.value;
  String get error => _error.value;
  bool get hasMoreInvoices => _hasMoreInvoices.value;
  bool get hasMorePayments => _hasMorePayments.value;

  // Filter getters
  List<String> get statusFilter => _statusFilter;
  String get dateFromFilter => _dateFromFilter.value;
  String get dateToFilter => _dateToFilter.value;

  // Method to load data when finance tab is accessed
  Future<void> loadDataWhenTabAccessed() async {
    print('OwnerFinanceController: loadDataWhenTabAccessed called');
    print(
      'OwnerFinanceController: Current invoices count: ${_invoices.length}',
    );

    // Always refresh data when tab is accessed to ensure latest information
    print('OwnerFinanceController: Refreshing invoices for finance tab...');
    await refreshInvoices();
  }

  void addStatusFilter(String status) {
    if (!_statusFilter.contains(status)) {
      _statusFilter.add(status);
      _applyFilters();
    }
  }

  void removeStatusFilter(String status) {
    _statusFilter.remove(status);
    _applyFilters();
  }

  void toggleStatusFilter(String status) {
    if (_statusFilter.contains(status)) {
      _statusFilter.remove(status);
    } else {
      _statusFilter.add(status);
    }
    _applyFilters();
  }

  void setStatusFilter(String status) {
    _statusFilter.clear();
    if (status.isNotEmpty) {
      _statusFilter.add(status);
    }
    _applyFilters();
  }

  void setDateFromFilter(String date) {
    _dateFromFilter.value = date;
    _applyFilters();
  }

  void setDateToFilter(String date) {
    _dateToFilter.value = date;
    _applyFilters();
  }

  void clearFilters() {
    _statusFilter.clear();
    _dateFromFilter.value = '';
    _dateToFilter.value = '';
    _applyFilters();
  }

  void clearDateFilters() {
    _dateFromFilter.value = '';
    _dateToFilter.value = '';
    _applyFilters();
  }

  void _refreshInvoices() {
    _invoices.clear();
    _filteredInvoices.clear();
    _hasMoreInvoices.value = true;
    _currentPage = 1;
    loadInvoices();
  }

  void _applyFilters() {
    List<Invoice> filtered = List.from(_invoices);

    // Apply status filter
    if (_statusFilter.isNotEmpty) {
      filtered = filtered
          .where((invoice) => _statusFilter.contains(invoice.status))
          .toList();
    }

    // Apply date filters
    if (_dateFromFilter.value.isNotEmpty) {
      try {
        final fromDate = DateTime.parse(_dateFromFilter.value);
        filtered = filtered.where((invoice) {
          try {
            final dueDate = DateTime.parse(invoice.dueDate);
            return dueDate.isAfter(fromDate) ||
                dueDate.isAtSameMomentAs(fromDate);
          } catch (e) {
            // Handle date parsing error gracefully
            return true; // Include invoice if date parsing fails
          }
        }).toList();
      } catch (e) {
        // Handle filter error gracefully
        return;
      }
    }

    if (_dateToFilter.value.isNotEmpty) {
      try {
        final toDate = DateTime.parse(_dateToFilter.value);
        filtered = filtered.where((invoice) {
          try {
            final dueDate = DateTime.parse(invoice.dueDate);
            return dueDate.isBefore(toDate) || dueDate.isAtSameMomentAs(toDate);
          } catch (e) {
            return true; // Include invoice if date parsing fails
          }
        }).toList();
      } catch (e) {
        // Handle filter error gracefully
        return;
      }
    }

    _filteredInvoices.value = filtered;
    update();
  }

  Future<void> loadInvoices() async {
    if (_isLoadingInvoices.value) return;

    try {
      _setLoadingInvoices(true);
      _clearError();

      // Get current user ID from auth controller
      final authController = Get.find<AuthController>();
      final user = authController.currentUser;

      if (user == null) {
        throw Exception('User not authenticated');
      }

      final result = await _financeService.fetchOwnerInvoices(
        userId: user.id,
        page: _currentPage,
        pageSize: _pageSize,
      );

      if (_currentPage == 1) {
        _invoices.clear();
        _filteredInvoices.clear();
      }

      _invoices.addAll(result.invoices);
      // Apply current filters
      _applyFilters();

      // Check if there are more pages
      if (result.invoices.length < _pageSize) {
        _hasMoreInvoices.value = false;
      } else {
        _currentPage++;
      }

      update();
    } catch (e) {
      _setError('Failed to load invoices: $e');
    } finally {
      _setLoadingInvoices(false);
    }
  }

  Future<void> refreshInvoices() async {
    // Reset pagination and load fresh invoices
    _currentPage = 1;
    _hasMoreInvoices.value = true;
    _invoices.clear();
    _filteredInvoices.clear();
    await loadInvoices();
  }

  Future<void> loadInvoiceDetails(String invoiceId) async {
    if (_isLoadingPayments.value || _isLoadingInvoiceItems.value) return;

    try {
      _setLoadingPayments(true);
      _setLoadingInvoiceItems(true);
      _clearError();

      final result = await _financeService.fetchInvoiceDetail(
        invoiceId: invoiceId,
      );

      // Clear existing data for this invoice
      _payments.removeWhere((payment) => payment.invoiceId == invoiceId);
      _invoiceItems.removeWhere((item) => item.invoiceId == invoiceId);

      // Add new data
      _payments.addAll(result.payments);
      _invoiceItems.addAll(result.items);

      update();
    } catch (e) {
      _setError('Failed to load invoice details: $e');
    } finally {
      _setLoadingPayments(false);
      _setLoadingInvoiceItems(false);
    }
  }

  // Selection mode for bulk operations
  final RxBool _isSelectionMode = false.obs;
  final RxSet<String> _selectedInvoiceIds = <String>{}.obs;

  bool get isSelectionMode => _isSelectionMode.value;
  bool get hasSelectedInvoices => _selectedInvoiceIds.isNotEmpty;
  int get selectedInvoiceCount => _selectedInvoiceIds.length;
  List<Invoice> get selectedInvoices {
    try {
      // Ensure we have invoices loaded
      if (_invoices.isEmpty) {
        return [];
      }

      // Filter invoices based on selected IDs
      final selected = _invoices
          .where((invoice) => _selectedInvoiceIds.contains(invoice.id))
          .toList();

      // Validate that all selected IDs have corresponding invoices
      if (selected.length != _selectedInvoiceIds.length) {
        // Some selected IDs don't have corresponding invoices, clean up
        final validIds = selected.map((invoice) => invoice.id).toSet();
        _selectedInvoiceIds.removeWhere((id) => !validIds.contains(id));
        update();
      }

      return selected;
    } catch (e) {
      // If there's an error, clear selection and return empty list
      _selectedInvoiceIds.clear();
      _isSelectionMode.value = false;
      update();
      return [];
    }
  }

  double get totalSelectedAmount {
    double total = 0.0;
    for (final invoice in selectedInvoices) {
      try {
        // Parse the balance amount
        final balanceMatch = RegExp(
          r'[\d,]+\.?\d*',
        ).firstMatch(invoice.balance);
        if (balanceMatch != null) {
          final balanceString = balanceMatch.group(0)!.replaceAll(',', '');
          total += double.tryParse(balanceString) ?? 0.0;
        }
      } catch (e) {
        // Skip this invoice if parsing fails
        continue;
      }
    }
    return total;
  }

  void enterSelectionMode() {
    _isSelectionMode.value = true;
    update();
  }

  void exitSelectionMode() {
    _isSelectionMode.value = false;
    _selectedInvoiceIds.clear();
    update();
  }

  void toggleInvoiceSelection(String invoiceId) {
    // Check if invoice is selectable for payment
    if (!_isInvoiceSelectableForPayment(invoiceId)) {
      return; // Don't allow selection of non-payable invoices
    }

    if (_selectedInvoiceIds.contains(invoiceId)) {
      _selectedInvoiceIds.remove(invoiceId);
    } else {
      _selectedInvoiceIds.add(invoiceId);
    }

    // Exit selection mode if no invoices are selected
    if (_selectedInvoiceIds.isEmpty) {
      exitSelectionMode();
    } else {
      // Ensure we're in selection mode if we have selections
      if (!_isSelectionMode.value) {
        _isSelectionMode.value = true;
      }
    }
    update();
  }

  void selectInvoice(String invoiceId) {
    // Check if invoice is selectable for payment
    if (!_isInvoiceSelectableForPayment(invoiceId)) {
      return; // Don't allow selection of non-payable invoices
    }

    _selectedInvoiceIds.add(invoiceId);
    update();
  }

  void deselectInvoice(String invoiceId) {
    _selectedInvoiceIds.remove(invoiceId);
    update();
  }

  bool isSelected(String invoiceId) {
    return _selectedInvoiceIds.contains(invoiceId);
  }

  /// Check if an invoice can be selected for payment
  /// Only ISSUED and PARTIAL invoices can be selected for payment
  bool _isInvoiceSelectableForPayment(String invoiceId) {
    final invoice = _invoices.firstWhereOrNull((inv) => inv.id == invoiceId);
    if (invoice == null) return false;

    // Only ISSUED and PARTIAL invoices can be selected for payment
    // Exclude PAID, OVERDUE, DRAFT, and CANCELLED invoices
    return invoice.status == 'ISSUED' || invoice.status == 'PARTIAL';
  }

  /// Check if an invoice can be selected for payment (public method for UI)
  bool isInvoiceSelectableForPayment(String invoiceId) {
    return _isInvoiceSelectableForPayment(invoiceId);
  }

  void clearSelection() {
    _selectedInvoiceIds.clear();
    _isSelectionMode.value = false; // Exit selection mode
    update();
  }

  // Private helper methods
  void _setLoadingInvoices(bool loading) {
    _isLoadingInvoices.value = loading;
  }

  void _setLoadingPayments(bool loading) {
    _isLoadingPayments.value = loading;
  }

  void _setLoadingInvoiceItems(bool loading) {
    _isLoadingInvoiceItems.value = loading;
  }

  void _setError(String errorMessage) {
    _error.value = errorMessage;
  }

  void _clearError() {
    _error.value = '';
  }
}
