import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class AppBottomNavigation extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;
  final String userType; // 'owner' or 'tenant'

  const AppBottomNavigation({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.userType,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface, // Use surface color (white) for background
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow, // Use app shadow color
            offset: const Offset(0, -1),
            blurRadius: 4,
            spreadRadius: 0,
          ),
        ],
      ),
      child: SafeArea(
        child: Container(
          height: 80,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: _buildNavigationItems(),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildNavigationItems() {
    if (userType == 'owner') {
      // Owner: Overview, Properties, Finance, Profile
      return [
        _buildNavItem(
          icon: Icons.dashboard_rounded,
          label: 'Overview',
          index: 0,
          isSelected: currentIndex == 0,
        ),
        _buildNavItem(
          icon: Icons.home_work_rounded,
          label: 'Properties',
          index: 1,
          isSelected: currentIndex == 1,
        ),
        _buildNavItem(
          icon: Icons.account_balance_wallet_rounded,
          label: 'Finance',
          index: 2,
          isSelected: currentIndex == 2,
        ),
        _buildNavItem(
          icon: Icons.person_rounded,
          label: 'Profile',
          index: 3,
          isSelected: currentIndex == 3,
        ),
      ];
    } else {
      // Tenant: Properties, Finance, Profile (no Overview)
      return [
        _buildNavItem(
          icon: Icons.home_work_rounded,
          label: 'Properties',
          index: 0,
          isSelected: currentIndex == 0,
        ),
        _buildNavItem(
          icon: Icons.account_balance_wallet_rounded,
          label: 'Finance',
          index: 1,
          isSelected: currentIndex == 1,
        ),
        _buildNavItem(
          icon: Icons.person_rounded,
          label: 'Profile',
          index: 2,
          isSelected: currentIndex == 2,
        ),
      ];
    }
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required int index,
    required bool isSelected,
  }) {
    return GestureDetector(
      onTap: () => onTap(index),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 24,
            color: isSelected
                ? AppColors.primary
                : AppColors
                      .textSecondary, // Use primary for selected, textSecondary for unselected
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected
                  ? FontWeight.w600
                  : FontWeight.w400, // Use semibold for selected
              color: isSelected
                  ? AppColors.primary
                  : AppColors
                        .textSecondary, // Use primary for selected, textSecondary for unselected
            ),
          ),
        ],
      ),
    );
  }
}
