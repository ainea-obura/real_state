import 'package:get/get.dart';
import '../controllers/auth_controller.dart';
import '../controllers/forgot_password_controller.dart';

class AuthBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AuthController>(() => AuthController());
    Get.lazyPut<ForgotPasswordController>(() => ForgotPasswordController());
  }
}
