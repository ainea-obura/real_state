class OwnerProperty {
  final String id;
  final String propertyName;
  final String propertyAddress;
  final String? unitName;
  final String? unitType;
  final String? floorNumber;
  final String? blockName;
  final String status; // active, inactive, maintenance, sold
  final String? image;
  final int totalUnits;
  final int occupiedUnits;
  final int vacantUnits;
  final String? totalValue;
  final String? monthlyRent;
  final String? currency;
  final DateTime? lastMaintenance;
  final DateTime? nextMaintenance;

  // Tenant information
  final String? tenantName;
  final String? tenantId;
  final String? contractStart;
  final String? contractEnd;

  const OwnerProperty({
    required this.id,
    required this.propertyName,
    required this.propertyAddress,
    this.unitName,
    this.unitType,
    this.floorNumber,
    this.blockName,
    required this.status,
    this.image,
    required this.totalUnits,
    required this.occupiedUnits,
    required this.vacantUnits,
    this.totalValue,
    this.monthlyRent,
    this.currency,
    this.lastMaintenance,
    this.nextMaintenance,
    this.tenantName,
    this.tenantId,
    this.contractStart,
    this.contractEnd,
  });

  factory OwnerProperty.fromJson(Map<String, dynamic> json) {
    // Handle the actual backend response structure
    return OwnerProperty(
      id: json['id']?.toString() ?? '',
      propertyName: json['name']?.toString() ?? '', // Backend sends 'name'
      propertyAddress:
          json['property_node']?.toString() ??
          '', // Backend sends 'property_node'
      unitName:
          json['name']?.toString() ?? '', // Unit name is the same as 'name'
      unitType:
          json['node_type']?.toString() ?? 'UNIT', // Backend sends 'node_type'
      floorNumber:
          json['parent']?.toString() ??
          '', // Backend sends 'parent' (e.g., "Floor 1")
      blockName:
          json['property_node']?.toString() ??
          '', // Extract block from property_node
      status: 'active', // Default status since backend doesn't provide it
      image: null, // Backend doesn't provide image
      totalUnits: 1, // Default since backend doesn't provide unit counts
      occupiedUnits: json['current_tenant'] != null
          ? 1
          : 0, // 1 if has tenant, 0 if not
      vacantUnits: json['current_tenant'] != null
          ? 0
          : 1, // Opposite of occupied
      totalValue: null, // Backend doesn't provide this
      monthlyRent:
          json['current_tenant']?['rent_amount']?.toString() ??
          '', // From current_tenant
      currency: 'KES', // Default currency
      lastMaintenance: null, // Backend doesn't provide this
      nextMaintenance: null, // Backend doesn't provide this
      tenantName: json['current_tenant']?['name']?.toString(),
      tenantId: json['current_tenant']?['id']?.toString(),
      contractStart: json['current_tenant']?['contract_start']?.toString(),
      contractEnd: json['current_tenant']?['contract_end']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'property_name': propertyName,
      'property_address': propertyAddress,
      'unit_name': unitName,
      'unit_type': unitType,
      'floor_number': floorNumber,
      'block_name': blockName,
      'status': status,
      'image': image,
      'total_units': totalUnits,
      'occupied_units': occupiedUnits,
      'vacant_units': vacantUnits,
      'total_value': totalValue,
      'monthly_rent': monthlyRent,
      'currency': currency,
      'last_maintenance': lastMaintenance?.toIso8601String(),
      'next_maintenance': nextMaintenance?.toIso8601String(),
      'tenant_name': tenantName,
      'tenant_id': tenantId,
      'contract_start': contractStart,
      'contract_end': contractEnd,
    };
  }

  // Helper getters
  String get displayName {
    if (unitName != null && unitName!.isNotEmpty) {
      return '$propertyName - $unitName';
    }
    return propertyName;
  }

  String get fullAddress {
    List<String> parts = [];
    if (unitName != null && unitName!.isNotEmpty) parts.add(unitName!);
    if (floorNumber != null) parts.add('Floor $floorNumber');
    if (blockName != null) parts.add('Block $blockName');
    parts.add(propertyAddress);
    return parts.join(', ');
  }

  String get occupancyStatus {
    if (totalUnits == 0) return 'No Units';
    if (vacantUnits == 0) return 'Fully Occupied';
    if (occupiedUnits == 0) return 'Fully Vacant';
    return 'Partially Occupied';
  }

  double get occupancyRate {
    if (totalUnits == 0) return 0.0;
    return (occupiedUnits / totalUnits) * 100;
  }

  bool get isActive => status.toLowerCase() == 'active';
  bool get isInactive => status.toLowerCase() == 'inactive';
  bool get isUnderMaintenance => status.toLowerCase() == 'maintenance';
  bool get isSold => status.toLowerCase() == 'sold';

  String get statusDisplay {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'maintenance':
        return 'Under Maintenance';
      case 'sold':
        return 'Sold';
      default:
        return status;
    }
  }

  // Safe getters for nullable fields
  String get safeTotalValue => totalValue ?? 'N/A';
  String get safeMonthlyRent => monthlyRent ?? 'N/A';
  String get safeCurrency => currency ?? 'USD';
  String get safeUnitType => unitType ?? 'UNIT';
}

class OwnerPropertiesResponse {
  final List<OwnerProperty> properties;
  final int total;
  final int page;
  final bool hasNext;

  const OwnerPropertiesResponse({
    required this.properties,
    required this.total,
    required this.page,
    required this.hasNext,
  });

  factory OwnerPropertiesResponse.fromJson(Map<String, dynamic> json) {
    final List<dynamic> propertiesData = json['data'] ?? [];
    final properties = propertiesData
        .map((propertyJson) => OwnerProperty.fromJson(propertyJson))
        .toList();

    return OwnerPropertiesResponse(
      properties: properties,
      total: json['total'] ?? 0,
      page: json['page'] ?? 1,
      hasNext: json['has_next'] ?? false,
    );
  }
}
