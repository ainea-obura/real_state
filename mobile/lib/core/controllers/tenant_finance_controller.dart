import 'package:get/get.dart';
import '../models/invoice_model.dart';
import '../models/payment_model.dart';
import '../models/invoice_item_model.dart';
import '../services/tenant_finance_service.dart';
import '../controllers/auth_controller.dart';
import 'package:flutter/foundation.dart';

class TenantFinanceController extends GetxController {
  final TenantFinanceService _financeService = Get.find<TenantFinanceService>();

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
    if (_invoices.isNotEmpty) {
      // Data already loaded, no need to reload
      return;
    }
    loadInvoices();
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

      final result = await _financeService.fetchTenantInvoices(
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

  Future<void> loadPayments(String invoiceId) async {
    if (_isLoadingPayments.value) return;

    print('=== loadPayments Debug ===');
    print('Starting to load payments for invoice: $invoiceId');
    print('==========================');

    try {
      _setLoadingPayments(true);
      _setLoadingInvoiceItems(true);
      _clearError();

      // Get current user ID from auth controller
      final authController = Get.find<AuthController>();
      final user = authController.currentUser;

      if (user == null) {
        throw Exception('User not authenticated');
      }

      print('User authenticated: ${user.id}');
      print('Calling fetchInvoiceDetail...');

      final result = await _financeService.fetchInvoiceDetail(
        invoiceId: invoiceId,
      );

      print('API call completed successfully');
      print('Result type: ${result.runtimeType}');
      print('Payments count: ${result.payments.length}');
      print('Items count: ${result.items.length}');

      // Debug: Log the raw result
      if (kDebugMode) {
        print('=== API Response Debug ===');
        print('Result type: ${result.runtimeType}');
        print('Result: $result');
        print('Payments count: ${result.payments.length}');
        if (result.payments.isNotEmpty) {
          print('First payment: ${result.payments.first}');
        }
        print('Items count: ${result.items.length}');
        if (result.items.isNotEmpty) {
          print('First item: ${result.items.first}');
        }
        print('========================');
      }

      // Always clear previous data when loading a new invoice
      _payments.clear();
      _invoiceItems.clear();
      _hasMorePayments.value = true;

      // Safely add payments and items with null checking
      _payments.addAll(result.payments);
      _invoiceItems.addAll(result.items);

      print('Data added to controller:');
      print('Payments in controller: ${_payments.length}');
      print('Items in controller: ${_invoiceItems.length}');

      // If both payments and items are empty, show appropriate message
      if ((result.payments.isEmpty) && (result.items.isEmpty)) {
        _setError('This invoice has no items or payment history.');
      }

      // Check if there are more payments (for future pagination)
      if (result.payments.length < 15) {
        _hasMorePayments.value = false;
      }

      update();
    } catch (e) {
      print('=== loadPayments Error ===');
      print('Error: $e');
      print('==========================');

      String errorMessage = 'Failed to load invoice details';

      if (e.toString().contains(
        'type \'Null\' is not a subtype of type \'String\'',
      )) {
        errorMessage =
            'Data format error: Some invoice data is missing or corrupted. Please contact support.';
      } else if (e.toString().contains('timeout')) {
        errorMessage =
            'Request timed out. Please check your connection and try again.';
      } else if (e.toString().contains('404')) {
        errorMessage = 'Invoice not found. It may have been deleted or moved.';
      } else if (e.toString().contains('500')) {
        errorMessage = 'Server error. Please try again later.';
      } else {
        errorMessage = 'Failed to load invoice details: ${e.toString()}';
      }

      _setError(errorMessage);
    } finally {
      _setLoadingPayments(false);
      _setLoadingInvoiceItems(false);
    }
  }

  void clearPayments() {
    _payments.clear();
    _invoiceItems.clear();
    _hasMorePayments.value = true;
    // Reset loading states to prevent stuck loading
    _setLoadingPayments(false);
    _setLoadingInvoiceItems(false);
  }

  // Force clear and reload payments to ensure fresh Payment objects
  Future<void> forceReloadPayments(String invoiceId) async {
    print('=== Force Reloading Payments ===');
    print('Clearing existing payments...');

    // Clear all existing data
    _payments.clear();
    _invoiceItems.clear();
    _hasMorePayments.value = true;
    _setLoadingPayments(false);
    _setLoadingInvoiceItems(false);
    _clearError();

    print('Existing payments cleared. Reloading...');

    // Force reload the data
    await loadInvoiceDetails(invoiceId);
  }

  // Complete reset - forces recreation of all objects
  Future<void> completeReset(String invoiceId) async {
    print('=== COMPLETE RESET ===');
    print('This will force recreation of all objects...');

    // Clear all data
    _payments.clear();
    _invoiceItems.clear();
    _hasMorePayments.value = true;
    _setLoadingPayments(false);
    _setLoadingInvoiceItems(false);
    _clearError();
    clearPropertyInfo();

    print('All objects cleared. Reloading fresh data...');

    // Reload fresh data
    await loadInvoiceDetails(invoiceId);
  }

  // Method to safely handle empty or corrupted data
  void handleEmptyData() {
    _setError(
      'No invoice data available. This invoice may be empty or corrupted.',
    );
    _setLoadingPayments(false);
    _setLoadingInvoiceItems(false);
    update();
  }

  // Method to debug invoice data (for development)
  void debugInvoiceData(String invoiceId) {
    if (kDebugMode) {
      print('=== Invoice Debug Info ===');
      print('Invoice ID: $invoiceId');
      print('Payments count: ${_payments.length}');
      print('Invoice items count: ${_invoiceItems.length}');
      print('Error state: $_error');
      print('Loading payments: $_isLoadingPayments');
      print('Loading items: $_isLoadingInvoiceItems');
      print('========================');
    }
  }

  // Property information state
  final RxMap<String, dynamic> _propertyInfo = <String, dynamic>{}.obs;
  final RxBool _isLoadingPropertyInfo = false.obs;
  final RxBool _hasPropertyInfo = false.obs;

  // Multi-invoice selection state
  final RxBool _isSelectionMode = false.obs;
  final RxSet<String> _selectedInvoiceIds = <String>{}.obs;

  // Property information getters
  Map<String, dynamic> get propertyInfo => _propertyInfo;
  bool get isLoadingPropertyInfo => _isLoadingPropertyInfo.value;
  bool get hasPropertyInfo => _hasPropertyInfo.value;

  // Multi-invoice selection getters
  bool get isSelectionMode => _isSelectionMode.value;
  Set<String> get selectedInvoiceIds => _selectedInvoiceIds;
  int get selectedInvoiceCount => _selectedInvoiceIds.length;
  bool get hasSelectedInvoices => _selectedInvoiceIds.isNotEmpty;

  // Method to fetch property information for an invoice
  Future<void> fetchPropertyInfo(String invoiceId) async {
    if (_isLoadingPropertyInfo.value) return;

    try {
      _setLoadingPropertyInfo(true);
      _clearError();

      final propertyData = await _financeService.fetchPropertyDetailsForInvoice(
        invoiceId: invoiceId,
      );

      if (propertyData != null && propertyData.isNotEmpty) {
        _propertyInfo.value = propertyData;
        _hasPropertyInfo.value = true;
      } else {
        _hasPropertyInfo.value = false;
      }

      update();
    } catch (e) {
      _setError('Failed to fetch property information: $e');
      _hasPropertyInfo.value = false;
    } finally {
      _setLoadingPropertyInfo(false);
    }
  }

  // Method to clear property information
  void clearPropertyInfo() {
    _propertyInfo.clear();
    _hasPropertyInfo.value = false;
  }

  Future<void> loadInvoiceDetails(String invoiceId) async {
    // Clear any previous errors before loading
    _clearError();

    // Debug the invoice data
    debugInvoiceData(invoiceId);

    // Clear previous data
    clearPayments();
    clearPropertyInfo();

    print('=== loadInvoiceDetails Debug ===');
    print('Starting to load invoice details for ID: $invoiceId');
    print('===============================');

    try {
      // Fetch both invoice details and property information
      await Future.wait([
        loadPayments(invoiceId),
        fetchPropertyInfo(invoiceId),
      ]);

      print('=== loadInvoiceDetails Success ===');
      print('Payments loaded: ${_payments.length}');
      print('Items loaded: ${_invoiceItems.length}');
      print('Property info loaded: ${_hasPropertyInfo.value}');
      print('===============================');
    } catch (e) {
      print('=== loadInvoiceDetails Error ===');
      print('Error loading invoice details: $e');
      print('===============================');
      _setError('Failed to load invoice details: $e');
    }
  }

  void _setLoadingInvoices(bool loading) => _isLoadingInvoices.value = loading;
  void _setLoadingPayments(bool loading) => _isLoadingPayments.value = loading;
  void _setLoadingInvoiceItems(bool loading) =>
      _isLoadingInvoiceItems.value = loading;
  void _setError(String error) => _error.value = error;
  void _clearError() => _error.value = '';
  void _setLoadingPropertyInfo(bool loading) =>
      _isLoadingPropertyInfo.value = loading;

  // Multi-invoice selection methods
  void enterSelectionMode() {
    // Ensure invoices are loaded before entering selection mode
    if (_invoices.isEmpty) {
      // Try to load invoices if none are available
      loadInvoices();
    }

    _isSelectionMode.value = true;
    _selectedInvoiceIds.clear();
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

  void deselectInvoice(String invoiceId) {
    _selectedInvoiceIds.remove(invoiceId);
    update();
  }

  void clearSelection() {
    _selectedInvoiceIds.clear();
    _isSelectionMode.value = false; // Exit selection mode
    update();
  }

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
}
