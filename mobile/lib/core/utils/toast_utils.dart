import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../theme/app_colors.dart';

enum ToastType { success, error, warning, info }

class ToastUtils {
  static void showToast({
    required String message,
    ToastType type = ToastType.info,
    Duration duration = const Duration(seconds: 3),
  }) {
    print('ToastUtils: showToast called with message: $message, type: $type');
    Color backgroundColor;
    Color textColor;
    IconData icon;

    switch (type) {
      case ToastType.success:
        backgroundColor = AppColors.success;
        textColor = AppColors.white;
        icon = Icons.check_circle_outline;
        break;
      case ToastType.error:
        backgroundColor = AppColors.error;
        textColor = AppColors.white;
        icon = Icons.error_outline;
        break;
      case ToastType.warning:
        backgroundColor = AppColors.warning;
        textColor = AppColors.textPrimary;
        icon = Icons.warning_amber_outlined;
        break;
      case ToastType.info:
        backgroundColor = AppColors.info;
        textColor = AppColors.white;
        icon = Icons.info_outline;
        break;
    }

    print('ToastUtils: Calling Get.rawSnackbar with message: $message');
    Get.rawSnackbar(
      title: null,
      message: null,
      messageText: Row(
        children: [
          Icon(icon, color: textColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: textColor,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
      backgroundColor: backgroundColor,
      borderRadius: 12,
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      snackPosition: SnackPosition.TOP,
      duration: duration,
      isDismissible: true,
      dismissDirection: DismissDirection.horizontal,
      forwardAnimationCurve: Curves.easeOutBack,
      reverseAnimationCurve: Curves.easeInBack,
      animationDuration: const Duration(milliseconds: 300),
      boxShadows: [
        BoxShadow(
          color: backgroundColor.withOpacity(0.3),
          blurRadius: 8,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  // Convenience methods
  static void showSuccess(String message) {
    print('ToastUtils: showSuccess called with message: $message');
    showToast(message: message, type: ToastType.success);
  }

  static void showError(String message) {
    print('ToastUtils: showError called with message: $message');
    showToast(message: message, type: ToastType.error);
  }

  static void showWarning(String message) {
    showToast(message: message, type: ToastType.warning);
  }

  static void showInfo(String message) {
    showToast(message: message, type: ToastType.info);
  }
}
