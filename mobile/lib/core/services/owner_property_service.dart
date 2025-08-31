import 'package:get/get.dart';
import '../constants/api_constants.dart';
import '../controllers/auth_controller.dart';
import '../models/owner_property_model.dart';
import '../services/api_service.dart';
import 'dart:convert'; // Added for jsonDecode
import 'dart:async'; // Added for TimeoutException

class OwnerPropertyService {
  final AuthController _authController = Get.find<AuthController>();
  final ApiService _apiService = Get.find<ApiService>();

  Future<Map<String, dynamic>> getProperties({
    int page = 1,
    int pageSize = 20,
    String? status,
    String? search,
  }) async {
    try {
      print('OwnerPropertyService: Starting getProperties call...');

      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        print('OwnerPropertyService: User not authenticated');
        return {'success': false, 'message': 'User not authenticated'};
      }

      print('OwnerPropertyService: Current user: ${currentUser.email}');
      print('OwnerPropertyService: Current user ID: ${currentUser.id}');

      // Use the correct backend endpoint structure with ApiConstants.baseUrl
      final endpoint = ApiConstants.ownerPropertiesEndpoint.replaceFirst(
        '{owner_id}',
        currentUser.id,
      );
      print('OwnerPropertyService: Making request to endpoint: $endpoint');
      print(
        'OwnerPropertyService: Query params: page=$page, pageSize=$pageSize, status=$status, search=$search',
      );

      // Use ApiService instead of GetConnect (same pattern as tenant service)
      final response = await _apiService.get(endpoint);

      print('OwnerPropertyService: Response status: ${response.statusCode}');
      print('OwnerPropertyService: Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        if (data['error'] == false) {
          // Handle the backend response structure: {"error": false, "data": {...}}
          final responseData = data['data'];
          if (responseData != null) {
            final List<dynamic> resultsData = responseData['results'] ?? [];
            print(
              'OwnerPropertyService: Found ${resultsData.length} result items',
            );

            // Extract properties from the nested structure
            final List<dynamic> propertiesData = [];
            for (final result in resultsData) {
              print('OwnerPropertyService: Processing result: ${result.keys}');
              if (result['properties'] != null) {
                final properties = result['properties'] as List<dynamic>;
                print(
                  'OwnerPropertyService: Found ${properties.length} properties in result',
                );
                propertiesData.addAll(properties);
              } else {
                print('OwnerPropertyService: No properties array in result');
              }
            }

            print(
              'OwnerPropertyService: Total properties found: ${propertiesData.length}',
            );
            print(
              'OwnerPropertyService: First property data: ${propertiesData.isNotEmpty ? propertiesData.first : 'No properties'}',
            );

            final properties = propertiesData
                .map((json) => OwnerProperty.fromJson(json))
                .toList();

            print(
              'OwnerPropertyService: Successfully parsed ${properties.length} properties',
            );
            return {
              'success': true,
              'data': properties,
              'total': properties.length,
              'page': page,
              'has_next':
                  false, // Backend doesn't support pagination for this endpoint
            };
          } else {
            print('OwnerPropertyService: No data in response');
            return {
              'success': false,
              'message': 'No data received from server',
            };
          }
        } else {
          print(
            'OwnerPropertyService: API returned error: ${data['message']}',
          );
          return {
            'success': false,
            'message': data['message'] ?? 'Failed to load properties',
          };
        }
      } else {
        print('OwnerPropertyService: HTTP error: ${response.statusCode}');
        return {
          'success': false,
          'message': 'Failed to load properties: ${response.statusCode}',
        };
      }
    } catch (e) {
      print('OwnerPropertyService: Exception occurred: $e');
      return {
        'success': false,
        'message': 'Error loading properties: ${e.toString()}',
      };
    }
  }

  Future<Map<String, dynamic>> getPropertyDetails(String propertyId) async {
    try {
      print(
        'OwnerPropertyService: Starting getPropertyDetails call for property: $propertyId',
      );

      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        print('OwnerPropertyService: User not authenticated');
        return {'success': false, 'message': 'User not authenticated'};
      }

      // Use the correct backend endpoint structure with ApiConstants.baseUrl
      final endpoint = ApiConstants.propertyDetailsEndpoint.replaceFirst(
        '{node_id}',
        propertyId,
      );
      print('OwnerPropertyService: Making request to: $endpoint');

      // Use ApiService instead of GetConnect (same pattern as tenant service)
      // Add shorter timeout to prevent long waits
      final response = await _apiService
          .get(endpoint)
          .timeout(
            const Duration(seconds: 15),
            onTimeout: () {
              throw TimeoutException('API request timed out after 15 seconds');
            },
          );

      print('OwnerPropertyService: Response status: ${response.statusCode}');
      print('OwnerPropertyService: Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        if (data['error'] == false) {
          // Handle the backend response structure: {"error": false, "data": {...}}
          final responseData = data['data'];
          if (responseData != null) {
            print(
              'OwnerPropertyService: Successfully loaded property details: ${responseData.keys}',
            );
            return {'success': true, 'data': responseData};
          } else {
            print('OwnerPropertyService: No data in response');
            return {
              'success': false,
              'message': 'No data received from server',
            };
          }
        } else {
          print(
            'OwnerPropertyService: API returned error: ${data['message']}',
          );
          return {
            'success': false,
            'message': data['message'] ?? 'Failed to load property details',
          };
        }
      } else {
        print('OwnerPropertyService: HTTP error: ${response.statusCode}');
        return {
          'success': false,
          'message': 'Failed to load property details: ${response.statusCode}',
        };
      }
    } catch (e) {
      print('OwnerPropertyService: Exception occurred: $e');
      return {
        'success': false,
        'message': 'Error loading property details: ${e.toString()}',
      };
    }
  }

  Future<Map<String, dynamic>> getPropertyStatistics() async {
    try {
      print('OwnerPropertyService: Starting getPropertyStatistics call...');

      final currentUser = _authController.currentUser;
      if (currentUser == null) {
        print('OwnerPropertyService: User not authenticated');
        return {'success': false, 'message': 'User not authenticated'};
      }

      // Use the correct backend endpoint structure with ApiConstants.baseUrl
      final endpoint = ApiConstants.ownerPropertiesEndpoint.replaceFirst(
        '{owner_id}',
        currentUser.id,
      );
      print('OwnerPropertyService: Making request to: $endpoint');

      // Use ApiService instead of GetConnect (same pattern as tenant service)
      final response = await _apiService.get(endpoint);

      print('OwnerPropertyService: Response status: ${response.statusCode}');
      print('OwnerPropertyService: Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        if (data['error'] == false) {
          // Handle the backend response structure: {"error": false, "data": {...}}
          final responseData = data['data'];
          if (responseData != null) {
            final List<dynamic> propertiesData = responseData['results'] ?? [];

            // Calculate statistics from the properties data
            final totalProperties = propertiesData.length;
            final activeProperties = propertiesData
                .where(
                  (prop) =>
                      prop['status']?.toString().toLowerCase() == 'active',
                )
                .length;
            final inactiveProperties = propertiesData
                .where(
                  (prop) =>
                      prop['status']?.toString().toLowerCase() == 'inactive',
                )
                .length;
            final maintenanceProperties = propertiesData
                .where(
                  (prop) =>
                      prop['status']?.toString().toLowerCase() == 'maintenance',
                )
                .length;

            final statistics = {
              'total_properties': totalProperties,
              'active_properties': activeProperties,
              'inactive_properties': inactiveProperties,
              'maintenance_properties': maintenanceProperties,
            };

            print(
              'OwnerPropertyService: Successfully calculated statistics: $statistics',
            );
            return {'success': true, 'data': statistics};
          } else {
            print('OwnerPropertyService: No data in response');
            return {
              'success': false,
              'message': 'No data received from server',
            };
          }
        } else {
          print(
            'OwnerPropertyService: API returned error: ${data['message']}',
          );
          return {
            'success': false,
            'message': data['message'] ?? 'Failed to load property statistics',
          };
        }
      } else {
        print('OwnerPropertyService: HTTP error: ${response.statusCode}');
        return {
          'success': false,
          'message':
              'Failed to load property statistics: ${response.statusCode}',
        };
      }
    } catch (e) {
      print('OwnerPropertyService: Exception occurred: $e');
      return {
        'success': false,
        'message': 'Error loading property statistics: ${e.toString()}',
      };
    }
  }
}
