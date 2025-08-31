import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/bottom_navigation.dart';
import 'tenant_profile_screen.dart';
import 'tenant_properties_screen.dart';
import 'tenant_finance_screen.dart';

class TenantDashboardScreen extends StatefulWidget {
  const TenantDashboardScreen({super.key});

  @override
  State<TenantDashboardScreen> createState() => _TenantDashboardScreenState();
}

class _TenantDashboardScreenState extends State<TenantDashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // Use the new background color
      body: IndexedStack(
        index: _currentIndex,
        children: [
          // Properties Tab - List of properties tenant lives in
          const TenantPropertiesScreen(),
          // Finance Tab - Invoices, payments, and payment processing
          const TenantFinanceScreen(),
          // Profile Tab - Registration, updates, password change, logout
          const TenantProfileScreen(),
        ],
      ),
      bottomNavigationBar: AppBottomNavigation(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        userType: 'tenant',
      ),
    );
  }
}
