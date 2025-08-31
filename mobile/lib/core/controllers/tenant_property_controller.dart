import 'package:get/get.dart';
import '../models/tenant_property_model.dart';
import '../services/tenant_property_service.dart';
import 'auth_controller.dart';
import 'dart:async';

class TenantPropertyController extends GetxController {
  final TenantPropertyService _propertyService =
      Get.find<TenantPropertyService>();

  // Observable states
  final RxList<TenantProperty> _properties = <TenantProperty>[].obs;
  final RxList<TenantTransaction> _transactions = <TenantTransaction>[].obs;
  final Rx<Map<String, dynamic>?> _financialSummary = Rx<Map<String, dynamic>?>(
    null,
  );
  final RxBool _isLoadingProperties = false.obs;
  final RxBool _isLoadingTransactions = false.obs;
  final RxString _error = ''.obs;

  // Debouncing for updates
  Timer? _updateTimer;
  bool _isUpdating = false;

  // Getters
  List<TenantProperty> get properties => _properties;
  List<TenantTransaction> get transactions => _transactions;
  Map<String, dynamic>? get financialSummary => _financialSummary.value;
  bool get isLoadingProperties => _isLoadingProperties.value;
  bool get isLoadingTransactions => _isLoadingTransactions.value;
  String get error => _error.value;
  bool get hasData => _properties.isNotEmpty;
  bool get hasTransactions => _transactions.isNotEmpty;
  bool get hasFinancialSummary => _financialSummary.value != null;

  // Property summary getters
  int get totalProperties => _properties.length;
  int get activeProperties => _properties.where((p) => p.isActive).length;
  int get expiringSoonProperties =>
      _properties.where((p) => p.isExpiringSoon).length;

  // Primary property (first active property)
  TenantProperty? get primaryProperty {
    if (_properties.isEmpty) return null;
    final active = _properties.where((p) => p.isActive).toList();
    return active.isNotEmpty ? active.first : _properties.first;
  }

  // Recent transaction getters
  TenantTransaction? get lastTransaction {
    return _transactions.isNotEmpty ? _transactions.first : null;
  }

  String get lastTransactionAmount {
    final last = lastTransaction;
    return last?.amount ?? '\$0';
  }

  String get lastTransactionDate {
    final last = lastTransaction;
    return last?.formattedDate ?? 'No payments yet';
  }

  // Method to load data when properties tab is accessed
  Future<void> loadDataWhenTabAccessed() async {
    // Check if data is already loaded to avoid unnecessary reloads
    if (_properties.isNotEmpty && _financialSummary.value != null) {
      return;
    }

    final authController = Get.find<AuthController>();
    final user = authController.currentUser;

    if (user?.id == null) {
      _setError('User not found');
      return;
    }

    // Use Future.microtask to avoid calling update during build
    Future.microtask(() async {
      await Future.wait([loadProperties(user!.id), loadTransactions(user.id)]);
    });
  }

  Future<void> loadProperties(String tenantId) async {
    try {
      _setLoadingProperties(true);
      _clearError();

      final result = await _propertyService
          .fetchTenantPropertiesWithEnhancedData(tenantId);

      final properties = result['properties'] as List<TenantProperty>;

      // Extract financial summary from the first property if available
      Map<String, dynamic>? financialSummary;
      if (properties.isNotEmpty && properties.first.financialSummary != null) {
        financialSummary = properties.first.financialSummary;
      }

      _properties.value = properties;
      _financialSummary.value = financialSummary;

      // Use debounced update to prevent excessive calls
      _debouncedUpdate();
    } catch (e) {
      _setError('Failed to load properties: $e');

      // Show more specific error messages
      if (e.toString().contains('timeout')) {
        _setError('Request timed out. Please check your connection.');
      } else if (e.toString().contains('404')) {
        _setError('Properties not found');
      } else if (e.toString().contains('500')) {
        _setError('Server error. Please try again later.');
      }
    } finally {
      _setLoadingProperties(false);
    }
  }

  Future<void> loadTransactions(String tenantId) async {
    try {
      _setLoadingTransactions(true);

      final transactions = await _propertyService.fetchTenantTransactions(
        tenantId,
        limit: 5,
      );

      _transactions.value = transactions;

      // Use debounced update to prevent excessive calls
      _debouncedUpdate();
    } catch (e) {
      // Don't show error for transactions, just log it
      // Transactions are secondary information
    } finally {
      _setLoadingTransactions(false);
    }
  }

  Future<void> refreshData() async {
    await loadDataWhenTabAccessed();
  }

  Future<void> refreshProperties() async {
    final authController = Get.find<AuthController>();
    final user = authController.currentUser;

    if (user?.id != null) {
      await loadProperties(user!.id);
    }
  }

  Future<void> refreshTransactions() async {
    final authController = Get.find<AuthController>();
    final user = authController.currentUser;

    if (user?.id != null) {
      await loadTransactions(user!.id);
    }
  }

  // Helper methods
  void _setLoadingProperties(bool loading) {
    _isLoadingProperties.value = loading;
    // Don't call update() here to avoid build phase issues
  }

  void _setLoadingTransactions(bool loading) {
    _isLoadingTransactions.value = loading;
    // Don't call update() here to avoid build phase issues
  }

  void _setError(String error) {
    _error.value = error;
    // Use debounced update to prevent excessive calls
    _debouncedUpdate();
  }

  void _clearError() {
    _error.value = '';
    // Use debounced update to prevent excessive calls
    _debouncedUpdate();
  }

  // Debounced update method to prevent excessive update calls
  void _debouncedUpdate() {
    if (_isUpdating) return;

    _updateTimer?.cancel();
    _updateTimer = Timer(const Duration(milliseconds: 100), () {
      if (!_isUpdating && Get.isRegistered<TenantPropertyController>()) {
        _isUpdating = true;
        update();
        _isUpdating = false;
      }
    });
  }

  @override
  void onClose() {
    _updateTimer?.cancel();
    super.onClose();
  }

  // Property helper methods
  String getPropertyStatusColor(TenantProperty property) {
    if (property.isActive) return '0xFF4CAF50'; // Green
    if (property.isExpiringSoon) return '0xFFFF9800'; // Orange
    return '0xFFF44336'; // Red
  }

  String getTransactionStatusColor(TenantTransaction transaction) {
    if (transaction.isCompleted) return '0xFF4CAF50'; // Green
    if (transaction.isPending) return '0xFFFF9800'; // Orange
    return '0xFFF44336'; // Red
  }
}
