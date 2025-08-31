import 'package:get/get.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/otp_screen.dart';
import '../../features/auth/screens/unauthorized_screen.dart';
import '../../features/auth/screens/splash_screen.dart';
import '../../features/auth/screens/forgot_password_screen.dart';
import '../../features/auth/screens/forgot_password_otp_screen.dart';
import '../../features/auth/screens/reset_password_screen.dart';
import '../../features/tenant/screens/tenant_dashboard_screen.dart';
import '../../features/tenant/screens/tenant_invoices_screen.dart';
import '../../features/tenant/screens/tenant_documents_screen.dart';
import '../../features/tenant/screens/document_viewer_screen.dart';
import '../../features/tenant/screens/tenant_update_info_screen.dart';
import '../../features/owner/screens/owner_dashboard_screen.dart';
import '../../features/owner/screens/owner_profile_screen.dart';
import '../../features/owner/screens/owner_properties_screen.dart';
import '../../features/owner/screens/owner_finance_screen.dart';
import '../../features/owner/screens/owner_accounts_screen.dart';
import '../../features/owner/screens/owner_update_info_screen.dart';
import '../bindings/auth_binding.dart';
import '../bindings/tenant_binding.dart';
import '../bindings/owner_binding.dart';
import 'app_routes.dart';

class AppPages {
  static final List<GetPage> pages = [
    // Splash/Initial route
    GetPage(
      name: AppRoutes.splash,
      page: () => const SplashScreen(),
      binding: AuthBinding(),
    ),

    // Auth routes
    GetPage(
      name: AppRoutes.login,
      page: () => const LoginScreen(),
      binding: AuthBinding(),
    ),

    GetPage(
      name: AppRoutes.otp,
      page: () => const OtpScreen(),
      binding: AuthBinding(),
    ),

    GetPage(
      name: AppRoutes.unauthorized,
      page: () => const UnauthorizedScreen(),
      binding: AuthBinding(),
    ),

    // Password reset routes
    GetPage(
      name: AppRoutes.forgotPassword,
      page: () => const ForgotPasswordScreen(),
      binding: AuthBinding(),
    ),

    GetPage(
      name: AppRoutes.forgotPasswordOtp,
      page: () => const ForgotPasswordOtpScreen(),
      binding: AuthBinding(),
    ),

    GetPage(
      name: AppRoutes.resetPassword,
      page: () => const ResetPasswordScreen(),
      binding: AuthBinding(),
    ),

    // Tenant routes
    GetPage(
      name: AppRoutes.tenantDashboard,
      page: () => const TenantDashboardScreen(),
      binding: TenantBinding(),
    ),

    GetPage(
      name: AppRoutes.tenantUpdateInfo,
      page: () => const TenantUpdateInfoScreen(),
      binding: TenantBinding(),
    ),

    GetPage(
      name: AppRoutes.tenantInvoices,
      page: () => const TenantInvoicesScreen(),
    ),

    GetPage(
      name: AppRoutes.tenantDocuments,
      page: () => const TenantDocumentsScreen(),
      binding: TenantBinding(),
    ),

    GetPage(
      name: AppRoutes.documentViewer,
      page: () => const DocumentViewerScreen(),
    ),

    // Owner routes
    GetPage(
      name: AppRoutes.ownerDashboard,
      page: () => const OwnerDashboardScreen(),
      binding: OwnerBinding(),
    ),

    GetPage(
      name: AppRoutes.ownerProfile,
      page: () => const OwnerProfileScreen(),
      binding: OwnerBinding(),
    ),

    GetPage(
      name: AppRoutes.ownerProperties,
      page: () => const OwnerPropertiesScreen(),
      binding: OwnerBinding(),
    ),

    GetPage(
      name: AppRoutes.ownerFinance,
      page: () => const OwnerFinanceScreen(),
      binding: OwnerBinding(),
    ),

    GetPage(
      name: AppRoutes.ownerAccounts,
      page: () => const OwnerAccountsScreen(),
      binding: OwnerBinding(),
    ),

    GetPage(
      name: AppRoutes.ownerUpdateInfo,
      page: () => const OwnerUpdateInfoScreen(),
      binding: OwnerBinding(),
    ),
  ];
}
