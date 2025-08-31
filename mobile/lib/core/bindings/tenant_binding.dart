import 'package:get/get.dart';
import '../controllers/tenant_documents_controller.dart';
import '../controllers/tenant_finance_controller.dart';
import '../controllers/tenant_property_controller.dart';
import '../services/tenant_documents_service.dart';
import '../services/tenant_finance_service.dart';
import '../services/tenant_property_service.dart';
import '../services/tenant_service.dart';
import '../services/api_service.dart';

class TenantBinding extends Bindings {
  @override
  void dependencies() {
    // Services
    Get.lazyPut<TenantDocumentsService>(
      () => TenantDocumentsService(Get.find<ApiService>()),
    );
    Get.lazyPut<TenantFinanceService>(() => TenantFinanceService());
    Get.lazyPut<TenantPropertyService>(
      () => TenantPropertyService(Get.find<ApiService>()),
    );
    Get.lazyPut<TenantService>(() => TenantService(Get.find<ApiService>()));

    // Controllers
    Get.lazyPut<TenantDocumentsController>(() => TenantDocumentsController());
    Get.lazyPut<TenantFinanceController>(() => TenantFinanceController());
    Get.lazyPut<TenantPropertyController>(() => TenantPropertyController());
  }
}
