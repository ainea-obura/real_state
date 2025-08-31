import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/controllers/auth_controller.dart';
import '../../../core/utils/toast_utils.dart';
import '../../../core/models/user_model.dart';
import '../../../core/services/owner_service.dart';
import '../../../core/services/tenant_service.dart';
import '../../../core/services/storage_service.dart';

class OwnerUpdateInfoScreen extends StatefulWidget {
  const OwnerUpdateInfoScreen({super.key});

  @override
  State<OwnerUpdateInfoScreen> createState() => _OwnerUpdateInfoScreenState();
}

class _OwnerUpdateInfoScreenState extends State<OwnerUpdateInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _positionController = TextEditingController();

  late AuthController _authController;
  OwnerService? _ownerService;
  TenantService? _tenantService;

  final bool _isLoading = false;
  bool _isSaving = false;
  UserModel? _currentUser;

  @override
  void initState() {
    super.initState();
    _authController = Get.find<AuthController>();
    _initializeServices();
    _refreshAndLoadUserData();
  }

  // Refresh user data from storage and then load it
  Future<void> _refreshAndLoadUserData() async {
    print('OwnerUpdateInfoScreen: Refreshing user data from storage...');

    // Try to get fresh user data from storage
    try {
      final storageService = Get.find<StorageService>();
      final freshUserData = await storageService.getUserData();

      if (freshUserData != null) {
        print(
          'OwnerUpdateInfoScreen: Fresh user data from storage: ${freshUserData.toJson()}',
        );
        // Update the auth controller with fresh data
        _authController.updateUser(freshUserData);
      } else {
        print(
          'OwnerUpdateInfoScreen: No fresh user data in storage, using current user',
        );
      }
    } catch (e) {
      print(
        'OwnerUpdateInfoScreen: Error refreshing user data from storage: $e',
      );
    }

    // Load the user data into the form
    _loadCurrentUserData();
  }

  void _initializeServices() {
    try {
      // Initialize both services since we don't know the user type yet
      _ownerService = Get.find<OwnerService>();
      print('OwnerUpdateInfoScreen: OwnerService found successfully');
    } catch (e) {
      print('OwnerUpdateInfoScreen: Failed to find OwnerService: $e');
    }

    try {
      _tenantService = Get.find<TenantService>();
      print('OwnerUpdateInfoScreen: TenantService found successfully');
    } catch (e) {
      print('OwnerUpdateInfoScreen: Failed to find TenantService: $e');
    }

    // Try to find services again in post frame callback if needed
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_ownerService == null) {
        try {
          _ownerService = Get.find<OwnerService>();
          print(
            'OwnerUpdateInfoScreen: OwnerService found in post frame callback',
          );
        } catch (e) {
          print(
            'OwnerUpdateInfoScreen: Failed to find OwnerService in post frame callback: $e',
          );
        }
      }

      if (_tenantService == null) {
        try {
          _tenantService = Get.find<TenantService>();
          print(
            'OwnerUpdateInfoScreen: TenantService found in post frame callback',
          );
        } catch (e) {
          print(
            'OwnerUpdateInfoScreen: Failed to find TenantService in post frame callback: $e',
          );
        }
      }
    });
  }

  void _loadCurrentUserData() {
    _currentUser = _authController.currentUser;
    if (_currentUser != null) {
      print(
        'OwnerUpdateInfoScreen: Loading user data for: ${_currentUser!.type}',
      );
      print('OwnerUpdateInfoScreen: User data: ${_currentUser!.toJson()}');

      // Always populate firstName - prioritize firstName field, then extract from fullName if needed
      if (_currentUser!.firstName != null &&
          _currentUser!.firstName!.isNotEmpty) {
        _firstNameController.text = _currentUser!.firstName!;
        print(
          'OwnerUpdateInfoScreen: Set firstName from firstName field: ${_currentUser!.firstName}',
        );
      } else {
        // Try to extract firstName from fullName if firstName field is empty
        final fullName = _currentUser!.fullName ?? '';
        if (fullName.isNotEmpty) {
          final nameParts = fullName.trim().split(' ');
          print(
            'OwnerUpdateInfoScreen: Extracting firstName from fullName: $fullName -> $nameParts',
          );

          if (nameParts.isNotEmpty) {
            _firstNameController.text = nameParts.first;
            print(
              'OwnerUpdateInfoScreen: Set firstName from fullName: ${nameParts.first}',
            );
          }
        } else {
          _firstNameController.text = '';
          print(
            'OwnerUpdateInfoScreen: firstName field is empty and no fullName available',
          );
        }
      }

      // Always populate lastName - prioritize lastName field, then extract from fullName if needed
      if (_currentUser!.lastName != null &&
          _currentUser!.lastName!.isNotEmpty) {
        _lastNameController.text = _currentUser!.lastName!;
        print(
          'OwnerUpdateInfoScreen: Set lastName from lastName field: ${_currentUser!.lastName}',
        );
      } else {
        // Try to extract lastName from fullName if lastName field is empty
        final fullName = _currentUser!.fullName ?? '';
        if (fullName.isNotEmpty) {
          final nameParts = fullName.trim().split(' ');
          print(
            'OwnerUpdateInfoScreen: Extracting lastName from fullName: $fullName -> $nameParts',
          );

          if (nameParts.length >= 2) {
            _lastNameController.text = nameParts.sublist(1).join(' ');
            print(
              'OwnerUpdateInfoScreen: Set lastName from fullName: ${nameParts.sublist(1).join(' ')}',
            );
          } else {
            _lastNameController.text = '';
            print(
              'OwnerUpdateInfoScreen: lastName field is empty and fullName has only one part',
            );
          }
        } else {
          _lastNameController.text = '';
          print(
            'OwnerUpdateInfoScreen: lastName field is empty and no fullName available',
          );
        }
      }

      // Always populate email (like we did before)
      _emailController.text = _currentUser!.email ?? '';
      print('OwnerUpdateInfoScreen: Set email: ${_currentUser!.email}');

      // Always populate phone
      _phoneController.text = _currentUser!.phone ?? '';
      print('OwnerUpdateInfoScreen: Set phone: ${_currentUser!.phone}');

      // Always populate company fields (they will be hidden for tenants in the UI)
      _companyNameController.text = _currentUser!.companyName ?? '';
      _positionController.text = _currentUser!.position ?? '';
      print(
        'OwnerUpdateInfoScreen: Set companyName: ${_currentUser!.companyName}',
      );
      print('OwnerUpdateInfoScreen: Set position: ${_currentUser!.position}');

      print(
        'OwnerUpdateInfoScreen: All fields populated. Current controller values:',
      );
      print('  firstName: "${_firstNameController.text}"');
      print('  lastName: "${_lastNameController.text}"');
      print('  email: "${_emailController.text}"');
      print('  phone: "${_phoneController.text}"');
      print('  companyName: "${_companyNameController.text}"');
      print('  position: "${_positionController.text}"');
    } else {
      print('OwnerUpdateInfoScreen: No current user found');
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _companyNameController.dispose();
    _positionController.dispose();
    super.dispose();
  }

  Future<void> _saveChanges() async {
    // Custom validation based on user type
    if (_currentUser != null && _currentUser!.type == 'owner') {
      // For owners, validate all fields including company fields
      if (!_formKey.currentState!.validate()) return;
    } else {
      // For tenants, only validate personal fields
      if (_firstNameController.text.trim().isEmpty) {
        ToastUtils.showError('First name is required');
        return;
      }
      if (_lastNameController.text.trim().isEmpty) {
        ToastUtils.showError('Last name is required');
        return;
      }
      if (_emailController.text.trim().isEmpty) {
        ToastUtils.showError('Email is required');
        return;
      }
      if (!GetUtils.isEmail(_emailController.text.trim())) {
        ToastUtils.showError('Please enter a valid email');
        return;
      }
    }

    setState(() => _isSaving = true);

    try {
      // Determine which service to use based on user type
      if (_authController.currentUser == null) {
        throw Exception('User not authenticated');
      }

      final userType = _authController.currentUser!.type;
      print('OwnerUpdateInfoScreen: User type: $userType');

      if (userType == 'tenant') {
        // Use tenant service for tenant users
        if (_tenantService == null) {
          try {
            _tenantService = Get.find<TenantService>();
            print('OwnerUpdateInfoScreen: TenantService found in _saveChanges');
          } catch (e) {
            print(
              'OwnerUpdateInfoScreen: Failed to find TenantService in _saveChanges: $e',
            );
            throw Exception('Tenant service not available');
          }
        }

        print('OwnerUpdateInfoScreen: Using TenantService for tenant user');
        print(
          'OwnerUpdateInfoScreen: Current user ID: ${_authController.currentUser!.id}',
        );

        // Prepare update data for tenant (exclude company-specific fields)
        final updateData = {
          'first_name': _firstNameController.text.trim(),
          'last_name': _lastNameController.text.trim(),
          'email': _emailController.text.trim(),
          'phone': _phoneController.text.trim(),
        };

        print('OwnerUpdateInfoScreen: Tenant update data: $updateData');

        // Call tenant service to update profile
        final result = await _tenantService!.updateTenant(
          _authController.currentUser!.id,
          updateData,
        );

        print('OwnerUpdateInfoScreen: Tenant update result: $result');

        if (result['success'] == true) {
          // Update local user data for tenant
          final updatedUser = UserModel(
            id: _authController.currentUser!.id,
            username: _authController.currentUser!.username,
            firstName: _firstNameController.text.trim(),
            lastName: _lastNameController.text.trim(),
            email: _emailController.text.trim(),
            phone: _phoneController.text.trim(),
            companyName: _authController.currentUser!.companyName,
            position: _authController.currentUser!.position,
            type: _authController.currentUser!.type,
            forcePasswordChange:
                _authController.currentUser!.forcePasswordChange,
            isVerified: _authController.currentUser!.isVerified,
            isTenantVerified: _authController.currentUser!.isTenantVerified,
            isOwnerVerified: _authController.currentUser!.isOwnerVerified,
          );

          // Update auth controller with local user data (this will also persist to storage)
          print(
            'OwnerUpdateInfoScreen: Updating auth controller and persisting to storage...',
          );
          _authController.updateUser(updatedUser);

          // Verify that the storage update worked by checking storage
          try {
            final storageService = Get.find<StorageService>();
            final storedUser = await storageService.getUserData();
            if (storedUser != null) {
              print(
                'OwnerUpdateInfoScreen: Storage verification - User data in storage after update:',
              );
              print('  firstName: "${storedUser.firstName}"');
              print('  lastName: "${storedUser.lastName}"');
              print('  email: "${storedUser.email}"');
              print('  phone: "${storedUser.phone}"');
            } else {
              print(
                'OwnerUpdateInfoScreen: WARNING - No user data found in storage after update!',
              );
            }
          } catch (e) {
            print('OwnerUpdateInfoScreen: Error verifying storage update: $e');
          }

          print(
            'OwnerUpdateInfoScreen: Showing success toast with message: ${result['message'] ?? 'Profile updated successfully'}',
          );
          ToastUtils.showSuccess(
            result['message'] ?? 'Profile updated successfully',
          );

          print(
            'OwnerUpdateInfoScreen: Toast shown, waiting 2 seconds before navigating back...',
          );
          // Wait a bit to ensure toast is visible before navigating back
          await Future.delayed(const Duration(seconds: 2));
          print('OwnerUpdateInfoScreen: Navigating back...');
          Get.back();
        } else {
          print(
            'OwnerUpdateInfoScreen: Showing error toast with message: ${result['message'] ?? 'Failed to update profile'}',
          );
          ToastUtils.showError(result['message'] ?? 'Failed to update profile');
        }
      } else if (userType == 'owner') {
        // Use owner service for owner users
        if (_ownerService == null) {
          try {
            _ownerService = Get.find<OwnerService>();
            print('OwnerUpdateInfoScreen: OwnerService found in _saveChanges');
          } catch (e) {
            print(
              'OwnerUpdateInfoScreen: Failed to find OwnerService in _saveChanges: $e',
            );
            throw Exception('Owner service not available');
          }
        }

        print('OwnerUpdateInfoScreen: Using OwnerService for owner user');
        print(
          'OwnerUpdateInfoScreen: Current user ID: ${_authController.currentUser!.id}',
        );

        // Prepare update data for owner
        final updateData = {
          'first_name': _firstNameController.text.trim(),
          'last_name': _lastNameController.text.trim(),
          'email': _emailController.text.trim(),
          'phone': _phoneController.text.trim(),
        };

        print('OwnerUpdateInfoScreen: Owner update data: $updateData');

        // Call owner service to update profile
        final result = await _ownerService!.updateOwner(
          _authController.currentUser!.id,
          updateData,
        );

        print('OwnerUpdateInfoScreen: Owner update result: $result');

        if (result['success'] == true) {
          // Update local user data for owner
          final updatedUser = UserModel(
            id: _authController.currentUser!.id,
            username: _authController.currentUser!.username,
            firstName: _firstNameController.text.trim(),
            lastName: _lastNameController.text.trim(),
            email: _emailController.text.trim(),
            phone: _phoneController.text.trim(),
            companyName: _authController.currentUser!.companyName,
            position: _authController.currentUser!.position,
            type: _authController.currentUser!.type,
            forcePasswordChange:
                _authController.currentUser!.forcePasswordChange,
            isVerified: _authController.currentUser!.isVerified,
            isTenantVerified: _authController.currentUser!.isTenantVerified,
            isOwnerVerified: _authController.currentUser!.isOwnerVerified,
          );

          // Update auth controller with local user data (this will also persist to storage)
          print(
            'OwnerUpdateInfoScreen: Updating auth controller and persisting to storage...',
          );
          _authController.updateUser(updatedUser);

          // Verify that the storage update worked by checking storage
          try {
            final storageService = Get.find<StorageService>();
            final storedUser = await storageService.getUserData();
            if (storedUser != null) {
              print(
                'OwnerUpdateInfoScreen: Storage verification - User data in storage after update:',
              );
              print('  firstName: "${storedUser.firstName}"');
              print('  lastName: "${storedUser.lastName}"');
              print('  email: "${storedUser.email}"');
              print('  phone: "${storedUser.phone}"');
            } else {
              print(
                'OwnerUpdateInfoScreen: WARNING - No user data found in storage after update!',
              );
            }
          } catch (e) {
            print('OwnerUpdateInfoScreen: Error verifying storage update: $e');
          }

          print(
            'OwnerUpdateInfoScreen: Showing success toast with message: ${result['message'] ?? 'Profile updated successfully'}',
          );
          ToastUtils.showSuccess(
            result['message'] ?? 'Profile updated successfully',
          );

          print(
            'OwnerUpdateInfoScreen: Toast shown, waiting 2 seconds before navigating back...',
          );
          // Wait a bit to ensure toast is visible before navigating back
          await Future.delayed(const Duration(seconds: 2));
          print('OwnerUpdateInfoScreen: Navigating back...');
          Get.back();
        } else {
          print(
            'OwnerUpdateInfoScreen: Showing error toast with message: ${result['message'] ?? 'Failed to update profile'}',
          );
          ToastUtils.showError(result['message'] ?? 'Failed to update profile');
        }
      } else {
        throw Exception('Unsupported user type: $userType');
      }
    } catch (e) {
      print('OwnerUpdateInfoScreen: Caught exception: $e');
      print('OwnerUpdateInfoScreen: Showing error toast for exception');
      ToastUtils.showError('Error updating profile: ${e.toString()}');
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    print(
      'OwnerUpdateInfoScreen: Building screen with current user: ${_currentUser?.toJson()}',
    );
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          _currentUser != null && _currentUser!.type == 'owner'
              ? 'Edit Owner Profile'
              : 'Edit Tenant Profile',
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Get.back(),
        ),
        actions: [
          // Debug button to show current field values
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () async {
              print('OwnerUpdateInfoScreen: Current field values:');
              print('  firstName: "${_firstNameController.text}"');
              print('  lastName: "${_lastNameController.text}"');
              print('  email: "${_emailController.text}"');
              print('  phone: "${_phoneController.text}"');
              print('  companyName: "${_companyNameController.text}"');
              print('  position: "${_positionController.text}"');

              // Also check what's in storage
              try {
                final storageService = Get.find<StorageService>();
                final storedUser = await storageService.getUserData();
                if (storedUser != null) {
                  print('OwnerUpdateInfoScreen: User data in storage:');
                  print('  firstName: "${storedUser.firstName}"');
                  print('  lastName: "${storedUser.lastName}"');
                  print('  email: "${storedUser.email}"');
                  print('  phone: "${storedUser.phone}"');
                } else {
                  print('OwnerUpdateInfoScreen: No user data found in storage');
                }
              } catch (e) {
                print('OwnerUpdateInfoScreen: Error checking storage: $e');
              }
            },
            tooltip: 'Show field values and storage data',
          ),
          // Refresh button for testing
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              print('OwnerUpdateInfoScreen: Manual refresh requested');
              _refreshAndLoadUserData();
            },
            tooltip: 'Refresh user data',
          ),
          // Test storage update button
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: () async {
              print('OwnerUpdateInfoScreen: Testing storage update...');
              try {
                final storageService = Get.find<StorageService>();
                final testUser = UserModel(
                  id: _authController.currentUser?.id ?? '',
                  username: _authController.currentUser?.username ?? '',
                  firstName: 'Test First Name',
                  lastName: 'Test Last Name',
                  email: 'test@example.com',
                  phone: '+1234567890',
                  companyName: 'Test Company',
                  position: 'Test Position',
                  type: _authController.currentUser?.type ?? 'owner',
                  forcePasswordChange: false,
                  isVerified: true,
                  isTenantVerified: false,
                  isOwnerVerified: false,
                );

                await storageService.storeUserData(testUser);
                print('OwnerUpdateInfoScreen: Test user data saved to storage');

                // Verify it was saved
                final storedUser = await storageService.getUserData();
                if (storedUser != null) {
                  print(
                    'OwnerUpdateInfoScreen: Test user data verified in storage: ${storedUser.toJson()}',
                  );
                }
              } catch (e) {
                print(
                  'OwnerUpdateInfoScreen: Error testing storage update: $e',
                );
              }
            },
            tooltip: 'Test storage update',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20),

                      // Header
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppColors.primary.withOpacity(0.1),
                              AppColors.primary.withOpacity(0.05),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: AppColors.primary.withOpacity(0.2),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Icon(
                                Icons.edit_rounded,
                                color: AppColors.primary,
                                size: 32,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _currentUser != null &&
                                      _currentUser!.type == 'owner'
                                  ? 'Update Your Owner Profile'
                                  : 'Update Your Tenant Profile',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _currentUser != null &&
                                      _currentUser!.type == 'owner'
                                  ? 'Keep your owner information up to date'
                                  : 'Keep your tenant information up to date',
                              style: TextStyle(
                                fontSize: 14,
                                color: AppColors.textSecondary,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Personal Information
                      _buildSectionTitle('Personal Information'),
                      const SizedBox(height: 16),

                      Row(
                        children: [
                          Expanded(
                            child: _buildTextField(
                              controller: _firstNameController,
                              label: 'First Name',
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'First name is required';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildTextField(
                              controller: _lastNameController,
                              label: 'Last Name',
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Last name is required';
                                }
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      _buildTextField(
                        controller: _emailController,
                        label: 'Email',
                        keyboardType: TextInputType.emailAddress,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Email is required';
                          }
                          if (!GetUtils.isEmail(value.trim())) {
                            return 'Please enter a valid email';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 20),

                      _buildTextField(
                        controller: _phoneController,
                        label: 'Phone Number (Optional)',
                        keyboardType: TextInputType.phone,
                      ),

                      const SizedBox(height: 32),

                      const SizedBox(height: 40),

                      // Save Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isSaving ? null : _saveChanges,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: AppColors.white,
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 0,
                          ),
                          child: _isSaving
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.white,
                                    ),
                                  ),
                                )
                              : Text(
                                  _currentUser != null &&
                                          _currentUser!.type == 'owner'
                                      ? 'Save Owner Changes'
                                      : 'Save Tenant Changes',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                      ),

                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.error, width: 2),
        ),
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        labelStyle: TextStyle(color: AppColors.textSecondary),
      ),
    );
  }
}
