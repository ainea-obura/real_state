class ApiConstants {
  // Base URL - Update this to match your backend
  static const String baseUrl =
      'http://192.168.100.243:8000/api/v1'; // Changed from 127.0.0.1 to localhost

  // Auth endpoints
  static const String loginEndpoint = '/auth/login/';
  static const String verifyOtpEndpoint = '/auth/verify-otp/';
  static const String refreshTokenEndpoint = '/auth/refresh/';
  static const String resendOtpEndpoint = '/auth/resend-otp/';
  static const String updateProfileEndpoint =
      '/users/update/'; // Updated to match standard pattern

  // Password reset endpoints
  static const String requestPasswordResetEndpoint = '/password-reset-otp';
  static const String verifyPasswordResetOtpEndpoint =
      '/verify-password-reset-otp';
  static const String resetPasswordEndpoint = '/reset-password-after-otp';
  static const String changePasswordEndpoint = '/change-password';

  // Document endpoints
  static const String tenantDocumentsEndpoint = '/documents/tenant-documents/';
  static const String uploadSignedDocumentEndpoint =
      '/documents/tenant-documents/{agreement_id}/upload-signed-document/';

  // Verification endpoints
  static const String verificationListEndpoint = '/projects/verification/list';
  static const String verificationUploadEndpoint =
      '/projects/verification/upload';
  static const String verificationStatusEndpoint =
      '/projects/verification/status';

  // Finance endpoints
  static const String tenantFinanceSummaryEndpoint =
      '/projects/tenants/{tenant_id}/finance-summary';
  static const String tenantInvoicesEndpoint =
      '/finance/invoices/tenant-invoices';
  static const String ownerInvoicesEndpoint =
      '/finance/invoices/owner-invoices';
  static const String invoiceDetailEndpoint =
      '/finance/invoices/{invoice_id}/detail';

  // Property endpoints
  static const String tenantPropertiesEndpoint =
      '/projects/property-assignments?tenant_id={tenant_id}';
  static const String ownerPropertiesEndpoint =
      '/projects/owners/{owner_id}/properties';
  static const String propertyDetailsEndpoint =
      '/projects/properties/{node_id}/details';

  // Owner dashboard endpoints
  static const String ownerDashboardEndpoint = '/owners/{owner_id}';

  // Owner endpoints
  static const String updateOwnerEndpoint = '/projects/owners/{ownerId}/update';
  static const String ownerOverviewEndpoint =
      '/projects/owners/{ownerId}/overview';

  // Tenant endpoints - Only keeping the update endpoint and actively used ones
  static const String updateTenantEndpoint =
      '/projects/tenants/{tenantId}/update';

  // Transaction endpoints
  static const String tenantTransactionsEndpoint =
      '/finance/payments/table?tenant_id={tenant_id}';
  static const String unpaidInvoicesEndpoint =
      '/finance/payments/unpaid-invoices?user_id={user_id}&user_type={user_type}';

  // Account endpoints
  static const String userAccountsEndpoint = '/accounts?user_id={user_id}';
  static const String createAccountEndpoint = '/accounts/create';
  static const String updateAccountEndpoint = '/accounts/{accountId}/update';
  static const String deleteAccountEndpoint = '/accounts/{accountId}/delete';
  // Note: The following endpoints don't exist in the backend yet
  // static const String setDefaultAccountEndpoint = '/accounts/{account_id}/default';
  // static const String toggleAccountStatusEndpoint = '/accounts/{account_id}/status';

  // Request timeouts
  static const Duration connectTimeout = Duration(
    seconds: 60,
  ); // Increased for payment processing
  static const Duration receiveTimeout = Duration(
    seconds: 60,
  ); // Increased for payment processing

  // Headers
  static const Map<String, String> defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Token refresh buffer time (refresh 5 minutes before expiry)
  static const Duration tokenRefreshBuffer = Duration(minutes: 5);
}
