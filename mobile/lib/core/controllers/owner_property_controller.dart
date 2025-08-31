import 'package:get/get.dart';
import '../models/owner_property_model.dart';
import '../services/owner_property_service.dart';
import '../../features/owner/screens/owner_property_details_screen.dart';

class OwnerPropertyController extends GetxController {
  final OwnerPropertyService _propertyService =
      Get.find<OwnerPropertyService>();

  final RxList<OwnerProperty> _properties = <OwnerProperty>[].obs;
  final RxList<OwnerProperty> _filteredProperties = <OwnerProperty>[].obs;
  final RxBool _isLoadingProperties = false.obs;
  final RxString _error = ''.obs;
  final RxBool _hasMoreProperties = true.obs;

  // Filter states
  final RxList<String> _statusFilter = <String>[].obs;
  final RxString _searchQuery = ''.obs;

  // Pagination
  int _currentPage = 1;
  static const int _pageSize = 20;

  List<OwnerProperty> get properties => _filteredProperties;
  List<OwnerProperty> get filteredProperties => _filteredProperties;
  bool get isLoadingProperties => _isLoadingProperties.value;
  String get error => _error.value;
  bool get hasMoreProperties => _hasMoreProperties.value;

  // Filter getters
  List<String> get statusFilter => _statusFilter;
  String get searchQuery => _searchQuery.value;

  // Method to load data when properties tab is accessed
  Future<void> loadDataWhenTabAccessed() async {
    print('OwnerPropertyController: loadDataWhenTabAccessed called');
    print(
      'OwnerPropertyController: Current properties count: ${_properties.length}',
    );
    print(
      'OwnerPropertyController: Current filtered properties count: ${_filteredProperties.length}',
    );

    // Simple approach: always load fresh data (like tenant screen)
    print('OwnerPropertyController: Loading properties...');
    await loadProperties();
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

  void setSearchQuery(String query) {
    _searchQuery.value = query;
    _applyFilters();
  }

  void clearFilters() {
    _statusFilter.clear();
    _searchQuery.value = '';
    _applyFilters();
  }

  void _refreshProperties() {
    _properties.clear();
    _filteredProperties.clear();
    _hasMoreProperties.value = true;
    _currentPage = 1;
    loadProperties();
  }

  void _applyFilters() {
    List<OwnerProperty> filtered = List.from(_properties);

    // Apply status filter
    if (_statusFilter.isNotEmpty) {
      filtered = filtered
          .where((property) => _statusFilter.contains(property.status))
          .toList();
    }

    // Apply search filter
    if (_searchQuery.value.isNotEmpty) {
      final query = _searchQuery.value.toLowerCase();
      filtered = filtered
          .where(
            (property) =>
                property.propertyName.toLowerCase().contains(query) ||
                property.propertyAddress.toLowerCase().contains(query) ||
                (property.unitName?.toLowerCase().contains(query) ?? false),
          )
          .toList();
    }

    _filteredProperties.assignAll(filtered);

    // Notify UI of filter changes
    update();
  }

  Future<void> loadProperties() async {
    if (_isLoadingProperties.value) return;

    try {
      print('OwnerPropertyController: Starting to load properties...');
      _isLoadingProperties.value = true;
      _error.value = '';

      print('OwnerPropertyController: Calling property service...');

      // Simple API call without timeout (like tenant screen)
      final result = await _propertyService.getProperties(
        page: _currentPage,
        pageSize: _pageSize,
      );

      print('OwnerPropertyController: Service result: $result');

      if (result['success'] == true) {
        final List<OwnerProperty> newProperties = result['data'] ?? [];
        print(
          'OwnerPropertyController: Loaded ${newProperties.length} properties',
        );

        if (_currentPage == 1) {
          _properties.clear();
          _filteredProperties.clear();
        }

        _properties.addAll(newProperties);
        _applyFilters();

        _hasMoreProperties.value = newProperties.length >= _pageSize;
        _currentPage++;

        // Notify UI of successful data load
        update();
      } else {
        _error.value = result['message'] ?? 'Failed to load properties';
        print(
          'OwnerPropertyController: Error loading properties: ${_error.value}',
        );

        // Notify UI of error
        update();
      }
    } catch (e) {
      _error.value = 'Error loading properties: ${e.toString()}';
      print('OwnerPropertyController: Exception in loadProperties: $e');

      // Notify UI of exception
      update();
    } finally {
      _isLoadingProperties.value = false;
      print('OwnerPropertyController: Finished loading properties');

      // Notify UI that loading is finished
      update();
    }
  }

  Future<void> refreshProperties() async {
    _currentPage = 1;
    _hasMoreProperties.value = true;
    await loadProperties();

    // Notify UI of refresh completion
    update();
  }

  void clearError() {
    _error.value = '';
  }

  void setStatusFilter(String status) {
    if (status.isEmpty) {
      _statusFilter.clear();
    } else {
      _statusFilter.assignAll([status]);
    }
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

  void clearSearchQuery() {
    _searchQuery.value = '';
    _applyFilters();
  }

  // Property statistics
  int get totalProperties => _properties.length;
  int get activeProperties => _properties.where((p) => p.isActive).length;
  int get inactiveProperties => _properties.where((p) => p.isInactive).length;
  int get maintenanceProperties =>
      _properties.where((p) => p.isUnderMaintenance).length;
  int get soldProperties => _properties.where((p) => p.isSold).length;

  int get totalUnits => _properties.fold(0, (sum, p) => sum + p.totalUnits);
  int get totalOccupiedUnits =>
      _properties.fold(0, (sum, p) => sum + p.occupiedUnits);
  int get totalVacantUnits =>
      _properties.fold(0, (sum, p) => sum + p.vacantUnits);

  double get overallOccupancyRate {
    if (totalUnits == 0) return 0.0;
    return (totalOccupiedUnits / totalUnits) * 100;
  }

  // Method to handle property selection and navigation
  void onPropertyTap(OwnerProperty property) {
    print('OwnerPropertyController: Property tapped: ${property.propertyName}');
    print('OwnerPropertyController: Property ID: ${property.id}');
    print(
      'OwnerPropertyController: Property Address: ${property.propertyAddress}',
    );

    try {
      Get.to(() => OwnerPropertyDetailsScreen(property: property));
      print('OwnerPropertyController: Navigation successful');
    } catch (e) {
      print('OwnerPropertyController: Navigation error: $e');
    }
  }

  // Method to load property details from API
  Future<Map<String, dynamic>?> loadPropertyDetails(String propertyId) async {
    try {
      print(
        'OwnerPropertyController: Loading property details for: $propertyId',
      );

      // Add timeout to prevent hanging
      final result = await _propertyService
          .getPropertyDetails(propertyId)
          .timeout(
            const Duration(seconds: 20),
            onTimeout: () {
              print('OwnerPropertyController: Service call timed out');
              return {'success': false, 'message': 'Service call timed out'};
            },
          );

      print('OwnerPropertyController: Service result: $result');

      if (result['success'] == true) {
        print('OwnerPropertyController: Property details loaded successfully');
        print('OwnerPropertyController: Data keys: ${result['data']?.keys}');
        return result['data'];
      } else {
        print(
          'OwnerPropertyController: Failed to load property details: ${result['message']}',
        );
        return null;
      }
    } catch (e) {
      print('OwnerPropertyController: Error loading property details: $e');
      return null;
    }
  }

  // Method to force refresh property details (clear stuck states)
  Future<Map<String, dynamic>?> forceRefreshPropertyDetails(
    String propertyId,
  ) async {
    try {
      print(
        'OwnerPropertyController: Force refreshing property details for: $propertyId',
      );

      // Clear any potential stuck states
      await Future.delayed(const Duration(milliseconds: 100));

      return await loadPropertyDetails(propertyId);
    } catch (e) {
      print('OwnerPropertyController: Error in force refresh: $e');
      return null;
    }
  }
}
