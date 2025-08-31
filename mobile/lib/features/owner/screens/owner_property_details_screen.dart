import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/models/owner_property_model.dart';
import '../../../core/controllers/owner_property_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/services/owner_property_service.dart';
import '../../../core/constants/api_constants.dart';

class OwnerPropertyDetailsScreen extends StatefulWidget {
  final OwnerProperty property;

  const OwnerPropertyDetailsScreen({super.key, required this.property});

  @override
  State<OwnerPropertyDetailsScreen> createState() =>
      _OwnerPropertyDetailsScreenState();
}

class _OwnerPropertyDetailsScreenState
    extends State<OwnerPropertyDetailsScreen> {
  late OwnerPropertyController _controller;
  late OwnerPropertyService _propertyService;
  Map<String, dynamic>? _propertyDetails;
  bool _isLoading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _controller = Get.find<OwnerPropertyController>();
    _propertyService = Get.find<OwnerPropertyService>();
    _loadPropertyDetails();

    // Safety timeout to prevent infinite loading
    Future.delayed(const Duration(seconds: 30), () {
      if (mounted && _isLoading) {
        print(
          'OwnerPropertyDetailsScreen: Safety timeout triggered, showing fallback',
        );
        setState(() {
          _isLoading = false;
          _error = 'Loading timeout. Showing basic property information.';
        });
      }
    });
  }

  Future<void> _loadPropertyDetails() async {
    try {
      print('OwnerPropertyDetailsScreen: Starting to load property details...');
      setState(() {
        _isLoading = true;
        _error = '';
      });

      print(
        'OwnerPropertyDetailsScreen: Calling controller.loadPropertyDetails...',
      );

      // Add timeout to prevent infinite loading
      final details = await _controller
          .loadPropertyDetails(widget.property.id)
          .timeout(const Duration(seconds: 25));

      print('OwnerPropertyDetailsScreen: Controller returned: $details');

      if (details != null) {
        print(
          'OwnerPropertyDetailsScreen: Setting property details and stopping loading',
        );
        setState(() {
          _propertyDetails = details;
          _isLoading = false;
        });
      } else {
        print('OwnerPropertyDetailsScreen: No details returned, setting error');
        setState(() {
          _error =
              'Failed to load property details from API. Showing basic information.';
          _isLoading = false;
        });
      }
    } catch (e) {
      print('OwnerPropertyDetailsScreen: Exception occurred: $e');
      setState(() {
        _error = 'Error loading property details: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  // Force refresh method to clear stuck states
  Future<void> _forceRefreshPropertyDetails() async {
    try {
      print('OwnerPropertyDetailsScreen: Force refreshing property details...');
      setState(() {
        _isLoading = true;
        _error = '';
      });

      final details = await _controller
          .forceRefreshPropertyDetails(widget.property.id)
          .timeout(const Duration(seconds: 20));

      if (details != null) {
        setState(() {
          _propertyDetails = details;
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Force refresh failed. Showing basic information.';
          _isLoading = false;
        });
      }
    } catch (e) {
      print('OwnerPropertyDetailsScreen: Force refresh exception: $e');
      setState(() {
        _error = 'Force refresh error: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  // Emergency method to clear stuck loading state
  void _clearStuckLoadingState() {
    print('OwnerPropertyDetailsScreen: Clearing stuck loading state');
    setState(() {
      _isLoading = false;
      _error = 'Loading state cleared. Showing basic property information.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Property Details',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: AppColors.textPrimary),
          onPressed: () => Get.back(),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh_rounded, color: AppColors.textPrimary),
            onPressed: _loadPropertyDetails,
            tooltip: 'Refresh',
          ),
        ],
      ),
      backgroundColor: AppColors.background,
      body: _isLoading
          ? _buildLoadingState()
          : _error.isNotEmpty
          ? _buildErrorStateWithFallback()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Property Header Card
                  _buildPropertyHeaderCard(),
                  const SizedBox(height: 24),

                  // Financial Summary Cards
                  _buildFinancialSummaryCards(),
                  const SizedBox(height: 24),

                  // Tenant Information
                  _buildTenantInformation(),
                  const SizedBox(height: 24),

                  // Services & Utilities
                  _buildServicesAndUtilities(),
                  const SizedBox(height: 24),

                  // Maintenance & Repairs
                  _buildMaintenanceAndRepairs(),
                ],
              ),
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
            'Loading property details...',
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
              'Error Loading Details',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error,
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadPropertyDetails,
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

  Widget _buildErrorStateWithFallback() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Error banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.error.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.error.withOpacity(0.3)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Icon(Icons.error_outline_rounded, color: AppColors.error),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'API Error',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.error,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  _error,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _forceRefreshPropertyDetails,
                        icon: const Icon(Icons.refresh_rounded, size: 16),
                        label: const Text('Refresh'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: AppColors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _clearStuckLoadingState,
                        icon: const Icon(Icons.emergency_rounded, size: 16),
                        label: const Text('Show Basic Info'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.warning,
                          foregroundColor: AppColors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Show basic property info as fallback
          Text(
            'Basic Property Information (API Unavailable)',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 16),

          // Property Header Card
          _buildPropertyHeaderCard(),
          const SizedBox(height: 24),

          // Basic tenant info
          _buildTenantInformation(),
        ],
      ),
    );
  }

  Widget _buildPropertyHeaderCard() {
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
      child: Padding(
        padding: const EdgeInsets.all(20),
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
                        widget.property.propertyName,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        widget.property.propertyAddress,
                        style: TextStyle(
                          fontSize: 16,
                          color: AppColors.textSecondary,
                          height: 1.3,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
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
                          widget.property.unitType ?? 'UNIT',
                        ),
                        size: 18,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatPropertyType(widget.property.unitType ?? 'UNIT'),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Property Stats Row
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.success.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.success.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        Text(
                          '${widget.property.totalUnits}',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppColors.success,
                          ),
                        ),
                        Text(
                          'Total Units',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.warning.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        Text(
                          '${widget.property.occupiedUnits}',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppColors.warning,
                          ),
                        ),
                        Text(
                          'Occupied',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppColors.warning,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.primary.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        Text(
                          '${widget.property.occupancyRate.toStringAsFixed(0)}%',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                        Text(
                          'Occupancy',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFinancialSummaryCards() {
    // Get financial data from API response
    final financialData = _propertyDetails?['financial_summary'];

    // Always show the financial summary section, even if some values are zero
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Financial Summary',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            if (financialData != null &&
                financialData['last_updated'] != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Updated: ${_formatLastUpdated(financialData['last_updated'])}',
                  style: TextStyle(fontSize: 10, color: AppColors.success),
                ),
              ),
            ],
          ],
        ),

        // Financial Summary Cards
        LayoutBuilder(
          builder: (context, constraints) {
            // Responsive grid based on screen width
            final crossAxisCount = constraints.maxWidth > 600 ? 4 : 2;
            final childAspectRatio = constraints.maxWidth > 600 ? 2.5 : 2.0;

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: childAspectRatio,
              ),
              itemCount: 4,
              itemBuilder: (context, index) {
                return _buildResponsiveOverviewCard(
                  index,
                  financialData,
                  constraints.maxWidth,
                );
              },
            );
          },
        ),
      ],
    );
  }

  Widget _buildTenantInformation() {
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
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Current Tenants',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 16),

            if (widget.property.occupiedUnits > 0) ...[
              // Active Tenant
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
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Active Tenant',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.green[700],
                                ),
                              ),
                              if (widget.property.tenantName != null &&
                                  widget.property.tenantName!.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  widget.property.tenantName!,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Active',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Colors.green[700],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (widget.property.contractStart != null &&
                        widget.property.contractEnd != null) ...[
                      Row(
                        children: [
                          Icon(
                            Icons.calendar_today_rounded,
                            size: 16,
                            color: AppColors.textSecondary,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Lease: ${widget.property.contractStart} - ${widget.property.contractEnd}',
                              style: TextStyle(
                                fontSize: 14,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (widget.property.monthlyRent != null &&
                        widget.property.monthlyRent!.isNotEmpty) ...[
                      Row(
                        children: [
                          Icon(
                            Icons.attach_money_rounded,
                            size: 16,
                            color: AppColors.textSecondary,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Monthly Rent: ',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          Text(
                            widget.property.monthlyRent!,
                            style: TextStyle(
                              fontSize: 14,
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
                padding: const EdgeInsets.all(24),
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
                      size: 48,
                      color: AppColors.textSecondary,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No Active Tenant',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'This property is currently vacant',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildServicesAndUtilities() {
    // Get services data from API response
    final servicesData = _propertyDetails?['services_utilities'];

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
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Services & Utilities',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                if (servicesData != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppColors.primary.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      'Total: ${servicesData['total_monthly_cost'] ?? 'KES 0.00'}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),

            if (servicesData != null &&
                servicesData['active_services'] != null) ...[
              // Dynamic Service Items from API
              ...servicesData['active_services'].map<Widget>((service) {
                return Column(
                  children: [
                    _buildServiceItem(
                      service['name'] ?? 'Unknown Service',
                      service['monthly_cost'] ?? 'KES 0.00',
                      service['frequency'] ?? 'Monthly',
                      _getServiceIcon(service['type'] ?? ''),
                      _getServiceColor(service['type'] ?? ''),
                    ),
                    if (service != servicesData['active_services'].last)
                      const SizedBox(height: 12),
                  ],
                );
              }).toList(),
            ] else ...[
              // Fallback when no services data
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.border.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.border.withOpacity(0.2),
                    width: 1,
                  ),
                ),
                child: Center(
                  child: Text(
                    'No services data available',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMaintenanceAndRepairs() {
    // Get maintenance data from API response
    final maintenanceData = _propertyDetails?['maintenance'];

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
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Maintenance & Repairs',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 16),

            if (maintenanceData != null) ...[
              // Maintenance Summary
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
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
                          Text(
                            '${maintenanceData['open_requests'] ?? 0}',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: Colors.orange,
                            ),
                          ),
                          Text(
                            'Open Requests',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Colors.orange,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.green.withOpacity(0.2),
                          width: 1,
                        ),
                      ),
                      child: Column(
                        children: [
                          Text(
                            '${maintenanceData['resolved_count'] ?? 0}',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: Colors.green,
                            ),
                          ),
                          Text(
                            'Resolved',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Recent Maintenance Items
              if (maintenanceData['recent_items'] != null &&
                  maintenanceData['recent_items'].isNotEmpty) ...[
                ...maintenanceData['recent_items'].map<Widget>((item) {
                  return Column(
                    children: [
                      _buildMaintenanceItem(
                        item['title'] ?? 'Unknown Issue',
                        item['priority'] ?? 'Medium Priority',
                        _formatTimeAgo(item['created_at']),
                        _getMaintenanceIcon(item['title'] ?? ''),
                        _getPriorityColor(item['priority'] ?? ''),
                      ),
                      if (item != maintenanceData['recent_items'].last)
                        const SizedBox(height: 12),
                    ],
                  );
                }).toList(),
              ] else ...[
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.border.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.border.withOpacity(0.2),
                      width: 1,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      'No recent maintenance requests',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ] else ...[
              // Fallback when no maintenance data
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.border.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.border.withOpacity(0.2),
                    width: 1,
                  ),
                ),
                child: Center(
                  child: Text(
                    'Maintenance data not available',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildServiceItem(
    String title,
    String cost,
    String frequency,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2), width: 1),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  frequency,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Text(
            cost,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMaintenanceItem(
    String title,
    String priority,
    String timeAgo,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2), width: 1),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  timeAgo,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              priority,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
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
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: backgroundColor.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Icon(icon, size: 18, color: iconColor),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        value,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: TextStyle(fontSize: 10, color: AppColors.textSecondary),
            ),
          ],
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

  IconData _getServiceIcon(String serviceType) {
    switch (serviceType.toLowerCase()) {
      case 'water':
        return Icons.water_drop_rounded;
      case 'electricity':
        return Icons.electric_bolt_rounded;
      case 'cleaning':
        return Icons.cleaning_services_rounded;
      case 'security':
        return Icons.security_rounded;
      case 'internet':
        return Icons.wifi_rounded;
      case 'maintenance':
        return Icons.build_rounded;
      case 'parking':
        return Icons.local_parking_rounded;
      case 'gym':
        return Icons.fitness_center_rounded;
      case 'pool':
        return Icons.pool_rounded;
      default:
        return Icons.miscellaneous_services_rounded;
    }
  }

  Color _getServiceColor(String serviceType) {
    switch (serviceType.toLowerCase()) {
      case 'water':
        return Colors.blue;
      case 'electricity':
        return Colors.amber;
      case 'cleaning':
        return Colors.green;
      case 'security':
        return Colors.purple;
      case 'internet':
        return Colors.indigo;
      case 'maintenance':
        return Colors.orange;
      case 'parking':
        return Colors.teal;
      case 'gym':
        return Colors.red;
      case 'pool':
        return Colors.cyan;
      default:
        return Colors.grey;
    }
  }

  IconData _getMaintenanceIcon(String title) {
    final lowerTitle = title.toLowerCase();
    if (lowerTitle.contains('plumbing') || lowerTitle.contains('water')) {
      return Icons.plumbing_rounded;
    } else if (lowerTitle.contains('ac') ||
        lowerTitle.contains('air') ||
        lowerTitle.contains('cooling')) {
      return Icons.ac_unit_rounded;
    } else if (lowerTitle.contains('electrical') ||
        lowerTitle.contains('power')) {
      return Icons.electric_bolt_rounded;
    } else if (lowerTitle.contains('cleaning')) {
      return Icons.cleaning_services_rounded;
    } else if (lowerTitle.contains('security')) {
      return Icons.security_rounded;
    } else if (lowerTitle.contains('paint') || lowerTitle.contains('wall')) {
      return Icons.format_paint_rounded;
    } else if (lowerTitle.contains('roof') || lowerTitle.contains('ceiling')) {
      return Icons.roofing_rounded;
    } else if (lowerTitle.contains('door') || lowerTitle.contains('window')) {
      return Icons.door_front_door_rounded;
    } else {
      return Icons.build_rounded;
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'urgent':
        return Colors.red;
      case 'medium':
      case 'normal':
        return Colors.orange;
      case 'low':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _formatTimeAgo(String? isoDate) {
    if (isoDate == null) return 'Unknown time';

    try {
      final date = DateTime.parse(isoDate);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays > 0) {
        return '${difference.inDays} day${difference.inDays == 1 ? '' : 's'} ago';
      } else if (difference.inHours > 0) {
        return '${difference.inHours} hour${difference.inHours == 1 ? '' : 's'} ago';
      } else if (difference.inMinutes > 0) {
        return '${difference.inMinutes} minute${difference.inMinutes == 1 ? '' : 's'} ago';
      } else {
        return 'Just now';
      }
    } catch (e) {
      return 'Unknown time';
    }
  }

  String _formatLastUpdated(String? isoDate) {
    if (isoDate == null) return 'Unknown';

    try {
      final date = DateTime.parse(isoDate);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays > 0) {
        return '${difference.inDays}d ago';
      } else if (difference.inHours > 0) {
        return '${difference.inHours}h ago';
      } else if (difference.inMinutes > 0) {
        return '${difference.inMinutes}m ago';
      } else {
        return 'Just now';
      }
    } catch (e) {
      return 'Unknown';
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

  String _calculateNetIncome(Map<String, dynamic>? financialData) {
    if (financialData == null) return 'KES 0.00';

    try {
      // Extract numeric values from formatted strings like "KES 1,000.00"
      String collectedStr = financialData['total_collected'] ?? 'KES 0.00';
      String expensesStr = financialData['total_expenses'] ?? 'KES 0.00';

      // Remove "KES " prefix and parse numbers
      double collected =
          double.tryParse(
            collectedStr.replaceAll('KES ', '').replaceAll(',', ''),
          ) ??
          0.0;
      double expenses =
          double.tryParse(
            expensesStr.replaceAll('KES ', '').replaceAll(',', ''),
          ) ??
          0.0;

      double netIncome = collected - expenses;

      // Format back to currency string
      if (netIncome >= 0) {
        return 'KES ${netIncome.toStringAsFixed(2)}';
      } else {
        return 'KES (${netIncome.abs().toStringAsFixed(2)})';
      }
    } catch (e) {
      return 'KES 0.00';
    }
  }

  Widget _buildResponsiveOverviewCard(
    int index,
    Map<String, dynamic>? financialData,
    double screenWidth,
  ) {
    // Define card data based on index
    final cardData = [
      {
        'icon': Icons.attach_money_rounded,
        'title': 'Total Collected',
        'value': financialData?['total_collected'] ?? 'KES 0.00',
        'subtitle': 'All time from tenants',
        'backgroundColor': Colors.green.withOpacity(0.1),
        'iconColor': Colors.green[600]!,
      },
      {
        'icon': Icons.account_balance_wallet_rounded,
        'title': 'Total Expenses',
        'value': financialData?['total_expenses'] ?? 'KES 0.00',
        'subtitle': 'All time attached',
        'backgroundColor': Colors.red.withOpacity(0.1),
        'iconColor': Colors.red[600]!,
      },
      {
        'icon': Icons.account_balance_rounded,
        'title': 'Payouts Sent',
        'value': financialData?['payouts_sent'] ?? 'KES 0.00',
        'subtitle': 'Sent to owner',
        'backgroundColor': Colors.blue.withOpacity(0.1),
        'iconColor': Colors.blue[600]!,
      },
      {
        'icon': Icons.trending_up_rounded,
        'title': 'Net Income',
        'value': _calculateNetIncome(financialData),
        'subtitle': 'Collected - Expenses',
        'backgroundColor': Colors.purple.withOpacity(0.1),
        'iconColor': Colors.purple[600]!,
      },
    ];

    final data = cardData[index];

    // Responsive sizing based on screen width
    final isSmallScreen = screenWidth < 400;
    final isMediumScreen = screenWidth >= 400 && screenWidth < 600;
    final isLargeScreen = screenWidth >= 600;

    final iconSize = isSmallScreen
        ? 18.0
        : isMediumScreen
        ? 20.0
        : 22.0;
    final titleFontSize = isSmallScreen
        ? 12.0
        : isMediumScreen
        ? 14.0
        : 16.0;
    final valueFontSize = isSmallScreen
        ? 16.0
        : isMediumScreen
        ? 18.0
        : 20.0;
    final subtitleFontSize = isSmallScreen
        ? 11.0
        : isMediumScreen
        ? 12.0
        : 13.0;
    final padding = isSmallScreen
        ? 10.0
        : isMediumScreen
        ? 14.0
        : 18.0;

    return Container(
      decoration: BoxDecoration(
        color: data['backgroundColor'] as Color,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: (data['backgroundColor'] as Color).withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Padding(
        padding: EdgeInsets.all(padding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  padding: EdgeInsets.all(padding * 0.5),
                  decoration: BoxDecoration(
                    color: (data['backgroundColor'] as Color).withOpacity(0.5),
                    borderRadius: BorderRadius.circular(padding * 0.5),
                  ),
                  child: Icon(
                    data['icon'] as IconData,
                    size: iconSize,
                    color: data['iconColor'] as Color,
                  ),
                ),
                SizedBox(width: padding * 0.8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        data['title'] as String,
                        style: TextStyle(
                          fontSize: titleFontSize,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        data['value'] as String,
                        style: TextStyle(
                          fontSize: valueFontSize,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: padding * 0.3),
            Text(
              data['subtitle'] as String,
              style: TextStyle(
                fontSize: subtitleFontSize,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
