import 'dart:convert' as json;
import '../constants/api_constants.dart';
import '../models/tenant_property_model.dart';
import '../models/tenant_enhanced_data_model.dart';
import 'api_service.dart';

class TenantPropertyService {
  final ApiService _apiService;

  TenantPropertyService(this._apiService);

  Future<List<TenantProperty>> fetchTenantProperties(String tenantId) async {
    try {
      final endpoint = ApiConstants.tenantPropertiesEndpoint.replaceFirst(
        '{tenant_id}',
        tenantId,
      );

      final response = await _apiService.get(endpoint);

      // Handle the backend response format: {"error": false, "data": {...}}
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final jsonData = json.jsonDecode(response.body) as Map<String, dynamic>;

        if (jsonData['error'] == true || jsonData['data'] == null) {
          throw Exception(
            jsonData['message'] ?? 'Failed to fetch tenant properties',
          );
        }

        // Manually parse the API response to handle the structure
        final data = jsonData['data'] as Map<String, dynamic>;
        final results = data['results'] as List<dynamic>;

        final properties = <TenantProperty>[];

        for (final result in results) {
          try {
            final property = _parsePropertyFromApi(result);
            if (property != null) {
              properties.add(property);
            }
          } catch (e) {
            // Continue with other properties
          }
        }

        return properties;
      } else {
        throw Exception(
          'HTTP ${response.statusCode}: ${response.reasonPhrase}',
        );
      }
    } catch (e) {
      // If it's a 404 error, return empty list instead of throwing
      if (e.toString().contains('404')) {
        return [];
      }

      rethrow;
    }
  }

  TenantProperty? _parsePropertyFromApi(Map<String, dynamic> data) {
    try {
      final node = data['node'] as Map<String, dynamic>;
      final contractStart = data['contract_start'] as String;
      final contractEnd = data['contract_end'] as String?;
      final rentAmount = data['rent_amount']?.toString();
      final currency = data['currency']?.toString() ?? 'USD';

      // Determine status based on contract end date
      String status = 'active';
      if (contractEnd != null) {
        try {
          final endDate = DateTime.parse(contractEnd);
          final now = DateTime.now();
          final daysUntilExpiry = endDate.difference(now).inDays;

          if (daysUntilExpiry < 0) {
            status = 'expired';
          } else if (daysUntilExpiry <= 30) {
            status = 'expiring_soon';
          }
        } catch (e) {}
      }

      return TenantProperty(
        id: data['id'].toString(),
        unitName: node['name']?.toString() ?? 'Unknown Unit',
        propertyName:
            (node['parent'] as Map<String, dynamic>?)?['name']?.toString() ??
            node['name']?.toString() ??
            'Unknown Property',
        rentAmount: rentAmount ?? '',
        depositAmount: '', // Not provided by API
        currency: currency,
        contractStart: DateTime.parse(contractStart),
        contractEnd: contractEnd != null ? DateTime.parse(contractEnd) : null,
        status: status,
        unitType: node['node_type']?.toString(),
        floorNumber: data['floor']?.toString(),
        blockName: data['block']?.toString(),
        owner: data['owner'] != null ? OwnerInfo.fromJson(data['owner']) : null,
        agent: data['agent'] != null ? AgentInfo.fromJson(data['agent']) : null,
        image: data['image']?.toString(),
        financialSummary: data['financial_summary'] as Map<String, dynamic>?,
      );
    } catch (e) {
      return null;
    }
  }

  Future<List<TenantTransaction>> fetchTenantTransactions(
    String tenantId, {
    int limit = 5,
  }) async {
    try {
      final endpoint = ApiConstants.tenantTransactionsEndpoint.replaceFirst(
        '{tenant_id}',
        tenantId,
      );

      final response = await _apiService.get(endpoint);

      // Handle the backend response format
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final jsonData = json.jsonDecode(response.body) as Map<String, dynamic>;

        if (jsonData['error'] == true || jsonData['data'] == null) {
          throw Exception(
            jsonData['message'] ?? 'Failed to fetch tenant transactions',
          );
        }

        // Parse the nested data
        final transactionsResponse = TenantTransactionsResponse.fromJson(
          jsonData['data'],
        );

        // Return only the most recent transactions (limit)
        final recentTransactions = transactionsResponse.results
            .take(limit)
            .toList();

        return recentTransactions;
      } else {
        throw Exception(
          'HTTP ${response.statusCode}: ${response.reasonPhrase}',
        );
      }
    } catch (e) {
      // If it's a 404 error, return empty list instead of throwing
      if (e.toString().contains('404')) {
        return [];
      }

      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchTenantPropertiesWithEnhancedData(
    String tenantId,
  ) async {
    try {
      final endpoint = ApiConstants.tenantPropertiesEndpoint.replaceFirst(
        '{tenant_id}',
        tenantId,
      );

      final response = await _apiService.get(endpoint);

      // Handle the backend response format: {"error": false, "data": {...}}
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final jsonData = json.jsonDecode(response.body) as Map<String, dynamic>;

        if (jsonData['error'] == true || jsonData['data'] == null) {
          throw Exception(
            jsonData['message'] ?? 'Failed to fetch tenant properties',
          );
        }

        // Parse the API response
        final data = jsonData['data'] as Map<String, dynamic>;
        final results = data['results'] as List<dynamic>;
        final enhancedData = data['enhanced_data'] as Map<String, dynamic>?;

        // Parse properties
        final properties = <TenantProperty>[];
        for (final result in results) {
          try {
            final property = _parsePropertyFromApi(result);
            if (property != null) {
              properties.add(property);
            }
          } catch (e) {
            // Continue with other properties
          }
        }

        // Parse enhanced data
        TenantEnhancedData? enhancedDataParsed;
        if (enhancedData != null) {
          try {
            enhancedDataParsed = TenantEnhancedData.fromJson(enhancedData);
          } catch (e) {}
        }
        print("properties images: ${properties.map((p) => p.image).toList()}");
        return {'properties': properties, 'enhancedData': enhancedDataParsed};
      } else {
        throw Exception(
          'HTTP ${response.statusCode}: ${response.reasonPhrase}',
        );
      }
    } catch (e) {
      // If it's a 404 error, return empty data instead of throwing
      if (e.toString().contains('404')) {
        return {'properties': [], 'enhancedData': null};
      }

      rethrow;
    }
  }

  // Get default empty data for fallback
  List<TenantProperty> _getDefaultProperties() {
    return [];
  }

  List<TenantTransaction> _getDefaultTransactions() {
    return [];
  }
}
