import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/utils/toast_utils.dart';
import '../../../core/controllers/auth_controller.dart';
import '../../../core/models/user_model.dart';
import '../../../core/services/tenant_service.dart';
import '../../../core/services/storage_service.dart';
import '../../../core/theme/app_colors.dart';

class TenantUpdateInfoScreen extends StatefulWidget {
  const TenantUpdateInfoScreen({super.key});

  @override
  State<TenantUpdateInfoScreen> createState() => _TenantUpdateInfoScreenState();
}

class _TenantUpdateInfoScreenState extends State<TenantUpdateInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();

  final AuthController _authController = Get.find<AuthController>();
  final StorageService _storageService = Get.find<StorageService>();
  TenantService? _tenantService;

  final bool _isLoading = false;
  bool _isSaving = false;
  UserModel? _currentUser;

  @override
  void initState() {
    super.initState();
    _initializeServices();
    _loadCurrentUserData();
  }

  void _initializeServices() {
    try {
      _tenantService = Get.find<TenantService>();
    } catch (e) {
      // Try to find it again or handle the error
      WidgetsBinding.instance.addPostFrameCallback((_) {
        try {
          _tenantService = Get.find<TenantService>();
        } catch (e) {
          // Handle error silently
        }
      });
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _loadCurrentUserData() {
    _currentUser = _authController.currentUser;
    if (_currentUser != null) {
      // Always try to populate firstName and lastName first
      if (_currentUser!.firstName != null &&
          _currentUser!.firstName!.isNotEmpty) {
        _firstNameController.text = _currentUser!.firstName!;
      }

      if (_currentUser!.lastName != null &&
          _currentUser!.lastName!.isNotEmpty) {
        _lastNameController.text = _currentUser!.lastName!;
      }

      // If firstName or lastName is empty, try to extract from fullName
      if ((_currentUser!.firstName == null ||
              _currentUser!.firstName!.isEmpty) ||
          (_currentUser!.lastName == null || _currentUser!.lastName!.isEmpty)) {
        final fullName = _currentUser!.fullName ?? '';
        if (fullName.isNotEmpty) {
          final nameParts = fullName.trim().split(' ');

          if (nameParts.length >= 2) {
            // If firstName is empty, set it
            if (_firstNameController.text.isEmpty) {
              _firstNameController.text = nameParts.first;
            }
            // If lastName is empty, set it
            if (_lastNameController.text.isEmpty) {
              _lastNameController.text = nameParts.sublist(1).join(' ');
            }
          } else if (nameParts.length == 1 &&
              _firstNameController.text.isEmpty) {
            // Only one name part, set as firstName
            _firstNameController.text = nameParts.first;
          }
        }
      }

      // Always populate email
      if (_currentUser!.email.isNotEmpty) {
        _emailController.text = _currentUser!.email;
      }

      // Debug logging to see what's being loaded
      print('=== Loading User Data ===');
      print('First Name: "${_firstNameController.text}"');
      print('Last Name: "${_lastNameController.text}"');
      print('Email: "${_emailController.text}"');
      print('User firstName: ${_currentUser!.firstName}');
      print('User lastName: ${_currentUser!.lastName}');
      print('User fullName: ${_currentUser!.fullName}');
      print('=======================');
    }
  }

  Future<void> _saveChanges() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_tenantService == null) {
      // Try to find the service again
      try {
        _tenantService = Get.find<TenantService>();
      } catch (e) {
        ToastUtils.showError('Service not available. Please try again.');
        return;
      }

      if (_tenantService == null) {
        ToastUtils.showError('Service not available. Please try again.');
        return;
      }
    }

    setState(() => _isSaving = true);

    try {
      // Prepare update data
      final updateData = {
        'first_name': _firstNameController.text.trim(),
        'last_name': _lastNameController.text.trim(),
        'email': _emailController.text.trim(),
      };

      // Call tenant service to update tenant information
      final result = await _tenantService!.updateTenant(
        _currentUser!.id,
        updateData,
      );

      final success = result['success'] as bool;
      final message = result['message'] as String;

      if (success) {
        // Update local storage with new user data
        final updatedUser = _currentUser!.copyWith(
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
          fullName:
              '${_firstNameController.text.trim()} ${_lastNameController.text.trim()}'
                  .trim(),
          email: _emailController.text.trim(),
        );

        // Update storage
        await _storageService.storeUserData(updatedUser);

        // Update auth controller
        _authController.updateUser(updatedUser);

        ToastUtils.showSuccess(message);
        Get.back();
      } else {
        ToastUtils.showError(message);
      }
    } catch (e) {
      ToastUtils.showError('Error updating profile: ${e.toString()}');
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Edit Profile',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        backgroundColor: AppColors.surface,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_rounded,
            color: AppColors.textPrimary,
            size: 20,
          ),
          onPressed: () => Get.back(),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: AppColors.borderLight),
        ),
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Loading profile information...',
                    style: TextStyle(
                      fontSize: 16,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            )
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20),

                      // Profile Information Header
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
                                Icons.person_rounded,
                                color: AppColors.primary,
                                size: 32,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Personal Information',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Update your personal details and contact information',
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

                      // Form Fields
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: AppColors.borderLight,
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 15,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // First Name Field
                            _buildFormField(
                              controller: _firstNameController,
                              label: 'First Name',
                              hint: 'Enter your first name',
                              icon: Icons.person_outline_rounded,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'First name is required';
                                }
                                if (value.trim().length < 2) {
                                  return 'First name must be at least 2 characters';
                                }
                                return null;
                              },
                            ),

                            const SizedBox(height: 24),

                            // Last Name Field
                            _buildFormField(
                              controller: _lastNameController,
                              label: 'Last Name',
                              hint: 'Enter your last name',
                              icon: Icons.person_outline_rounded,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Last name is required';
                                }
                                if (value.trim().length < 2) {
                                  return 'Last name must be at least 2 characters';
                                }
                                return null;
                              },
                            ),

                            const SizedBox(height: 24),

                            // Email Field
                            _buildFormField(
                              controller: _emailController,
                              label: 'Email Address',
                              hint: 'Enter your email address',
                              icon: Icons.email_outlined,
                              keyboardType: TextInputType.emailAddress,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Email is required';
                                }
                                if (!RegExp(
                                  r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
                                ).hasMatch(value.trim())) {
                                  return 'Please enter a valid email address';
                                }
                                return null;
                              },
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Save Button
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.3),
                              blurRadius: 15,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
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
                              ? Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor:
                                            AlwaysStoppedAnimation<Color>(
                                              Colors.white,
                                            ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      'Updating...',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.white,
                                      ),
                                    ),
                                  ],
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.save_rounded,
                                      size: 20,
                                      color: AppColors.white,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Update Profile',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
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

  Widget _buildFormField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    required String? Function(String?) validator,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.borderLight),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.borderLight),
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
            fillColor: AppColors.background,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
          ),
          validator: validator,
        ),
      ],
    );
  }
}
