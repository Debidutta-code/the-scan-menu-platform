import 'package:flutter/services.dart';
import 'package:audioplayers/audioplayers.dart';
import '../storage/secure_storage_service.dart';

class AlertService {
  static final AlertService _instance = AlertService._internal();
  factory AlertService() => _instance;

  final AudioPlayer _audioPlayer = AudioPlayer();

  AlertService._internal();

  Future<void> triggerWaiterCallAlert() async {
    final soundEnabled = await SecureStorageService.isSoundEnabled();
    final vibrationEnabled = await SecureStorageService.isVibrationEnabled();

    if (vibrationEnabled) {
      HapticFeedback.heavyImpact();
      Future.delayed(const Duration(milliseconds: 200), () {
        HapticFeedback.heavyImpact();
      });
    }

    if (soundEnabled) {
      try {
        // Play alert sound if asset available, otherwise system click sound
        await _audioPlayer.play(AssetSource('sounds/call_bell.mp3'));
      } catch (_) {
        SystemSound.play(SystemSoundType.click);
      }
    }
  }

  Future<void> triggerNewOrderAlert() async {
    final soundEnabled = await SecureStorageService.isSoundEnabled();
    final vibrationEnabled = await SecureStorageService.isVibrationEnabled();

    if (vibrationEnabled) {
      HapticFeedback.mediumImpact();
    }

    if (soundEnabled) {
      try {
        await _audioPlayer.play(AssetSource('sounds/order_alert.mp3'));
      } catch (_) {
        SystemSound.play(SystemSoundType.click);
      }
    }
  }
}
