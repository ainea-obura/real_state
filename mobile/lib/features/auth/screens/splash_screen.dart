import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/controllers/auth_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/loading_widget.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _hasNavigated = false;

  @override
  void initState() {
    super.initState();
    // Check authentication status only once
    _checkAuthenticationStatus();
  }

  Future<void> _checkAuthenticationStatus() async {
    if (_hasNavigated) return; // Prevent multiple navigations

    try {
      // Add a small delay to show splash screen
      await Future.delayed(const Duration(seconds: 1));

      if (_hasNavigated) return; // Check again after delay

      // Use AuthController to properly handle token refresh and user loading
      final authController = Get.find<AuthController>();

      await authController.checkAutoLogin();

      // The AuthController will handle navigation based on the result
      // No need to navigate manually here
    } catch (e) {
      _navigateToLogin();
    }
  }

  void _navigateBasedOnUserType(String userType) {
    if (_hasNavigated) return;
    _hasNavigated = true;

    if (userType == 'tenant') {
      Get.offAllNamed('/tenant-dashboard');
    } else if (userType == 'owner') {
      Get.offAllNamed('/owner-dashboard');
    } else {
      _navigateToUnauthorized();
    }
  }

  void _navigateToLogin() {
    if (_hasNavigated) return;
    _hasNavigated = true;

    Get.offAllNamed('/login');
  }

  void _navigateToUnauthorized() {
    if (_hasNavigated) return;
    _hasNavigated = true;

    Get.offAllNamed('/unauthorized');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // App Logo
            Icon(Icons.home_work_rounded, size: 80, color: AppColors.white),
            SizedBox(height: 24),

            // App Name
            Text(
              'Real Estate Mobile',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppColors.white,
              ),
            ),
            SizedBox(height: 8),

            // App Tagline
            Text(
              'Manage your properties on the go',
              style: TextStyle(
                fontSize: 16,
                color: AppColors.white,
                fontWeight: FontWeight.w300,
              ),
            ),
            SizedBox(height: 48),

            // Loading Indicator
            LoadingWidget(
              message: 'Checking your session...',
              size: 40,
              color: AppColors.white,
            ),
          ],
        ),
      ),
    );
  }
}
