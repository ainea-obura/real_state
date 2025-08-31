import 'package:get/get.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';
import '../services/tenant_service.dart';
import '../services/owner_service.dart';
import '../services/owner_dashboard_service.dart';
import '../controllers/auth_controller.dart';
import '../controllers/timer_controller.dart';
import '../controllers/owner_finance_controller.dart';
import '../controllers/owner_dashboard_controller.dart';
import '../services/owner_finance_service.dart';
import '../../features/tenant/services/payment_service.dart'
    as TenantPaymentService;
import '../../features/owner/services/payment_service.dart'
    as OwnerPaymentService;

class InitialBinding extends Bindings {
  @override
  void dependencies() {
    // Core services - Lazy singletons
    Get.lazyPut<StorageService>(() => StorageService(), fenix: true);
    Get.lazyPut<ApiService>(() => ApiService(), fenix: true);
    Get.lazyPut<AuthService>(() => AuthService(), fenix: true);

    // Tenant services - Lazy singletons
    Get.lazyPut<TenantService>(
      () => TenantService(Get.find<ApiService>()),
      fenix: true,
    );

    // Owner services - Lazy singletons
    Get.lazyPut<OwnerService>(
      () => OwnerService(Get.find<ApiService>()),
      fenix: true,
    );

    // Payment services - Lazy singletons with ApiService dependency (tagged)
    Get.lazyPut<TenantPaymentService.PaymentService>(
      () => TenantPaymentService.PaymentService(Get.find<ApiService>()),
      tag: 'tenant_payment_service',
      fenix: true,
    );

    Get.lazyPut<OwnerPaymentService.PaymentService>(
      () => OwnerPaymentService.PaymentService(Get.find<ApiService>()),
      tag: 'owner_payment_service',
      fenix: true,
    );

    // Controllers - Initialize TimerController first
    Get.put<TimerController>(TimerController(), permanent: true);
    // Then AuthController (depends on TimerController)
    Get.put<AuthController>(AuthController(), permanent: true);

    // Owner Finance - Lazy singletons
    Get.lazyPut<OwnerFinanceService>(() => OwnerFinanceService(), fenix: true);
    Get.lazyPut<OwnerFinanceController>(
      () => OwnerFinanceController(),
      fenix: true,
    );

    // Owner Dashboard - Lazy singletons
    Get.lazyPut<OwnerDashboardService>(
      () => OwnerDashboardService(),
      fenix: true,
    );
    Get.lazyPut<OwnerDashboardController>(
      () => OwnerDashboardController(),
      fenix: true,
    );
  }
}
