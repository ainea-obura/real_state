import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/bottom_navigation.dart';
import '../../../core/controllers/owner_property_controller.dart';
import '../../../core/controllers/owner_finance_controller.dart';
import '../../../core/controllers/owner_dashboard_controller.dart';
import 'owner_profile_screen.dart';
import 'owner_properties_screen.dart';
import 'owner_finance_screen.dart';
import 'owner_overview_screen.dart';

class OwnerDashboardScreen extends StatefulWidget {
  const OwnerDashboardScreen({super.key});

  @override
  State<OwnerDashboardScreen> createState() => _OwnerDashboardScreenState();
}

class _OwnerDashboardScreenState extends State<OwnerDashboardScreen> {
  int _currentIndex = 0;
  late OwnerPropertyController _propertyController;
  late OwnerFinanceController _financeController;
  late OwnerDashboardController _dashboardController;

  @override
  void initState() {
    super.initState();
    _propertyController = Get.find<OwnerPropertyController>();
    _financeController = Get.find<OwnerFinanceController>();
    _dashboardController = Get.find<OwnerDashboardController>();

    // Individual screens will handle their own data loading (like tenant screen)
  }

  void _onTabChanged(int index) {
    setState(() => _currentIndex = index);

    // Individual screens handle their own data loading
    print('OwnerDashboardScreen: Tab changed to index $index');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          // Overview Tab - Comprehensive owner dashboard summary
          const OwnerOverviewScreen(),
          // Properties Tab - List of properties owner owns
          const OwnerPropertiesScreen(),
          // Finance Tab - Financial reports and payment tracking
          const OwnerFinanceScreen(),
          // Profile Tab - Registration, updates, password change, logout
          const OwnerProfileScreen(),
        ],
      ),
      bottomNavigationBar: AppBottomNavigation(
        currentIndex: _currentIndex,
        onTap: _onTabChanged,
        userType: 'owner',
      ),
    );
  }
}
