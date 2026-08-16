import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage();

  static const String _keyAccessToken = 'tsm_access_token';
  static const String _keyRefreshToken = 'tsm_refresh_token';
  static const String _keyActiveRestaurantId = 'tsm_active_restaurant_id';
  static const String _keyBaseUrl = 'tsm_api_base_url';
  static const String _keySoundEnabled = 'tsm_sound_enabled';
  static const String _keyVibrationEnabled = 'tsm_vibration_enabled';

  // Tokens
  static Future<void> saveTokens({required String accessToken, String? refreshToken}) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: _keyRefreshToken, value: refreshToken);
    }
  }

  static Future<String?> getAccessToken() async {
    return await _storage.read(key: _keyAccessToken);
  }

  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: _keyRefreshToken);
  }

  static Future<void> clearTokens() async {
    await _storage.delete(key: _keyAccessToken);
    await _storage.delete(key: _keyRefreshToken);
    await _storage.delete(key: _keyActiveRestaurantId);
  }

  // Active Restaurant ID
  static Future<void> saveActiveRestaurantId(String restaurantId) async {
    await _storage.write(key: _keyActiveRestaurantId, value: restaurantId);
  }

  static Future<String?> getActiveRestaurantId() async {
    return await _storage.read(key: _keyActiveRestaurantId);
  }

  // API Base URL (Configurable for local dev / staging / production)
  static Future<void> saveBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyBaseUrl, url);
  }

  static Future<String?> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_keyBaseUrl);
    // Auto-migrate legacy/deprecated URLs to the active Render service URL
    if (stored == null ||
        stored.trim().isEmpty ||
        stored.contains('the-scan-menu-platform.onrender.com') ||
        stored == 'https://the-scan-menu.onrender.com' ||
        stored == 'https://the-scan-menu.onrender.com/') {
      await prefs.setString(_keyBaseUrl, ApiConstants.defaultBaseUrl);
      return ApiConstants.defaultBaseUrl;
    }
    return stored;
  }

  static const String _keyUserProfile = 'tsm_user_profile';
  static const String _keyFcmToken = 'tsm_fcm_token';
  static const String _keyNotificationPromptDismissed = 'tsm_notif_prompt_dismissed';

  // User Profile Cache (For instant offline boot and smooth session persistence)
  static Future<void> saveUserProfile(String userJson) async {
    await _storage.write(key: _keyUserProfile, value: userJson);
  }

  static Future<String?> getUserProfile() async {
    return await _storage.read(key: _keyUserProfile);
  }

  static Future<void> clearUserProfile() async {
    await _storage.delete(key: _keyUserProfile);
  }

  // Push Notification FCM Token
  static Future<void> saveFcmToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyFcmToken, token);
  }

  static Future<String?> getFcmToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyFcmToken);
  }

  // Notification Permission Prompt state
  static Future<bool> isNotificationPromptDismissed() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyNotificationPromptDismissed) ?? false;
  }

  static Future<void> setNotificationPromptDismissed(bool dismissed) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyNotificationPromptDismissed, dismissed);
  }

  // Notification Preferences
  static Future<bool> isSoundEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keySoundEnabled) ?? true;
  }

  static Future<void> setSoundEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keySoundEnabled, enabled);
  }

  static Future<bool> isVibrationEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyVibrationEnabled) ?? true;
  }

  static Future<void> setVibrationEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyVibrationEnabled, enabled);
  }
}
