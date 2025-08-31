import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/controllers/auth_controller.dart';
import '../../../core/controllers/timer_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../core/utils/toast_utils.dart';
import 'package:flutter/foundation.dart';

class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
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

  late String email;
  late String message;

  @override
  void initState() {
    super.initState();
    final args = Get.arguments as Map<String, dynamic>;
    email = args['email'] ?? '';
    message = args['message'] ?? 'Enter the OTP sent to your email';

    // Add listeners to all OTP controllers
    for (int i = 0; i < AppConstants.otpLength; i++) {
      _otpControllers[i].addListener(() {
        // Trigger button rebuild when any OTP field changes
        try {
          Get.find<AuthController>().update(['otp_button']);
        } catch (e) {
          // AuthController might not be available yet, use setState as fallback
          setState(() {});
        }
      });
    }
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
    final complete = otpCode.length == AppConstants.otpLength;
    return complete;
  }

  void _handleOtpChange(String value, int index) {
    if (value.isNotEmpty) {
      if (index < AppConstants.otpLength - 1) {
        _focusNodes[index + 1].requestFocus();
      } else {
        _focusNodes[index].unfocus();
        // Removed auto-submit - user must click "Verify Code" button
      }
    }

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
      // Focus last field
      _focusNodes[AppConstants.otpLength - 1].requestFocus();
    }
  }

  void _handleVerifyOtp() {
    if (isOtpComplete) {
      // Validate OTP format (6 digits only)
      final cleanOtpCode = otpCode.trim();
      if (cleanOtpCode.length != 6 ||
          !RegExp(r'^\d{6}$').hasMatch(cleanOtpCode)) {
        ToastUtils.showError('Please enter a valid 6-digit OTP');
        return;
      }

      AuthController.instance.verifyOtp(email, cleanOtpCode);
    } else {
      ToastUtils.showWarning('Please enter the complete 6-digit OTP');
    }
  }

  void _handleResendOtp() {
    AuthController.instance.resendOtp(email);
    // Clear OTP fields
    for (var controller in _otpControllers) {
      controller.clear();
    }
    _focusNodes[0].requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Verify OTP'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Get.back(),
        ),
      ),
      body: SafeArea(
        child: GetBuilder<AuthController>(
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
                          left: -1000,
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
                          children: [
                            // Add top spacing
                            SizedBox(
                              height: MediaQuery.of(context).size.height * 0.05,
                            ),
                            // Header
                            const Icon(
                              Icons.mark_email_read_outlined,
                              size: 64,
                              color: AppColors.primary,
                            ),
                            const SizedBox(height: 24),

                            const Text(
                              'Verification Code',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),

                            Text(
                              'Enter the 6-digit code sent to',
                              style: TextStyle(
                                fontSize: 16,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 4),

                            Text(
                              email,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(height: 32),

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

                            // Debug info (remove in production)
                            if (kDebugMode) ...[
                              Text(
                                'Debug: OTP="$otpCode" (${otpCode.length}/6) - Button enabled: $isOtpComplete',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],

                            // Verify Button
                            GetBuilder<AuthController>(
                              id: 'otp_button', // Use a specific ID for this builder
                              builder: (controller) {
                                return CustomButton(
                                  text: 'Verify Code',
                                  onPressed: !isOtpComplete
                                      ? null
                                      : _handleVerifyOtp,
                                  isLoading: controller.isLoading,
                                );
                              },
                            ),
                            const SizedBox(height: 16),

                            // Resend OTP with Timer
                            GetBuilder<TimerController>(
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
                        ), // Close Column
                      ], // Close Stack
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
