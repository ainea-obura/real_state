import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/controllers/forgot_password_controller.dart';
import '../../../core/controllers/timer_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/custom_button.dart';

class ForgotPasswordOtpScreen extends StatefulWidget {
  const ForgotPasswordOtpScreen({super.key});

  @override
  State<ForgotPasswordOtpScreen> createState() =>
      _ForgotPasswordOtpScreenState();
}

class _ForgotPasswordOtpScreenState extends State<ForgotPasswordOtpScreen> {
  final List<TextEditingController> _otpControllers = List.generate(
    AppConstants.otpLength,
    (index) => TextEditingController(),
  );
  final List<FocusNode> _focusNodes = List.generate(
    AppConstants.otpLength,
    (index) => FocusNode(),
  );

  // Hidden field for iOS autofill support
  final TextEditingController _hiddenController = TextEditingController();
  final FocusNode _hiddenFocusNode = FocusNode();

  String get email => Get.arguments?['email'] ?? '';

  @override
  void initState() {
    super.initState();

    // Setup hidden field for iOS autofill
    _hiddenController.addListener(() {
      final value = _hiddenController.text;
      if (value.length >= AppConstants.otpLength) {
        _handleFullOtp(value);
      }
    });
  }

  @override
  void dispose() {
    for (var controller in _otpControllers) {
      controller.dispose();
    }
    for (var focusNode in _focusNodes) {
      focusNode.dispose();
    }
    _hiddenController.dispose();
    _hiddenFocusNode.dispose();
    super.dispose();
  }

  String get otpCode {
    return _otpControllers.map((controller) => controller.text).join();
  }

  bool get isOtpComplete {
    return otpCode.length == AppConstants.otpLength;
  }

  void _handleOtpChange(String value, int index) {
    if (value.isNotEmpty && index < AppConstants.otpLength - 1) {
      _focusNodes[index + 1].requestFocus();
    }
    setState(() {});
  }

  void _handleBackspace(String value, int index) {
    if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
  }

  // Handle full OTP string from autofill (iOS)
  void _handleFullOtp(String fullOtp) {
    if (fullOtp.length >= AppConstants.otpLength) {
      final digits = fullOtp.substring(0, AppConstants.otpLength).split('');
      for (int i = 0; i < AppConstants.otpLength; i++) {
        _otpControllers[i].text = digits[i];
      }
      setState(() {});
      // Focus last field
      _focusNodes[AppConstants.otpLength - 1].requestFocus();
    }
  }

  void _handleVerifyOtp() {
    final otp = otpCode;

    // Client-side validation
    if (otp.length != AppConstants.otpLength) {
      return; // Button should be disabled, but just in case
    }

    if (!RegExp(r'^\d+$').hasMatch(otp)) {
      return;
    }

    final controller = Get.find<ForgotPasswordController>();
    controller.verifyPasswordResetOtp(email, otp);
  }

  void _handleResendOtp() {
    final controller = Get.find<ForgotPasswordController>();
    controller.resendPasswordResetOtp(email);
  }

  @override
  Widget build(BuildContext context) {
    if (email.isEmpty) {
      // Invalid access, redirect to forgot password
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Get.offAllNamed('/forgot-password');
      });
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: GetBuilder<ForgotPasswordController>(
          builder: (controller) {
            return Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppConstants.defaultPadding),
                    child: Stack(
                      children: [
                        // Hidden field for iOS autofill support
                        Positioned(
                          left: -1000, // Position off-screen
                          child: SizedBox(
                            width: 1,
                            height: 1,
                            child: TextField(
                              controller: _hiddenController,
                              focusNode: _hiddenFocusNode,
                              autofillHints: const [AutofillHints.oneTimeCode],
                              keyboardType: TextInputType.number,
                              textInputAction: TextInputAction.done,
                              style: const TextStyle(color: Colors.transparent),
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                              ),
                              onChanged: (value) {
                                if (value.length >= AppConstants.otpLength) {
                                  _handleFullOtp(value);
                                }
                              },
                            ),
                          ),
                        ),

                        // Main content
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header
                            const SizedBox(height: 40),
                            IconButton(
                              onPressed: () => Get.back(),
                              icon: const Icon(Icons.arrow_back),
                              padding: EdgeInsets.zero,
                              alignment: Alignment.centerLeft,
                            ),
                            const SizedBox(height: 24),

                            const Text(
                              'Enter Verification Code',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),

                            Text(
                              'We\'ve sent a 6-digit verification code to $email',
                              style: const TextStyle(
                                fontSize: 16,
                                color: AppColors.textSecondary,
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 40),

                            // OTP Input Fields
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: List.generate(
                                AppConstants.otpLength,
                                (index) => SizedBox(
                                  width: 45,
                                  height: 55,
                                  child: TextFormField(
                                    controller: _otpControllers[index],
                                    focusNode: _focusNodes[index],
                                    keyboardType: TextInputType.number,
                                    textAlign: TextAlign.center,
                                    maxLength: 1,
                                    enabled: !controller.isLoading,
                                    style: const TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    inputFormatters: [
                                      FilteringTextInputFormatter.digitsOnly,
                                    ],
                                    decoration: InputDecoration(
                                      counterText: '',
                                      filled: true,
                                      fillColor: AppColors.white,
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(
                                          color: AppColors.border,
                                        ),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(
                                          color: AppColors.primary,
                                          width: 2,
                                        ),
                                      ),
                                    ),
                                    onChanged: (value) {
                                      _handleOtpChange(value, index);
                                      if (value.isEmpty) {
                                        _handleBackspace(value, index);
                                      }
                                    },
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),

                            // Verify Button
                            CustomButton(
                              text: 'Verify Code',
                              onPressed:
                                  (controller.isLoading || !isOtpComplete)
                                  ? null
                                  : _handleVerifyOtp,
                              isLoading: controller.isLoading,
                            ),
                            const SizedBox(height: 16),

                            // Resend OTP with Timer
                            GetBuilder<TimerController>(
                              init: TimerController.instance,
                              builder: (timerController) {
                                final isDisabled =
                                    controller.isLoading ||
                                    !timerController.canResend;

                                return TextButton(
                                  onPressed: isDisabled
                                      ? null
                                      : _handleResendOtp,
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (controller.isLoading &&
                                          timerController.canResend) ...[
                                        const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            valueColor:
                                                AlwaysStoppedAnimation<Color>(
                                                  AppColors.primary,
                                                ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                      ],
                                      Text(
                                        timerController.canResend
                                            ? (controller.isLoading
                                                  ? 'Sending...'
                                                  : 'Didn\'t receive the code? Resend')
                                            : 'Resend in ${timerController.formattedTime}',
                                        style: TextStyle(
                                          color: isDisabled
                                              ? AppColors.textSecondary
                                              : AppColors.primary,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),

                            // Add bottom spacing for smaller screens
                            SizedBox(
                              height: MediaQuery.of(context).size.height * 0.05,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
