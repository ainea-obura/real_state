import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/controllers/owner_dashboard_controller.dart';

class OwnerOverviewScreen extends StatefulWidget {
  const OwnerOverviewScreen({super.key});

  @override
  State<OwnerOverviewScreen> createState() => _OwnerOverviewScreenState();
}

class _OwnerOverviewScreenState extends State<OwnerOverviewScreen> {
  late OwnerDashboardController _dashboardController;

  @override
  void initState() {
    super.initState();
    _dashboardController = Get.find<OwnerDashboardController>();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Obx(() {
          if (_dashboardController.isLoading.value) {
            return _buildLoadingState();
          }

          if (_dashboardController.error.value.isNotEmpty) {
            return _buildErrorState();
          }

          final dashboardData = _dashboardController.dashboardData.value;
          if (dashboardData == null) {
            return _buildNoDataState();
          }

          return _buildOverviewContent(dashboardData);
        }),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(color: AppColors.primary),
          const SizedBox(height: 16),
          Text(
            'Loading owner overview...',
            style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline_rounded, size: 64, color: AppColors.error),
            const SizedBox(height: 16),
            Text(
              'Error Loading Data',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _dashboardController.error.value,
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _dashboardController.loadDashboardData(),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoDataState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 64,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
            Text(
              'No Data Available',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Owner dashboard data not found',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewContent(dynamic dashboardData) {
    // Debug: Print the actual data structure
    print(
      'OwnerOverviewScreen: Dashboard data structure: ${dashboardData.keys}',
    );
    if (dashboardData['data'] != null) {
      print('OwnerOverviewScreen: Data keys: ${dashboardData['data'].keys}');
      if (dashboardData['data']['data'] != null) {
        print(
          'OwnerOverviewScreen: Nested data keys: ${dashboardData['data']['data'].keys}',
        );
        if (dashboardData['data']['data']['results'] != null) {
          print(
            'OwnerOverviewScreen: Results length: ${dashboardData['data']['data']['results'].length}',
          );
          if (dashboardData['data']['data']['results'].isNotEmpty) {
            print(
              'OwnerOverviewScreen: First result keys: ${dashboardData['data']['data']['results'][0].keys}',
            );
          }
        }
      }
    }

    final owner =
        dashboardData['data']?['data']?['results']?[0]?['owner_profile'];
    final stats =
        dashboardData['data']?['data']?['results']?[0]?['quick_stats'];

    print('OwnerOverviewScreen: Owner data: $owner');
    print('OwnerOverviewScreen: Stats data: $stats');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hero Section with Owner Profile
          _buildHeroSection(owner, stats),
          const SizedBox(height: 24),

          // Advanced Stats Dashboard
          _buildAdvancedStatsDashboard(stats),
          const SizedBox(height: 24),

          // Financial Performance Cards
          _buildFinancialPerformanceCards(dashboardData),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildHeroSection(dynamic owner, dynamic stats) {
    // Use API data if available, fallback to storage
    final displayName = owner?['first_name'] ?? 'Owner';
    final email = owner?['email'] ?? 'No email';

    // Get first name safely
    final firstName = displayName.split(' ').isNotEmpty
        ? displayName.split(' ').first
        : displayName;

    return LayoutBuilder(
      builder: (context, constraints) {
        // Responsive sizing based on device width
        final isSmallDevice = constraints.maxWidth < 350;
        final isMediumDevice = constraints.maxWidth < 400;

        final profileSize = isSmallDevice ? 40.0 : 45.0;
        final greetingFontSize = isSmallDevice
            ? 14.0
            : (isMediumDevice ? 16.0 : 18.0);
        final nameFontSize = isSmallDevice
            ? 14.0
            : (isMediumDevice ? 16.0 : 18.0);
        final emailFontSize = isSmallDevice ? 12.0 : 13.0;
        final iconSize = isSmallDevice ? 20.0 : 24.0;
        final notificationSize = isSmallDevice ? 36.0 : 40.0;
        final padding = isSmallDevice ? 16.0 : 18.0;
        final spacing = isSmallDevice ? 12.0 : 16.0;

        return Container(
          width: double.infinity,
          padding: EdgeInsets.all(padding),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              // Left Side: Profile Picture and User Info
              Expanded(
                child: Row(
                  children: [
                    // Profile Picture
                    Container(
                      width: profileSize,
                      height: profileSize,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(profileSize / 2),
                        border: Border.all(
                          color: AppColors.primary.withOpacity(0.3),
                          width: 1.5,
                        ),
                      ),
                      child: Icon(
                        Icons.person_rounded,
                        size: iconSize,
                        color: AppColors.primary,
                      ),
                    ),
                    SizedBox(width: spacing),

                    // User Info Column
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Greeting with Name and Wave
                          Flexible(
                            child: Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    'Hey! ',
                                    style: TextStyle(
                                      fontSize: greetingFontSize,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textSecondary,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Flexible(
                                  child: Text(
                                    firstName,
                                    style: TextStyle(
                                      fontSize: nameFontSize,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '👋',
                                  style: TextStyle(fontSize: nameFontSize),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 3),

                          // Email
                          Flexible(
                            child: Text(
                              email,
                              style: TextStyle(
                                fontSize: emailFontSize,
                                color: AppColors.textSecondary.withOpacity(0.8),
                                fontWeight: FontWeight.w500,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Right Side: Notification Bell
              Container(
                width: notificationSize,
                height: notificationSize,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(notificationSize / 2),
                ),
                child: Stack(
                  children: [
                    Center(
                      child: Icon(
                        Icons.notifications_outlined,
                        size: iconSize * 0.8,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    // Notification Dot
                    Positioned(
                      top: notificationSize * 0.15,
                      right: notificationSize * 0.15,
                      child: Container(
                        width: notificationSize * 0.2,
                        height: notificationSize * 0.2,
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(
                            notificationSize * 0.1,
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
      },
    );
  }

  Widget _buildAdvancedStatsDashboard(dynamic stats) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(
              'Quick Overview',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          SizedBox(
            height: 120,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.zero,
              children: [
                _buildAdvancedStatCard(
                  icon: Icons.home_work_rounded,
                  title: '${stats?['total_properties'] ?? 0}',
                  value: 'Properties',
                  subtitle: 'Total owned',
                  color: AppColors.primary,
                  gradient: [
                    AppColors.primary,
                    AppColors.primary.withOpacity(0.7),
                  ],
                ),
                const SizedBox(width: 16),
                _buildAdvancedStatCard(
                  icon: Icons.people_rounded,
                  title:
                      '${stats?['occupancy_rate']?.toStringAsFixed(1) ?? '0'}%',
                  value: 'Occupancy',
                  subtitle: 'Current rate',
                  color: AppColors.success,
                  gradient: [
                    AppColors.success,
                    AppColors.success.withOpacity(0.7),
                  ],
                ),
                const SizedBox(width: 16),
                _buildAdvancedStatCard(
                  icon: Icons.trending_up_rounded,
                  title: '${stats?['total_income'] ?? 'KES 0'}',
                  value: 'Income',
                  subtitle: 'This year',
                  color: AppColors.info,
                  gradient: [AppColors.info, AppColors.info.withOpacity(0.7)],
                ),
                const SizedBox(width: 16),
                _buildAdvancedStatCard(
                  icon: Icons.pending_rounded,
                  title: '${stats?['pending_invoices'] ?? 'KES 0'}',
                  value: 'Pending',
                  subtitle: 'Outstanding',
                  color: AppColors.warning,
                  gradient: [
                    AppColors.warning,
                    AppColors.warning.withOpacity(0.7),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdvancedStatCard({
    required IconData icon,
    required String title,
    required String value,
    required String subtitle,
    required Color color,
    required List<Color> gradient,
  }) {
    return Container(
      width: 150,
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.15),
            blurRadius: 12,
            offset: const Offset(0, 4),
            spreadRadius: 0,
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon and Title Row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, size: 18, color: color),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    value,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Main Value
            Text(
              title,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 3),

            // Subtitle
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 11,
                color: AppColors.textSecondary.withOpacity(0.8),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFinancialPerformanceCards(dynamic dashboardData) {
    final financialData =
        dashboardData['data']?['data']?['results']?[0]?['financial_overview'];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(
              'Financial Performance',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          SizedBox(
            height: 120,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.zero,
              children: [
                _buildAdvancedStatCard(
                  icon: Icons.trending_up_rounded,
                  title: financialData?['total_income'] ?? 'KES 0.00',
                  value: 'Total Income',
                  subtitle: 'This year',
                  color: AppColors.success,
                  gradient: [
                    AppColors.success,
                    AppColors.success.withOpacity(0.7),
                  ],
                ),
                const SizedBox(width: 16),
                _buildAdvancedStatCard(
                  icon: Icons.receipt_rounded,
                  title: financialData?['pending_invoices'] ?? 'KES 0.00',
                  value: 'Pending',
                  subtitle: 'Outstanding',
                  color: AppColors.warning,
                  gradient: [
                    AppColors.warning,
                    AppColors.warning.withOpacity(0.7),
                  ],
                ),
                const SizedBox(width: 16),
                _buildAdvancedStatCard(
                  icon: Icons.warning_rounded,
                  title: financialData?['total_outstanding'] ?? 'KES 0.00',
                  value: 'Outstanding',
                  subtitle: 'Total due',
                  color: AppColors.error,
                  gradient: [AppColors.error, AppColors.error.withOpacity(0.7)],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
