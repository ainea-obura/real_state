import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../utils/api_utils.dart';

class OwnerDashboardService {
  Future<Map<String, dynamic>> getOwnerDashboard() async {
    try {
      // Get current user ID from authentication
      final ownerId = await ApiUtils.getCurrentUserId();
      if (ownerId == null) {
        return {
          'error': true,
          'data': null,
          'message': 'User not authenticated',
        };
      }

      // Use the new comprehensive overview endpoint: /projects/owners/{ownerId}/overview
      final endpoint = ApiConstants.ownerOverviewEndpoint.replaceAll(
        '{ownerId}',
        ownerId,
      );
      final url = '${ApiConstants.baseUrl}$endpoint';
      print('OwnerDashboardService: Calling API: $url');

      // Get authentication headers
      final headers = await ApiUtils.getAuthHeaders();
      print('OwnerDashboardService: Using headers: ${headers.keys}');

      final response = await http.get(Uri.parse(url), headers: headers);

      print('OwnerDashboardService: Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('OwnerDashboardService: Successfully parsed response data');
        print('OwnerDashboardService: Response data structure: ${data.keys}');
        if (data['data'] != null) {
          print('OwnerDashboardService: Data keys: ${data['data'].keys}');
          if (data['data']['results'] != null) {
            print(
              'OwnerDashboardService: Results length: ${data['data']['results'].length}',
            );
          }
        }
        return {
          'error': false,
          'data': data,
          'message': 'Dashboard data loaded successfully',
        };
      } else {
        print('OwnerDashboardService: Error response: ${response.body}');
        return {
          'error': true,
          'data': null,
          'message': 'Failed to load dashboard data: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {'error': true, 'data': null, 'message': 'Error: ${e.toString()}'};
    }
  }
}
