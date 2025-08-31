import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/controllers/auth_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/custom_button.dart';

class UnauthorizedScreen extends StatelessWidget {
  const UnauthorizedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.defaultPadding),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Error Icon
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.block_rounded,
                  size: 64,
                  color: AppColors.error,
                ),
              ),
              const SizedBox(height: 32),

              // Title
              const Text(
                'Access Denied',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              // Message
              const Text(
                AppConstants.unauthorizedMessage,
                style: TextStyle(
                  fontSize: 16,
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),

              // Additional Info
              const Text(
                'Only property owners and tenants can access this application.',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // Action Buttons
              Column(
                children: [
                  CustomButton(
                    text: 'Try Different Account',
                    onPressed: () {
                      AuthController.instance.logout();
                    },
                    icon: Icons.person_outline,
                  ),
                  const SizedBox(height: 12),

                  CustomButton(
                    text: 'Contact Support',
                    onPressed: () {
                      // TODO: Implement contact support
                      Get.snackbar(
                        'Contact Support',
                        'Please contact your administrator for access',
                        snackPosition: SnackPosition.TOP,
                        backgroundColor: AppColors.info,
                        colorText: AppColors.white,
                      );
                    },
                    isOutlined: true,
                    icon: Icons.support_agent_outlined,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
