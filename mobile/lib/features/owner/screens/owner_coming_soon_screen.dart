import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/controllers/auth_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/custom_button.dart';

class OwnerComingSoonScreen extends StatelessWidget {
  const OwnerComingSoonScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Owner Dashboard'),
        automaticallyImplyLeading: false,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'logout') {
                AuthController.instance.logout();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, color: AppColors.error),
                    SizedBox(width: 8),
                    Text('Logout'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.defaultPadding),
          child: GetBuilder<AuthController>(
            builder: (controller) {
              final user = controller.currentUser;

              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Construction Icon
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.construction_rounded,
                      size: 64,
                      color: AppColors.warning,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Welcome Message
                  Text(
                    'Welcome ${user?.displayName ?? 'Owner'}!',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),

                  // Coming Soon Message
                  const Text(
                    'Owner Dashboard',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),

                  const Text(
                    'Coming Soon!',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                      color: AppColors.warning,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),

                  // Description
                  const Text(
                    'We\'re working hard to bring you an amazing owner experience. The owner dashboard will include:',
                    style: TextStyle(
                      fontSize: 16,
                      color: AppColors.textSecondary,
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),

                  // Features List
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(
                        AppConstants.defaultBorderRadius,
                      ),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      children: const [
                        _FeatureItem(
                          icon: Icons.home_work_outlined,
                          text: 'Property management',
                        ),
                        SizedBox(height: 12),
                        _FeatureItem(
                          icon: Icons.people_outline,
                          text: 'Tenant management',
                        ),
                        SizedBox(height: 12),
                        _FeatureItem(
                          icon: Icons.build_outlined,
                          text: 'Maintenance requests',
                        ),
                        SizedBox(height: 12),
                        _FeatureItem(
                          icon: Icons.analytics_outlined,
                          text: 'Financial reports',
                        ),
                        SizedBox(height: 12),
                        _FeatureItem(
                          icon: Icons.payment_outlined,
                          text: 'Payment tracking',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Action Button
                  CustomButton(
                    text: 'Stay Tuned',
                    onPressed: () {
                      Get.snackbar(
                        'Thank You!',
                        'We\'ll notify you when the owner dashboard is ready',
                        snackPosition: SnackPosition.TOP,
                        backgroundColor: AppColors.success,
                        colorText: AppColors.white,
                      );
                    },
                    icon: Icons.notifications_outlined,
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _FeatureItem extends StatelessWidget {
  final IconData icon;
  final String text;

  const _FeatureItem({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 14, color: AppColors.textPrimary),
          ),
        ),
      ],
    );
  }
}
