import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:country_picker/country_picker.dart';
import '../../../core/theme/app_colors.dart';

import '../../../core/utils/toast_utils.dart';
import '../../../core/controllers/auth_controller.dart';
import '../../../core/models/payment_method_model.dart';
import '../models/account_model.dart';
import '../services/account_service.dart';

class OwnerAccountsScreen extends StatefulWidget {
  const OwnerAccountsScreen({super.key});

  @override
  State<OwnerAccountsScreen> createState() => _OwnerAccountsScreenState();
}

class _OwnerAccountsScreenState extends State<OwnerAccountsScreen> {
  bool _isLoading = false;
  bool _isOperationLoading = false; // For individual operations
  List<AccountModel> _accounts = [];
  final AuthController _authController = Get.find<AuthController>();
  final String _selectedCountryCode = '+1'; // Default country code

  @override
  void initState() {
    super.initState();
    _loadAccounts();
  }

  // Helper method to map payment method names to account codes
  String _getPaymentMethodCode(String paymentMethodName) {
    final name = paymentMethodName.toLowerCase();

    // Bank payment methods
    if (name.contains('standard chartered') ||
        name.contains('standard chartered bank ke')) {
      return '02';
    } else if (name.contains('absa') || name.contains('absa bank')) {
      return '03';
    } else if (name.contains('ncba')) {
      return '07';
    } else if (name.contains('prime') || name.contains('prime bank')) {
      return '10';
    } else if (name.contains('cooperative') ||
        name.contains('cooperative bank')) {
      return '11';
    } else if (name.contains('national') || name.contains('national bank')) {
      return '12';
    } else if (name.contains('m-oriental')) {
      return '14';
    }
    // Mobile payment methods
    else if (name.contains('mpesa') || name.contains('m-pesa')) {
      return '63902';
    } else if (name.contains('airtel') || name.contains('airtel money')) {
      return '63903';
    } else if (name.contains('t-kash') || name.contains('tkash')) {
      return '63907';
    } else if (name.contains('sasa') || name.contains('sasapay')) {
      return '00';
    }
    // Default fallback
    else {
      return '02'; // Default to Standard Chartered
    }
  }

  Future<void> _loadAccounts() async {
    setState(() => _isLoading = true);

    try {
      // Get current user ID from auth controller
      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        throw Exception('User not authenticated');
      }

      print('=== OwnerAccountsScreen: Loading accounts ===');
      print('User ID: ${currentUser.id}');
      print('User Type: ${currentUser.userType}');

      // Fetch accounts from API
      final accounts = await AccountService.getUserAccounts(currentUser.id);

      print('=== API Response ===');
      print('Raw accounts data: $accounts');
      print('Number of accounts: ${accounts.length}');

      if (accounts.isNotEmpty) {
        for (int i = 0; i < accounts.length; i++) {
          final account = accounts[i];
          print('Account $i:');
          print('  ID: ${account.id}');
          print('  Name: ${account.accountName}');
          print('  Type: ${account.accountType}');
          print('  Number: ${account.accountNumber}');
          print('  Bank: ${account.bankName}');
          print('  Active: ${account.isActive}');
          print('  Default: ${account.isDefault}');
          print('  Created: ${account.createdAt}');
          print('  Updated: ${account.updatedAt}');
        }
      }

      setState(() {
        _accounts = accounts;
      });

      print('=== State Updated ===');
      print('_accounts length: ${_accounts.length}');
    } catch (e) {
      print('=== Error Loading Accounts ===');
      print('Error: $e');
      print('Error type: ${e.runtimeType}');

      // Check if it's a specific date parsing error
      if (e.toString().contains('FormatException') ||
          e.toString().contains('Invalid date format')) {
        ToastUtils.showError(
          'Date format error in account data. Please contact support.',
        );
      } else {
        ToastUtils.showError('Failed to load accounts: ${e.toString()}');
      }

      // Fallback to empty list instead of mock data
      setState(() {
        _accounts = [];
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showAddAccountDialog() {
    String? selectedAccountType;
    PaymentMethod? selectedPaymentMethod;
    final TextEditingController accountNumberController =
        TextEditingController();
    bool isActive = true;
    bool isDefault = false;
    String? selectedCountryCode =
        _selectedCountryCode; // Local variable for dialog

    Get.dialog(
      StatefulBuilder(
        builder: (context, setState) {
          List<PaymentMethod> availableMethods = [];

          if (selectedAccountType == 'bank') {
            availableMethods = PaymentMethod.getBankMethods();
          } else if (selectedAccountType == 'mobile') {
            availableMethods = PaymentMethod.getMobileMethods();
          }

          // Helper function to update country code when payment method changes
          void updateCountryCodeForPaymentMethod(PaymentMethod method) {
            // Set appropriate default country code based on payment method
            if (method.name.toLowerCase().contains('ghana') ||
                method.name.toLowerCase().contains('momo')) {
              selectedCountryCode = '+233';
            } else if (method.name.toLowerCase().contains('nigeria') ||
                method.name.toLowerCase().contains('paga')) {
              selectedCountryCode = '+234';
            } else if (method.name.toLowerCase().contains('kenya') ||
                method.name.toLowerCase().contains('mpesa')) {
              selectedCountryCode = '+254';
            } else if (method.name.toLowerCase().contains('uganda') ||
                method.name.toLowerCase().contains('mtn')) {
              selectedCountryCode = '+256';
            } else {
              // Default to US/Canada
              selectedCountryCode = '+1';
            }
            setState(() {});
          }

          return AlertDialog(
            title: const Text('Add New Account'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Account Type Selection
                  const Text(
                    'Account Type',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              selectedAccountType = 'bank';
                              selectedPaymentMethod =
                                  null; // Reset when type changes
                              selectedCountryCode =
                                  _selectedCountryCode; // Reset country code
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: selectedAccountType == 'bank'
                                  ? AppColors.primary.withOpacity(0.1)
                                  : Colors.grey[100],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: selectedAccountType == 'bank'
                                    ? AppColors.primary
                                    : Colors.grey[300]!,
                                width: 2,
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.account_balance,
                                  color: selectedAccountType == 'bank'
                                      ? AppColors.primary
                                      : Colors.grey[600],
                                  size: 32,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Bank',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: selectedAccountType == 'bank'
                                        ? AppColors.primary
                                        : Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              selectedAccountType = 'mobile';
                              selectedPaymentMethod =
                                  null; // Reset when type changes
                              selectedCountryCode =
                                  _selectedCountryCode; // Reset country code
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: selectedAccountType == 'mobile'
                                  ? AppColors.primary.withOpacity(0.1)
                                  : Colors.grey[100],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: selectedAccountType == 'mobile'
                                    ? AppColors.primary
                                    : Colors.grey[300]!,
                                width: 2,
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.phone_android,
                                  color: selectedAccountType == 'mobile'
                                      ? AppColors.primary
                                      : Colors.grey[600],
                                  size: 32,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Mobile',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: selectedAccountType == 'mobile'
                                        ? AppColors.primary
                                        : Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Payment Method Dropdown
                  if (selectedAccountType != null) ...[
                    const Text(
                      'Payment Method',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey[300]!),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedPaymentMethod?.code,
                          hint: const Text('Select payment method'),
                          isExpanded: true,
                          items: availableMethods.map((method) {
                            return DropdownMenuItem<String>(
                              value: method.code,
                              child: Text(method.name),
                            );
                          }).toList(),
                          onChanged: (String? value) {
                            setState(() {
                              selectedPaymentMethod = availableMethods
                                  .firstWhere((method) => method.code == value);
                              // Update country code based on payment method
                              if (selectedAccountType == 'mobile') {
                                updateCountryCodeForPaymentMethod(
                                  selectedPaymentMethod!,
                                );
                              }
                            });
                          },
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),
                  ],

                  // Account Number/Phone Number
                  Text(
                    selectedAccountType == 'bank'
                        ? 'Account Number'
                        : 'Phone Number',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 8),

                  // Country code selector for mobile accounts
                  if (selectedAccountType == 'mobile') ...[
                    Row(
                      children: [
                        // Country code selector button
                        GestureDetector(
                          onTap: () {
                            showCountryPicker(
                              context: context,
                              showPhoneCode: true,
                              countryListTheme: CountryListThemeData(
                                flagSize: 25,
                                backgroundColor: Colors.white,
                                textStyle: const TextStyle(
                                  fontSize: 16,
                                  color: Colors.black,
                                ),
                                bottomSheetHeight: 500,
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(20.0),
                                  topRight: Radius.circular(20.0),
                                ),
                                inputDecoration: InputDecoration(
                                  labelText: 'Search',
                                  hintText: 'Start typing to search',
                                  prefixIcon: const Icon(Icons.search),
                                  border: OutlineInputBorder(
                                    borderSide: BorderSide(
                                      color: const Color(
                                        0xFF8C98A8,
                                      ).withOpacity(0.2),
                                    ),
                                  ),
                                ),
                              ),
                              onSelect: (Country country) {
                                setState(() {
                                  selectedCountryCode = '+${country.phoneCode}';
                                });
                              },
                            );
                          },
                          child: Container(
                            width: 120,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 16,
                            ),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey[300]!),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  selectedCountryCode ?? '+1',
                                  style: const TextStyle(fontSize: 16),
                                ),
                                const Icon(Icons.arrow_drop_down),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Phone number input
                        Expanded(
                          child: TextField(
                            controller: accountNumberController,
                            keyboardType: TextInputType.phone,
                            decoration: InputDecoration(
                              hintText: 'Enter phone number',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              prefixText: selectedCountryCode ?? '+1',
                              prefixStyle: TextStyle(
                                color: Colors.grey[600],
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            onChanged: (value) {
                              // Remove any country code prefix if user types it
                              if (value.startsWith('+')) {
                                // Find the first space or end of string
                                int spaceIndex = value.indexOf(' ');
                                if (spaceIndex != -1) {
                                  accountNumberController.text = value
                                      .substring(spaceIndex + 1);
                                  accountNumberController
                                      .selection = TextSelection.fromPosition(
                                    TextPosition(
                                      offset:
                                          accountNumberController.text.length,
                                    ),
                                  );
                                } else {
                                  // Try to detect country code length
                                  String newCountryCode = '+1';
                                  if (value.startsWith('+1') &&
                                      value.length > 2) {
                                    newCountryCode = '+1';
                                    accountNumberController.text = value
                                        .substring(2);
                                  } else if (value.startsWith('+44') &&
                                      value.length > 3) {
                                    newCountryCode = '+44';
                                    accountNumberController.text = value
                                        .substring(3);
                                  } else if (value.startsWith('+91') &&
                                      value.length > 3) {
                                    newCountryCode = '+91';
                                    accountNumberController.text = value
                                        .substring(3);
                                  } else if (value.startsWith('+86') &&
                                      value.length > 3) {
                                    newCountryCode = '+86';
                                    accountNumberController.text = value
                                        .substring(3);
                                  } else if (value.startsWith('+233') &&
                                      value.length > 4) {
                                    newCountryCode = '+233';
                                    accountNumberController.text = value
                                        .substring(4);
                                  } else if (value.startsWith('+234') &&
                                      value.length > 4) {
                                    newCountryCode = '+234';
                                    accountNumberController.text = value
                                        .substring(4);
                                  } else if (value.startsWith('+254') &&
                                      value.length > 4) {
                                    newCountryCode = '+254';
                                    accountNumberController.text = value
                                        .substring(4);
                                  } else if (value.startsWith('+256') &&
                                      value.length > 4) {
                                    newCountryCode = '+256';
                                    accountNumberController.text = value
                                        .substring(4);
                                  }
                                  selectedCountryCode = newCountryCode;
                                  setState(() {});
                                  accountNumberController
                                      .selection = TextSelection.fromPosition(
                                    TextPosition(
                                      offset:
                                          accountNumberController.text.length,
                                    ),
                                  );
                                }
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ] else ...[
                    // Bank account number input
                    TextField(
                      controller: accountNumberController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: 'Enter account number',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // Active Checkbox
                  Row(
                    children: [
                      Checkbox(
                        value: isActive,
                        onChanged: (value) {
                          setState(() {
                            isActive = value ?? true;
                          });
                        },
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Active',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'This account can receive payments',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Default Checkbox
                  Row(
                    children: [
                      Checkbox(
                        value: isDefault,
                        onChanged: (value) {
                          setState(() {
                            isDefault = value ?? false;
                          });
                        },
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Set as Default',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'This account will be used as the primary payment destination',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Get.back(),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed:
                    selectedAccountType != null &&
                        selectedPaymentMethod != null &&
                        accountNumberController.text.isNotEmpty
                    ? () async {
                        // Show loading
                        Get.back();

                        try {
                          // Get current user ID from auth controller
                          final currentUser = _authController.currentUser;
                          if (currentUser == null) {
                            ToastUtils.showError('User not authenticated');
                            return;
                          }

                          // Create account request
                          final request = CreateAccountRequest(
                            accountName: selectedPaymentMethod!.name,
                            accountType: selectedAccountType!,
                            accountNumber: selectedAccountType == 'mobile'
                                ? '${selectedCountryCode ?? '+1'}${accountNumberController.text}'
                                : accountNumberController.text,
                            bankName: selectedPaymentMethod!.name,
                            accountCode: _getPaymentMethodCode(
                              selectedPaymentMethod!.name,
                            ),
                            userId: currentUser.id,
                          );

                          // Call API to create account
                          final result = await AccountService.createAccount(
                            request,
                          );

                          if (result['success'] == true) {
                            // Reload accounts from API
                            await _loadAccounts();
                            ToastUtils.showSuccess(
                              result['message'] ?? 'Account added successfully',
                            );
                          } else {
                            ToastUtils.showError(
                              result['message'] ?? 'Failed to create account',
                            );
                          }
                        } catch (e) {
                          ToastUtils.showError(
                            'Failed to create account: ${e.toString()}',
                          );
                        }
                      }
                    : null,
                child: const Text('Add Account'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showEditAccountDialog(AccountModel account) {
    String? selectedAccountType = account.accountType;
    PaymentMethod? selectedPaymentMethod;
    final TextEditingController accountNumberController =
        TextEditingController();
    bool isActive = account.isActive;
    bool isDefault = account.isDefault;
    String? selectedCountryCode = '+1'; // Default country code

    // Helper function to update country code when payment method changes
    void updateCountryCodeForPaymentMethod(PaymentMethod method) {
      // Set appropriate default country code based on payment method
      if (method.name.toLowerCase().contains('ghana') ||
          method.name.toLowerCase().contains('momo')) {
        selectedCountryCode = '+233';
      } else if (method.name.toLowerCase().contains('nigeria') ||
          method.name.toLowerCase().contains('paga')) {
        selectedCountryCode = '+234';
      } else if (method.name.toLowerCase().contains('kenya') ||
          method.name.toLowerCase().contains('mpesa')) {
        selectedCountryCode = '+254';
      } else if (method.name.toLowerCase().contains('uganda') ||
          method.name.toLowerCase().contains('mtn')) {
        selectedCountryCode = '+256';
      } else {
        // Default to US/Canada
        selectedCountryCode = '+1';
      }
    }

    // Find the current payment method
    if (account.bankName != null) {
      selectedPaymentMethod = PaymentMethod.allPaymentMethods.firstWhere(
        (method) => method.name == account.bankName,
        orElse: () => PaymentMethod.allPaymentMethods.first,
      );
    }

    // Set default country code based on payment method if it's a mobile method
    if (selectedPaymentMethod != null &&
        PaymentMethod.getMobileMethods().contains(selectedPaymentMethod)) {
      updateCountryCodeForPaymentMethod(selectedPaymentMethod);
    }

    // Extract country code and phone number for mobile accounts
    if (account.accountType == 'mobile' &&
        account.accountNumber.startsWith('+')) {
      // Improved country code extraction logic
      String countryCode = '+1'; // Default fallback
      String phoneNumber = '';

      // First, try to find a space separator
      int spaceIndex = account.accountNumber.indexOf(' ');
      if (spaceIndex != -1) {
        // If there's a space, extract country code and phone number
        countryCode = account.accountNumber.substring(0, spaceIndex);
        phoneNumber = account.accountNumber.substring(spaceIndex + 1);
      } else {
        // If no space, use pattern matching for common country codes
        if (account.accountNumber.startsWith('+1') &&
            account.accountNumber.length > 2) {
          // US/Canada: +1XXXXXXXXXX
          countryCode = '+1';
          phoneNumber = account.accountNumber.substring(2);
        } else if (account.accountNumber.startsWith('+44') &&
            account.accountNumber.length > 3) {
          // UK: +44XXXXXXXXXX
          countryCode = '+44';
          phoneNumber = account.accountNumber.substring(3);
        } else if (account.accountNumber.startsWith('+91') &&
            account.accountNumber.length > 3) {
          // India: +91XXXXXXXXXX
          countryCode = '+91';
          phoneNumber = account.accountNumber.substring(3);
        } else if (account.accountNumber.startsWith('+86') &&
            account.accountNumber.length > 3) {
          // China: +86XXXXXXXXXX
          countryCode = '+86';
          phoneNumber = account.accountNumber.substring(3);
        } else if (account.accountNumber.startsWith('+233') &&
            account.accountNumber.length > 4) {
          // Ghana: +233XXXXXXXXX
          countryCode = '+233';
          phoneNumber = account.accountNumber.substring(4);
        } else if (account.accountNumber.startsWith('+234') &&
            account.accountNumber.length > 4) {
          // Nigeria: +234XXXXXXXXX
          countryCode = '+234';
          phoneNumber = account.accountNumber.substring(4);
        } else if (account.accountNumber.startsWith('+254') &&
            account.accountNumber.length > 4) {
          // Kenya: +254XXXXXXXXX
          countryCode = '+254';
          phoneNumber = account.accountNumber.substring(4);
        } else if (account.accountNumber.startsWith('+256') &&
            account.accountNumber.length > 4) {
          // Uganda: +256XXXXXXXXX
          countryCode = '+256';
          phoneNumber = account.accountNumber.substring(4);
        } else {
          // For other country codes, try to find the first digit after +
          int firstDigitIndex = -1;
          for (int i = 1; i < account.accountNumber.length; i++) {
            if (RegExp(r'[0-9]').hasMatch(account.accountNumber[i])) {
              firstDigitIndex = i;
              break;
            }
          }

          if (firstDigitIndex != -1) {
            countryCode = account.accountNumber.substring(0, firstDigitIndex);
            phoneNumber = account.accountNumber.substring(firstDigitIndex);
          } else {
            // Fallback: assume it's all country code
            countryCode = account.accountNumber;
            phoneNumber = '';
          }
        }
      }

      selectedCountryCode = countryCode;
      accountNumberController.text = phoneNumber;
    } else {
      // For bank accounts or non-mobile accounts
      accountNumberController.text = account.accountNumber;
    }

    Get.dialog(
      StatefulBuilder(
        builder: (context, setState) {
          List<PaymentMethod> availableMethods = [];

          if (selectedAccountType == 'bank') {
            availableMethods = PaymentMethod.getBankMethods();
          } else if (selectedAccountType == 'mobile') {
            availableMethods = PaymentMethod.getMobileMethods();
          }

          // Helper function to update country code when payment method changes
          void updateCountryCodeForPaymentMethod(PaymentMethod method) {
            // Set appropriate default country code based on payment method
            if (method.name.toLowerCase().contains('ghana') ||
                method.name.toLowerCase().contains('momo')) {
              selectedCountryCode = '+233';
            } else if (method.name.toLowerCase().contains('nigeria') ||
                method.name.toLowerCase().contains('paga')) {
              selectedCountryCode = '+234';
            } else if (method.name.toLowerCase().contains('kenya') ||
                method.name.toLowerCase().contains('mpesa')) {
              selectedCountryCode = '+254';
            } else if (method.name.toLowerCase().contains('uganda') ||
                method.name.toLowerCase().contains('mtn')) {
              selectedCountryCode = '+256';
            } else {
              // Default to US/Canada
              selectedCountryCode = '+1';
            }
            setState(() {});
          }

          return AlertDialog(
            title: const Text('Edit Account'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Account Type Selection
                  const Text(
                    'Account Type',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              selectedAccountType = 'bank';
                              selectedPaymentMethod =
                                  null; // Reset when type changes
                              selectedCountryCode = '+1'; // Reset country code
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: selectedAccountType == 'bank'
                                  ? AppColors.primary.withOpacity(0.1)
                                  : Colors.grey[100],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: selectedAccountType == 'bank'
                                    ? AppColors.primary
                                    : Colors.grey[300]!,
                                width: 2,
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.account_balance,
                                  color: selectedAccountType == 'bank'
                                      ? AppColors.primary
                                      : Colors.grey[600],
                                  size: 24,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Bank',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: selectedAccountType == 'bank'
                                        ? AppColors.primary
                                        : Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              selectedAccountType = 'mobile';
                              selectedPaymentMethod =
                                  null; // Reset when type changes
                              selectedCountryCode = '+1'; // Reset country code
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: selectedAccountType == 'mobile'
                                  ? AppColors.primary.withOpacity(0.1)
                                  : Colors.grey[100],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: selectedAccountType == 'mobile'
                                    ? AppColors.primary
                                    : Colors.grey[300]!,
                                width: 2,
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.phone_android,
                                  color: selectedAccountType == 'mobile'
                                      ? AppColors.primary
                                      : Colors.grey[600],
                                  size: 24,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Mobile',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: selectedAccountType == 'mobile'
                                        ? AppColors.primary
                                        : Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Payment Method Dropdown
                  if (selectedAccountType != null) ...[
                    const Text(
                      'Payment Method',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey[300]!),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedPaymentMethod?.code,
                          hint: const Text('Select payment method'),
                          isExpanded: true,
                          items: availableMethods.map((method) {
                            return DropdownMenuItem<String>(
                              value: method.code,
                              child: Text(method.name),
                            );
                          }).toList(),
                          onChanged: (String? value) {
                            setState(() {
                              selectedPaymentMethod = availableMethods
                                  .firstWhere((method) => method.code == value);
                              // Update country code based on payment method
                              if (selectedAccountType == 'mobile') {
                                updateCountryCodeForPaymentMethod(
                                  selectedPaymentMethod!,
                                );
                              }
                            });
                          },
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),
                  ],

                  // Account Number/Phone Number
                  Text(
                    selectedAccountType == 'bank'
                        ? 'Account Number'
                        : 'Phone Number',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 8),

                  // Country code selector for mobile accounts
                  if (selectedAccountType == 'mobile') ...[
                    Row(
                      children: [
                        // Country code selector button
                        GestureDetector(
                          onTap: () {
                            showCountryPicker(
                              context: context,
                              showPhoneCode: true,
                              countryListTheme: CountryListThemeData(
                                flagSize: 25,
                                backgroundColor: Colors.white,
                                textStyle: const TextStyle(
                                  fontSize: 16,
                                  color: Colors.black,
                                ),
                                bottomSheetHeight: 500,
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(20.0),
                                  topRight: Radius.circular(20.0),
                                ),
                                inputDecoration: InputDecoration(
                                  labelText: 'Search',
                                  hintText: 'Start typing to search',
                                  prefixIcon: const Icon(Icons.search),
                                  border: OutlineInputBorder(
                                    borderSide: BorderSide(
                                      color: const Color(
                                        0xFF8C98A8,
                                      ).withOpacity(0.2),
                                    ),
                                  ),
                                ),
                              ),
                              onSelect: (Country country) {
                                setState(() {
                                  selectedCountryCode = '+${country.phoneCode}';
                                });
                              },
                            );
                          },
                          child: Container(
                            width: 120,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 16,
                            ),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey[300]!),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  selectedCountryCode ?? '+1',
                                  style: const TextStyle(fontSize: 16),
                                ),
                                const Icon(Icons.arrow_drop_down),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Phone number input
                        Expanded(
                          child: TextField(
                            controller: accountNumberController,
                            keyboardType: TextInputType.phone,
                            decoration: InputDecoration(
                              hintText: 'Enter phone number',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              prefixText: selectedCountryCode ?? '+1',
                              prefixStyle: TextStyle(
                                color: Colors.grey[600],
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            onChanged: (value) {
                              // Remove any country code prefix if user types it
                              if (value.startsWith('+')) {
                                // Find the first space or end of string
                                int spaceIndex = value.indexOf(' ');
                                if (spaceIndex != -1) {
                                  accountNumberController.text = value
                                      .substring(spaceIndex + 1);
                                  accountNumberController
                                      .selection = TextSelection.fromPosition(
                                    TextPosition(
                                      offset:
                                          accountNumberController.text.length,
                                    ),
                                  );
                                } else {
                                  // Try to detect country code length
                                  String newCountryCode = '+1';
                                  if (value.startsWith('+1') &&
                                      value.length > 2) {
                                    newCountryCode = '+1';
                                    accountNumberController.text = value
                                        .substring(2);
                                  } else if (value.startsWith('+44') &&
                                      value.length > 3) {
                                    newCountryCode = '+44';
                                    accountNumberController.text = value
                                        .substring(3);
                                  } else if (value.startsWith('+91') &&
                                      value.length > 3) {
                                    newCountryCode = '+91';
                                    accountNumberController.text = value
                                        .substring(3);
                                  } else if (value.startsWith('+86') &&
                                      value.length > 3) {
                                    newCountryCode = '+86';
                                    accountNumberController.text = value
                                        .substring(3);
                                  } else if (value.startsWith('+233') &&
                                      value.length > 4) {
                                    newCountryCode = '+233';
                                    accountNumberController.text = value
                                        .substring(4);
                                  } else if (value.startsWith('+234') &&
                                      value.length > 4) {
                                    newCountryCode = '+234';
                                    accountNumberController.text = value
                                        .substring(4);
                                  } else if (value.startsWith('+254') &&
                                      value.length > 4) {
                                    newCountryCode = '+254';
                                    accountNumberController.text = value
                                        .substring(4);
                                  } else if (value.startsWith('+256') &&
                                      value.length > 4) {
                                    newCountryCode = '+256';
                                    accountNumberController.text = value
                                        .substring(4);
                                  }
                                  selectedCountryCode = newCountryCode;
                                  setState(() {});
                                  accountNumberController
                                      .selection = TextSelection.fromPosition(
                                    TextPosition(
                                      offset:
                                          accountNumberController.text.length,
                                    ),
                                  );
                                }
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ] else ...[
                    // Bank account number input
                    TextField(
                      controller: accountNumberController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: 'Enter account number',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // Active Checkbox
                  Row(
                    children: [
                      Checkbox(
                        value: isActive,
                        onChanged: (value) {
                          setState(() {
                            isActive = value ?? true;
                          });
                        },
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Active',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'This account can receive payments',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Default Checkbox
                  Row(
                    children: [
                      Checkbox(
                        value: isDefault,
                        onChanged: (value) {
                          setState(() {
                            isDefault = value ?? false;
                          });
                        },
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Set as Default',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'This account will be used as the primary payment destination',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Get.back(),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed:
                    selectedAccountType != null &&
                        selectedPaymentMethod != null &&
                        accountNumberController.text.isNotEmpty
                    ? () async {
                        // Show loading
                        Get.back();

                        try {
                          // Get current user ID from auth controller
                          final currentUser = _authController.currentUser;
                          if (currentUser == null) {
                            ToastUtils.showError('User not authenticated');
                            return;
                          }

                          // Update account request
                          final request = UpdateAccountRequest(
                            accountName: selectedPaymentMethod!.name,
                            accountType: selectedAccountType!,
                            accountNumber: selectedAccountType == 'mobile'
                                ? '${selectedCountryCode ?? '+1'}${accountNumberController.text}'
                                : accountNumberController.text,
                            bankName: selectedPaymentMethod!.name,
                            accountCode: _getPaymentMethodCode(
                              selectedPaymentMethod!.name,
                            ),
                            userId: currentUser.id,
                          );

                          // Call API to update account
                          final result = await AccountService.updateAccount(
                            account.id,
                            request,
                          );

                          if (result['success'] == true) {
                            // Reload accounts from API
                            await _loadAccounts();
                            ToastUtils.showSuccess(
                              result['message'] ??
                                  'Account updated successfully',
                            );
                          } else {
                            ToastUtils.showError(
                              result['message'] ?? 'Failed to update account',
                            );
                          }
                        } catch (e) {
                          ToastUtils.showError(
                            'Failed to update account: ${e.toString()}',
                          );
                        }
                      }
                    : null,
                child: const Text('Update Account'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showDeleteAccountDialog(AccountModel account) {
    Get.dialog(
      AlertDialog(
        title: const Text('Delete Account'),
        content: Text(
          'Are you sure you want to delete ${account.accountName}?',
        ),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Get.back();
              _deleteAccount(account.id);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteAccount(String accountId) async {
    setState(() => _isOperationLoading = true);

    try {
      // Get current user ID from auth controller
      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        ToastUtils.showError('User not authenticated');
        return;
      }

      // Delete account via API
      final result = await AccountService.deleteAccount(
        accountId,
        currentUser.id,
      );

      if (result['success'] == true) {
        // Remove from local list
        setState(() {
          _accounts.removeWhere((account) => account.id == accountId);
        });
        ToastUtils.showSuccess(
          result['message'] ?? 'Account deleted successfully',
        );
      } else {
        ToastUtils.showError(result['message'] ?? 'Failed to delete account');
      }
    } catch (e) {
      ToastUtils.showError('Failed to delete account: ${e.toString()}');
    } finally {
      setState(() => _isOperationLoading = false);
    }
  }

  Future<void> _setDefaultAccount(AccountModel account) async {
    setState(() => _isOperationLoading = true);

    try {
      // Get current user ID from auth controller
      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        ToastUtils.showError('User not authenticated');
        return;
      }

      // Set account as default via API
      final result = await AccountService.setDefaultAccount(
        account.id,
        currentUser.id,
      );

      if (result['success'] == true) {
        // Reload accounts from API to get updated default status
        await _loadAccounts();
        ToastUtils.showSuccess(
          result['message'] ?? 'Default account updated successfully',
        );
      } else {
        ToastUtils.showError(
          result['message'] ?? 'Failed to update default account',
        );
      }
    } catch (e) {
      ToastUtils.showError('Failed to update default account: ${e.toString()}');
    } finally {
      setState(() => _isOperationLoading = false);
    }
  }

  Future<void> _toggleAccountStatus(AccountModel account) async {
    setState(() => _isOperationLoading = true);

    try {
      // Get current user ID from auth controller
      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        ToastUtils.showError('User not authenticated');
        return;
      }

      // Toggle account status via API
      final result = await AccountService.toggleAccountStatus(
        account.id,
        currentUser.id,
        !account.isActive, // Toggle the current status
      );

      if (result['success'] == true) {
        // Reload accounts from API to get updated status
        await _loadAccounts();
        ToastUtils.showSuccess(
          result['message'] ?? 'Account status updated successfully',
        );
      } else {
        ToastUtils.showError(
          result['message'] ?? 'Failed to update account status',
        );
      }
    } catch (e) {
      ToastUtils.showError('Failed to update account status: ${e.toString()}');
    } finally {
      setState(() => _isOperationLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Accounts'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Get.back(),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadAccounts),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                _buildBody(),
                if (_isOperationLoading)
                  Container(
                    color: Colors.black.withOpacity(0.3),
                    child: const Center(child: CircularProgressIndicator()),
                  ),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddAccountDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildBody() {
    if (_accounts.isEmpty) {
      return _buildEmptyState();
    }

    return RefreshIndicator(
      onRefresh: _loadAccounts,
      child: ListView.builder(
        padding: const EdgeInsets.all(12), // Reduced from 16
        itemCount: _accounts.length,
        itemBuilder: (context, index) {
          final account = _accounts[index];
          return _buildAccountCard(account);
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Simple icon
            Icon(
              Icons.account_balance_wallet,
              size: 60,
              color: AppColors.primary.withOpacity(0.6),
            ),
            const SizedBox(height: 16),

            // Title
            Text(
              'No accounts yet',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),

            // Description
            Text(
              'Add your first payment account',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),

            // Simple button
            ElevatedButton(
              onPressed: _showAddAccountDialog,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Add Account',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountCard(AccountModel account) {
    final isBank = account.accountType == 'bank';
    final isActive = account.isActive;
    final isDefault = account.isDefault;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isBank
              ? AppColors.primary.withOpacity(0.2)
              : AppColors.secondary.withOpacity(0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row with icon, name, and actions
            Row(
              children: [
                // Simple icon
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: isBank
                        ? AppColors.primary.withOpacity(0.1)
                        : AppColors.secondary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    isBank ? Icons.account_balance : Icons.phone_android,
                    color: isBank ? AppColors.primary : AppColors.secondary,
                    size: 20,
                  ),
                ),

                const SizedBox(width: 12),

                // Account info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        account.accountName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isBank ? 'Bank Account' : 'Mobile Money',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),

                // Action menu
                PopupMenuButton<String>(
                  onSelected: (value) {
                    switch (value) {
                      case 'edit':
                        _showEditAccountDialog(account);
                        break;
                      case 'set_default':
                        _setDefaultAccount(account);
                        break;
                      case 'toggle_status':
                        _toggleAccountStatus(account);
                        break;
                      case 'delete':
                        _showDeleteAccountDialog(account);
                        break;
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          Icon(Icons.edit, size: 18),
                          SizedBox(width: 8),
                          Text('Edit'),
                        ],
                      ),
                    ),
                    if (isActive)
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete, size: 18, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Delete', style: TextStyle(color: Colors.red)),
                          ],
                        ),
                      ),
                  ],
                  child: Icon(
                    Icons.more_vert,
                    size: 20,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Account details
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  _buildEnhancedDetailRow(
                    'Account Number',
                    account.accountNumber,
                  ),
                  if (account.bankName != null) ...[
                    const SizedBox(height: 8),
                    _buildEnhancedDetailRow('Provider', account.bankName!),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Status and actions row
            Row(
              children: [
                // Status indicator
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: isActive ? AppColors.success : AppColors.error,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    isActive ? 'Active' : 'Inactive',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),

                if (isDefault) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.warning,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Default',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],

                const Spacer(),

                // Quick actions
                if (isActive)
                  IconButton(
                    onPressed: () => _showEditAccountDialog(account),
                    icon: Icon(Icons.edit, size: 16, color: AppColors.primary),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 32,
                      minHeight: 32,
                    ),
                  ),

                if (!isDefault)
                  IconButton(
                    onPressed: () => _setDefaultAccount(account),
                    icon: Icon(
                      Icons.star_outline,
                      size: 16,
                      color: AppColors.warning,
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 32,
                      minHeight: 32,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSimpleDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Label
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Value
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEnhancedDetailRow(String label, String value) {
    // Special handling for mobile account numbers to display country code and phone separately
    if (label == 'Account Number' && value.startsWith('+')) {
      // Use the same improved logic as in edit dialog
      String countryCode = '+1'; // Default fallback
      String phoneNumber = '';

      // First, try to find a space separator
      int spaceIndex = value.indexOf(' ');
      if (spaceIndex != -1) {
        // If there's a space, split by space
        countryCode = value.substring(0, spaceIndex);
        phoneNumber = value.substring(spaceIndex + 1);
      } else {
        // If no space, use pattern matching for common country codes
        if (value.startsWith('+1') && value.length > 2) {
          // US/Canada: +1XXXXXXXXXX
          countryCode = '+1';
          phoneNumber = value.substring(2);
        } else if (value.startsWith('+44') && value.length > 3) {
          // UK: +44XXXXXXXXXX
          countryCode = '+44';
          phoneNumber = value.substring(3);
        } else if (value.startsWith('+91') && value.length > 3) {
          // India: +91XXXXXXXXXX
          countryCode = '+91';
          phoneNumber = value.substring(3);
        } else if (value.startsWith('+86') && value.length > 3) {
          // China: +86XXXXXXXXXX
          countryCode = '+86';
          phoneNumber = value.substring(3);
        } else if (value.startsWith('+233') && value.length > 4) {
          // Ghana: +233XXXXXXXXX
          countryCode = '+233';
          phoneNumber = value.substring(4);
        } else if (value.startsWith('+234') && value.length > 4) {
          // Nigeria: +234XXXXXXXXX
          countryCode = '+234';
          phoneNumber = value.substring(4);
        } else if (value.startsWith('+254') && value.length > 4) {
          // Kenya: +254XXXXXXXXX
          countryCode = '+254';
          phoneNumber = value.substring(4);
        } else if (value.startsWith('+256') && value.length > 4) {
          // Uganda: +256XXXXXXXXX
          countryCode = '+256';
          phoneNumber = value.substring(4);
        } else {
          // For other country codes, try to find the first digit after +
          int firstDigitIndex = -1;
          for (int i = 1; i < value.length; i++) {
            if (RegExp(r'[0-9]').hasMatch(value[i])) {
              firstDigitIndex = i;
              break;
            }
          }

          if (firstDigitIndex != -1) {
            countryCode = value.substring(0, firstDigitIndex);
            phoneNumber = value.substring(firstDigitIndex);
          } else {
            // Fallback: display as is
            return _buildSimpleDetailRow(label, value);
          }
        }
      }

      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Label with icon
            SizedBox(
              width: 100,
              child: Row(
                children: [
                  Icon(
                    label == 'Account Number'
                        ? Icons.account_circle
                        : Icons.business,
                    size: 16,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Value with enhanced styling
            Expanded(
              child: Row(
                children: [
                  // Country code badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppColors.primary.withOpacity(0.2),
                      ),
                    ),
                    child: Text(
                      countryCode,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Phone number
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey[300]!),
                      ),
                      child: Text(
                        phoneNumber,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // Default display for other fields - enhanced layout
    return _buildSimpleDetailRow(label, value);
  }
}
