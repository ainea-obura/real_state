import 'package:get/get.dart';
import '../services/owner_dashboard_service.dart';

class OwnerDashboardController extends GetxController {
  OwnerDashboardService? _dashboardService;

  final RxBool isLoading = false.obs;
  final RxString error = ''.obs;
  final Rx<dynamic> dashboardData = Rx<dynamic>(null);

  @override
  void onInit() {
    super.onInit();
    print('OwnerDashboardController: onInit called');
    try {
      _dashboardService = Get.find<OwnerDashboardService>();
      print('OwnerDashboardController: Service found successfully');
      loadDashboardData();
    } catch (e) {
      print('OwnerDashboardController: Service not found: $e');
      error.value = 'Service not available';
    }
  }

  Future<void> loadDashboardData() async {
    try {
      if (_dashboardService == null) {
        error.value = 'Dashboard service not available';
        return;
      }

      isLoading.value = true;
      error.value = '';

      final result = await _dashboardService!.getOwnerDashboard();

      if (result['error'] == true) {
        error.value = result['message'] ?? 'Failed to load dashboard data';
        dashboardData.value = null;
      } else {
        dashboardData.value = result;
        error.value = '';
      }
    } catch (e) {
      error.value = 'Error loading dashboard data: ${e.toString()}';
      dashboardData.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  void refreshData() {
    loadDashboardData();
  }

  void clearError() {
    error.value = '';
  }
}
