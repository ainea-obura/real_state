# Payment Module for Tenant Mobile App

This module provides a comprehensive payment system for tenants to make payments on their invoices using their saved payment methods.

## Features

- **Payment Modal**: A user-friendly modal for submitting payments
- **Account Integration**: Uses existing account management system
- **Payment Validation**: Prevents overpayment and validates input
- **Success Screen**: Confirmation screen after successful payment
- **Payment History**: View payment history for invoices
- **Real-time Updates**: Automatic refresh of invoice details after payment

## Components

### 1. PaymentModal (`payment_modal.dart`)
The main payment interface that allows tenants to:
- Select from their saved payment methods
- Enter payment amount (with validation)
- Add optional notes
- Submit payment

**Key Features:**
- Auto-selects default payment method
- Prevents overpayment
- Real-time validation
- Error handling

### 2. PaymentService (`payment_service.dart`)
Handles all payment-related API calls:
- Submit payment
- Get payment history
- Get payment status
- Cancel payment
- Validate payment data

**API Endpoints:**
- `POST /api/v1/payments/submit/` - Submit new payment
- `GET /api/v1/payments/history/{invoiceId}/` - Get payment history
- `GET /api/v1/payments/status/{invoiceId}/` - Get payment status
- `POST /api/v1/payments/{paymentId}/cancel/` - Cancel payment

### 3. PaymentSuccessScreen (`payment_success_screen.dart`)
Confirmation screen shown after successful payment:
- Payment details summary
- Invoice balance update
- Next steps information
- Navigation options

### 4. Payment Models (`payment_submission_model.dart`)
Data models for payment operations:
- `PaymentSubmissionModel` - Payment data structure
- `PaymentResponseModel` - API response structure

## Integration with Existing Code

### Invoice Detail Screen
The payment module integrates with the existing `InvoiceDetailScreen`:
- Adds "Pay Now" button in app bar
- Includes payment summary card
- Shows payment history section
- Refreshes data after successful payment

### Account Management
Uses the existing account system:
- Fetches user's active payment methods
- Auto-selects default account
- Supports both bank and mobile money accounts

### Finance Controller
Integrates with `TenantFinanceController`:
- Refreshes invoice details after payment
- Updates payment history
- Maintains data consistency

## Usage

### 1. Show Payment Modal
```dart
void _showPaymentModal() async {
  final result = await Get.dialog(
    PaymentModal(invoice: widget.invoice),
    barrierDismissible: false,
  );
  
  // If payment was successful, refresh the invoice details
  if (result == true) {
    _controller.loadInvoiceDetails(widget.invoice.id);
  }
}
```

### 2. Submit Payment
```dart
final paymentData = {
  'invoice_id': invoice.id,
  'amount': paymentAmount,
  'payment_method': selectedPaymentMethod,
  'account_id': selectedAccount.id,
  'notes': notes,
  'user_id': currentUser.id,
};

final result = await _paymentService.submitPayment(paymentData);
```

### 3. Handle Payment Response
```dart
if (result['success'] == true) {
  // Show success screen
  Get.to(() => PaymentSuccessScreen(
    invoice: invoice,
    paymentData: paymentData,
  ));
} else {
  // Handle error
  ToastUtils.showError(result['message']);
}
```

## Payment Flow

1. **User clicks "Pay Now" button** on invoice detail screen
2. **Payment modal opens** with invoice summary and payment options
3. **User selects payment method** from their saved accounts
4. **User enters payment amount** (validated against invoice balance)
5. **User submits payment** with optional notes
6. **Payment is processed** via API
7. **Success screen is shown** with payment confirmation
8. **Invoice details are refreshed** to show updated balance

## Validation Rules

- Payment amount must be greater than 0
- Payment amount cannot exceed invoice balance
- User must have an active payment method
- All required fields must be filled

## Error Handling

The module includes comprehensive error handling:
- Network errors (timeout, connection issues)
- API errors (validation, authentication, permissions)
- User input errors (invalid amounts, missing fields)
- Graceful fallbacks for edge cases

## Styling

Uses the existing app theme:
- `AppColors` for consistent color scheme
- `EnhancedCard` for card components
- Responsive design for different screen sizes
- Material Design 3 principles

## Dependencies

- `get` - State management and navigation
- `http` - API communication
- Existing app components and utilities

## Future Enhancements

- Payment scheduling
- Recurring payments
- Payment reminders
- Multiple payment methods per transaction
- Payment analytics and reporting
- Offline payment support
- Payment method verification

## Testing

The module should be tested for:
- Payment submission with valid data
- Payment validation (amount limits, required fields)
- Error handling (network, API, validation errors)
- UI responsiveness and accessibility
- Integration with existing components
- Data consistency after payment

## Security Considerations

- Payment data is validated on both client and server
- Authentication is required for all payment operations
- Sensitive data is not logged or stored locally
- API calls use secure HTTPS endpoints
- User permissions are verified before payment submission 