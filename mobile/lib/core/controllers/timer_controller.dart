import 'dart:async';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/toast_utils.dart';

class TimerController extends GetxController {
  static TimerController get instance => Get.find();

  // Observable states
  final _remainingSeconds = 0.obs;
  final _email = ''.obs;
  final _isTimerActive = false.obs;

  // Private properties
  Timer? _timer;
  static const String _keyRemainingSeconds = 'timer_remaining_seconds';
  static const String _keyEmail = 'timer_email';
  static const String _keyStartTimestamp = 'timer_start_timestamp';
  static const String _keyOriginalDuration = 'timer_original_duration';

  // Getters
  int get remainingSeconds => _remainingSeconds.value;
  String get email => _email.value;
  bool get isTimerActive => _isTimerActive.value;
  bool get canResend => !_isTimerActive.value || _remainingSeconds.value <= 0;

  // Format remaining time as MM:SS or SS
  String get formattedTime {
    if (_remainingSeconds.value <= 0) return '';

    final minutes = _remainingSeconds.value ~/ 60;
    final seconds = _remainingSeconds.value % 60;

    if (minutes > 0) {
      return '$minutes:${seconds.toString().padLeft(2, '0')}';
    } else {
      return '${seconds}s';
    }
  }

  // Get resend button text
  String get resendButtonText {
    if (_isTimerActive.value && _remainingSeconds.value > 0) {
      return 'Resend in $formattedTime';
    } else {
      return 'Resend OTP';
    }
  }

  @override
  void onInit() {
    super.onInit();
    _restoreTimerState();
  }

  @override
  void onClose() {
    _stopTimer();
    super.onClose();
  }

  /// Start countdown timer with given seconds and email
  void startTimer(int seconds, String emailAddress) {
    _stopTimer(); // Stop any existing timer

    _email.value = emailAddress;
    _remainingSeconds.value = seconds;
    _isTimerActive.value = true;
    update(); // Notify GetBuilder widgets

    // Persist state
    _persistTimerState(seconds);

    // Start countdown
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds.value > 0) {
        _remainingSeconds.value--;
        _persistCurrentState();
        update(); // Notify GetBuilder widgets
      } else {
        _onTimerExpired();
      }
    });
  }

  /// Reset timer with new duration (used for resend)
  void resetTimer(int newSeconds) {
    startTimer(newSeconds, _email.value);
    ToastUtils.showSuccess('OTP sent successfully');
  }

  /// Stop the timer
  void stopTimer() {
    _stopTimer();
    _clearPersistedState();
    update(); // Notify GetBuilder widgets
  }

  /// Clear timer state (used on successful login)
  void clearTimer() {
    _stopTimer();
    _email.value = '';
    _remainingSeconds.value = 0;
    _isTimerActive.value = false;
    _clearPersistedState();
    update(); // Notify GetBuilder widgets
  }

  // Private methods
  void _stopTimer() {
    _timer?.cancel();
    _timer = null;
    _isTimerActive.value = false;
  }

  void _onTimerExpired() {
    _stopTimer();
    _clearPersistedState();
    update(); // Notify GetBuilder widgets
  }

  /// Persist timer state to SharedPreferences
  Future<void> _persistTimerState(int originalDuration) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final currentTimestamp = DateTime.now().millisecondsSinceEpoch;

      await Future.wait([
        prefs.setInt(_keyRemainingSeconds, _remainingSeconds.value),
        prefs.setString(_keyEmail, _email.value),
        prefs.setInt(_keyStartTimestamp, currentTimestamp),
        prefs.setInt(_keyOriginalDuration, originalDuration),
      ]);

      } catch (e) {
      }
  }

  /// Persist current remaining seconds
  Future<void> _persistCurrentState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_keyRemainingSeconds, _remainingSeconds.value);
    } catch (e) {
      }
  }

  /// Restore timer state from SharedPreferences
  Future<void> _restoreTimerState() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      final storedEmail = prefs.getString(_keyEmail);
      final storedStartTimestamp = prefs.getInt(_keyStartTimestamp);
      final storedOriginalDuration = prefs.getInt(_keyOriginalDuration);

      if (storedEmail == null ||
          storedStartTimestamp == null ||
          storedOriginalDuration == null) {
        return;
      }

      // Calculate elapsed time
      final currentTimestamp = DateTime.now().millisecondsSinceEpoch;
      final elapsedSeconds = ((currentTimestamp - storedStartTimestamp) / 1000)
          .floor();
      final remainingSeconds = storedOriginalDuration - elapsedSeconds;

      if (remainingSeconds > 0) {
        _email.value = storedEmail;
        _remainingSeconds.value = remainingSeconds;
        _isTimerActive.value = true;
        update(); // Notify GetBuilder widgets

        // Continue countdown
        _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
          if (_remainingSeconds.value > 0) {
            _remainingSeconds.value--;
            _persistCurrentState();
            update(); // Notify GetBuilder widgets
          } else {
            _onTimerExpired();
          }
        });
      } else {
        _clearPersistedState();
      }
    } catch (e) {
      _clearPersistedState();
    }
  }

  /// Clear persisted timer state
  Future<void> _clearPersistedState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await Future.wait([
        prefs.remove(_keyRemainingSeconds),
        prefs.remove(_keyEmail),
        prefs.remove(_keyStartTimestamp),
        prefs.remove(_keyOriginalDuration),
      ]);
      } catch (e) {
      }
  }
}
