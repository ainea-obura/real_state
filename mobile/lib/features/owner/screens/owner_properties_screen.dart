import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/models/owner_property_model.dart';
import '../../../core/controllers/owner_property_controller.dart';
import 'package:get/get.dart';
import '../../../core/controllers/auth_controller.dart';

class OwnerPropertiesScreen extends StatefulWidget {
  const OwnerPropertiesScreen({super.key});

  @override
  State<OwnerPropertiesScreen> createState() => _OwnerPropertiesScreenState();
}

class _OwnerPropertiesScreenState extends State<OwnerPropertiesScreen> {
  late OwnerPropertyController _controller;

  @override
  void initState() {
    super.initState();
    print('OwnerPropertiesScreen: initState called');

    // Use Future.microtask to avoid calling controller methods during build
    Future.microtask(() {
      if (mounted) {
        try {
          _controller = Get.find<OwnerPropertyController>();
          print('OwnerPropertiesScreen: Controller found successfully');

          // Load data directly here (like tenant screen does)
          _controller.loadDataWhenTabAccessed();
        } catch (e) {
          print('OwnerPropertiesScreen: Error finding controller: $e');
          print('OwnerPropertiesScreen: Available services: ${Get.keys}');

          // Try to find it again after a delay
          Future.delayed(const Duration(milliseconds: 500), () {
            if (mounted) {
              try {
                _controller = Get.find<OwnerPropertyController>();
                print('OwnerPropertiesScreen: Controller found on retry');
                _controller.loadDataWhenTabAccessed();
              } catch (e) {
                print(
                  'OwnerPropertiesScreen: Controller still not found on retry: $e',
                );
              }
            }
          });
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    print('OwnerPropertiesScreen: build method called');
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: GetBuilder<OwnerPropertyController>(
          builder: (controller) {
            print('OwnerPropertiesScreen: GetBuilder called');
            print(
              'Controller state - Loading: ${controller.isLoadingProperties}, Error: ${controller.error}, Properties: ${controller.properties.length}',
            );
            print(
              'Controller registered: ${Get.isRegistered<OwnerPropertyController>()}',
            );
            print('Controller instance: $controller');

            if (controller.isLoadingProperties) {
              print(
                'OwnerPropertiesScreen: Controller is loading, showing loading state',
              );
              return _buildLoadingState();
            }

            if (controller.error.isNotEmpty) {
              print(
                'OwnerPropertiesScreen: Controller has error: ${controller.error}',
              );
              return _buildErrorState(controller.error);
            }

            if (controller.properties.isEmpty) {
              print(
                'OwnerPropertiesScreen: Controller has no properties, showing empty state',
              );
              return _buildEmptyState();
            }

            print(
              'OwnerPropertiesScreen: Controller has ${controller.properties.length} properties, showing list',
            );
            return _buildPropertiesList(controller.properties);
          },
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Column(
      children: [
        // Debug info section
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.warning.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.warning.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Debug Info',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.warning,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Controller State:',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
              ),
              Text(
                'Controller Registered: ${Get.isRegistered<OwnerPropertyController>()}',
              ),
              Text('Controller Instance: ${_controller.hashCode}'),
              Text('Loading: ${_controller.isLoadingProperties}'),
              Text('Error: ${_controller.error}'),
              Text('Properties Count: ${_controller.properties.length}'),
              Text('Filtered Count: ${_controller.filteredProperties.length}'),
              const SizedBox(height: 8),
              Row(
                children: [
                  // Debug buttons removed - using simple loading approach like tenant screen
                ],
              ),
            ],
          ),
        ),
        // Loading skeletons
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: 3,
            itemBuilder: (context, index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _buildPropertyCardSkeleton(),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.1),
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.error.withOpacity(0.2),
                  width: 2,
                ),
              ),
              child: Icon(
                Icons.error_outline_rounded,
                color: AppColors.error,
                size: 48,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Error Loading Properties',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              error,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () {
                // Use the controller instance directly
                _controller.loadProperties();
              },
              icon: const Icon(Icons.refresh_rounded, size: 20),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 2,
              ),
            ),
          ],
        ),
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
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.primary.withOpacity(0.2),
                  width: 2,
                ),
              ),
              child: Icon(
                Icons.home_rounded,
                color: AppColors.primary,
                size: 48,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Properties Found',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'You don\'t have any properties yet.\nStart by adding your first property.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 24),
            // Debug button to manually load properties
            ElevatedButton.icon(
              onPressed: () {
                print('Debug: Manually calling loadProperties()');
                _controller.loadProperties();
              },
              icon: const Icon(Icons.bug_report_rounded, size: 20),
              label: const Text('Debug: Load Properties'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.warning,
                foregroundColor: AppColors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPropertiesList(List<OwnerProperty> properties) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Portfolio Overview Cards
        _buildPortfolioOverviewCards(properties),
        const SizedBox(height: 24),

        // Properties Header
        Text(
          'Properties',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 16),

        // Properties List
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: properties.length,
          itemBuilder: (context, index) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: _buildPropertyCard(properties[index]),
            );
          },
        ),
      ],
    );
  }

  Widget _buildPortfolioOverviewCards(List<OwnerProperty> properties) {
    // Calculate summary data
    final totalProperties = properties.length;
    final activeTenants = properties.where((p) => p.occupiedUnits > 0).length;
    final occupancyRate = totalProperties > 0
        ? (activeTenants / totalProperties * 100)
        : 0.0;
    final totalMaintenance = 0; // Not available in current model
    final emergencyMaintenance = 0; // Not available in current model

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Text(
          'Property Portfolio',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Managing $totalProperties properties',
          style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 24),

        // Overview Cards Grid
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.8,
          children: [
            // Total Properties Card
            _buildOverviewCard(
              icon: Icons.business_rounded,
              title: 'Total Properties',
              value: totalProperties.toString(),
              subtitle: 'Properties owned',
              backgroundColor: AppColors.primary.withOpacity(0.1),
              iconColor: AppColors.primary,
            ),

            // Active Tenants Card
            _buildOverviewCard(
              icon: Icons.people_rounded,
              title: 'Active Tenants',
              value: activeTenants.toString(),
              subtitle: 'Currently rented',
              backgroundColor: Colors.green.withOpacity(0.1),
              iconColor: Colors.green[600]!,
            ),

            // Occupancy Rate Card
            _buildOverviewCard(
              icon: Icons.pie_chart_rounded,
              title: 'Occupancy Rate',
              value: '${occupancyRate.toStringAsFixed(1)}%',
              subtitle: 'Portfolio occupancy',
              backgroundColor: Colors.blue.withOpacity(0.1),
              iconColor: Colors.blue[600]!,
            ),

            // Maintenance Card
            _buildOverviewCard(
              icon: Icons.build_rounded,
              title: 'Maintenance',
              value: totalMaintenance.toString(),
              subtitle: 'Urgent Requests ($emergencyMaintenance)',
              backgroundColor: Colors.orange.withOpacity(0.1),
              iconColor: Colors.orange[600]!,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildOverviewCard({
    required IconData icon,
    required String title,
    required String value,
    required String subtitle,
    required Color backgroundColor,
    required Color iconColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: backgroundColor.withOpacity(0.3), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: backgroundColor.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, size: 20, color: iconColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        value,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            Text(
              subtitle,
              style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPropertyCardSkeleton() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.2), width: 1),
        boxShadow: [
          BoxShadow(
            color: AppColors.border.withOpacity(0.08),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Content skeleton
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header row skeleton
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            height: 22,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: AppColors.border.withOpacity(0.3),
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            height: 16,
                            width: 200,
                            decoration: BoxDecoration(
                              color: AppColors.border.withOpacity(0.3),
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      width: 80,
                      height: 28,
                      decoration: BoxDecoration(
                        color: AppColors.border.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                // Property type and units skeleton
                Row(
                  children: [
                    Container(
                      width: 80,
                      height: 28,
                      decoration: BoxDecoration(
                        color: AppColors.border.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      width: 100,
                      height: 28,
                      decoration: BoxDecoration(
                        color: AppColors.border.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Additional info skeleton
                Row(
                  children: [
                    Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: AppColors.border.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(7),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 120,
                      height: 14,
                      decoration: BoxDecoration(
                        color: AppColors.border.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: AppColors.border.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(7),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 140,
                      height: 14,
                      decoration: BoxDecoration(
                        color: AppColors.border.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPropertyCard(OwnerProperty property) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.2), width: 1),
        boxShadow: [
          BoxShadow(
            color: AppColors.border.withOpacity(0.08),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          splashColor: AppColors.primary.withOpacity(0.1),
          highlightColor: AppColors.primary.withOpacity(0.05),
          onTap: () {
            final controller = Get.find<OwnerPropertyController>();
            controller.onPropertyTap(property);
          },
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Property Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Property Name and Type
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                property
                                    .propertyName, // Use propertyName directly like web version
                                style: const TextStyle(
                                  fontSize: 20, // Larger font like web version
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                property
                                    .propertyAddress, // Use propertyAddress directly like web version
                                style: TextStyle(
                                  fontSize: 14,
                                  color: AppColors.textSecondary,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppColors.primary.withOpacity(0.2),
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                _getPropertyTypeIcon(
                                  property.unitType ?? 'UNIT',
                                ),
                                size: 16,
                                color: AppColors.primary,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                _formatPropertyType(
                                  property.unitType ?? 'UNIT',
                                ),
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Property Details
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.success.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: AppColors.success.withOpacity(0.2),
                                width: 1,
                              ),
                            ),
                            child: Text(
                              '${property.occupiedUnits}/${property.totalUnits} Units',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.success,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.warning.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: AppColors.warning.withOpacity(0.2),
                                width: 1,
                              ),
                            ),
                            child: Text(
                              '${property.occupancyRate.toStringAsFixed(0)}% Occupied',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.warning,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Current Tenant Section
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Current Tenant',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),

                    if (property.occupiedUnits > 0) ...[
                      // Has Tenant
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.green.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.green.withOpacity(0.2),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Active Tenant',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.green[700],
                                        ),
                                      ),
                                      if (property.tenantName != null &&
                                          property.tenantName!.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          property.tenantName!,
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.textPrimary,
                                          ),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.green.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'Active',
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.green[700],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            if (property.contractStart != null &&
                                property.contractEnd != null) ...[
                              Row(
                                children: [
                                  Icon(
                                    Icons.calendar_today_rounded,
                                    size: 14,
                                    color: AppColors.textSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      'Lease: ${property.contractStart} - ${property.contractEnd}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                            ],
                            if (property.monthlyRent != null &&
                                property.monthlyRent!.isNotEmpty) ...[
                              Row(
                                children: [
                                  Icon(
                                    Icons.attach_money_rounded,
                                    size: 14,
                                    color: AppColors.textSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Rent: ',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  Text(
                                    property.monthlyRent!,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ] else ...[
                      // No Tenant
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.border.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppColors.border.withOpacity(0.2),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              Icons.people_outline_rounded,
                              size: 24,
                              color: AppColors.textSecondary,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'No Active Tenant',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // Maintenance Section
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Maintenance',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.orange.withOpacity(0.2),
                          width: 1,
                        ),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.build_rounded,
                            size: 24,
                            color: Colors.orange[600],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'No maintenance this month',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Colors.orange[700],
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Helper methods
  IconData _getPropertyTypeIcon(String nodeType) {
    switch (nodeType.toUpperCase()) {
      case 'PROJECT':
        return Icons.business_rounded;
      case 'BLOCK':
        return Icons.apartment_rounded;
      case 'FLOOR':
        return Icons.layers_rounded;
      case 'UNIT':
        return Icons.home_rounded;
      case 'HOUSE':
        return Icons.house_rounded;
      case 'ROOM':
        return Icons.meeting_room_rounded;
      case 'BASEMENT':
        return Icons.local_parking_rounded;
      default:
        return Icons.home_rounded;
    }
  }

  String _formatPropertyType(String nodeType) {
    switch (nodeType.toUpperCase()) {
      case 'PROJECT':
        return 'Project';
      case 'BLOCK':
        return 'Block';
      case 'FLOOR':
        return 'Floor';
      case 'UNIT':
        return 'Unit';
      case 'HOUSE':
        return 'House';
      case 'ROOM':
        return 'Room';
      case 'BASEMENT':
        return 'Parking';
      default:
        return nodeType;
    }
  }
}
