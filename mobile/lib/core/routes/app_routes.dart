abstract class AppRoutes {
  // Auth routes
  static const String splash = '/';
  static const String login = '/login';
  static const String otp = '/otp';
  static const String unauthorized = '/unauthorized';

  // Password reset routes
  static const String forgotPassword = '/forgot-password';
  static const String forgotPasswordOtp = '/forgot-password-otp';
  static const String resetPassword = '/reset-password';

  // Dashboard routes
  static const String tenantDashboard = '/tenant-dashboard';
  static const String ownerDashboard = '/owner-dashboard';

  // Tenant routes
  static const String tenantProfile = '/tenant-profile';
  static const String tenantUpdateInfo = '/tenant-update-info';
  static const String tenantProperties = '/tenant-properties';
  static const String tenantFinance = '/tenant-finance';
  static const String tenantInvoices = '/tenant-invoices';
  static const String tenantPayments = '/tenant-payments';
  static const String tenantDocuments = '/tenant-documents';
  static const String documentViewer = '/document-viewer';

  // Owner routes
  static const String ownerProfile = '/owner-profile';
  static const String ownerProperties = '/owner-properties';
  static const String ownerFinance = '/owner-finance';
  static const String ownerAccounts = '/owner-accounts';
  static const String ownerUpdateInfo = '/owner-update-info';
}
