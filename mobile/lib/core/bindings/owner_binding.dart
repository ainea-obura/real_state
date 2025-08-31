import 'package:get/get.dart';
import '../controllers/owner_finance_controller.dart';
import '../services/owner_finance_service.dart';
import '../controllers/owner_property_controller.dart';
import '../services/owner_property_service.dart';
import '../controllers/owner_documents_controller.dart';
import '../services/owner_documents_service.dart';
import 'package:flutter/foundation.dart';

class OwnerBinding extends Bindings {
  @override
  void dependencies() {
    if (kDebugMode) {
      print('=== OwnerBinding: Starting dependency registration ===');
      print('Available services before registration: ${Get.keys}');
    }

    // Register owner finance controller and its dependencies
    Get.lazyPut<OwnerFinanceController>(() => OwnerFinanceController());
    if (kDebugMode) print('OwnerFinanceController registered');

    // Register owner finance service
    Get.lazyPut<OwnerFinanceService>(() => OwnerFinanceService());
    if (kDebugMode) print('OwnerFinanceService registered');

    // Register owner property controller and its dependencies
    Get.lazyPut<OwnerPropertyController>(() => OwnerPropertyController());
    if (kDebugMode) print('OwnerPropertyController registered');

    // Register owner property service
    Get.lazyPut<OwnerPropertyService>(() => OwnerPropertyService());
    if (kDebugMode) print('OwnerPropertyService registered');

    // Register owner documents controller and its dependencies
    Get.lazyPut<OwnerDocumentsController>(() => OwnerDocumentsController());
    if (kDebugMode) print('OwnerDocumentsController registered');

    // Register owner documents service
    Get.lazyPut<OwnerDocumentsService>(() => OwnerDocumentsService());
    if (kDebugMode) print('OwnerDocumentsService registered');

    if (kDebugMode) {
      print('=== OwnerBinding: Dependency registration completed ===');
      print('Available services after registration: ${Get.keys}');
    }
  }
}
