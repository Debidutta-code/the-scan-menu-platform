import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import '../audio/alert_service.dart';
import '../constants/api_constants.dart';
import '../network/api_client.dart';
import '../storage/secure_storage_service.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {}
  debugPrint('[FCM Background] Handling background message: ${message.messageId} | Data: ${message.data}');
}

class PushNotificationService {
  static final PushNotificationService _instance = PushNotificationService._internal();
  factory PushNotificationService() => _instance;

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  bool _isInitialized = false;
  bool _firebaseAvailable = false;

  // In-memory cache to deduplicate foreground Socket.IO and FCM events
  final Map<String, DateTime> _handledEvents = {};

  static const String channelId = 'scanmenu_alerts_channel';
  static const String channelName = 'ScanMenu Floor Alerts';
  static const String channelDescription = 'High priority notifications for customer orders and captain calls';

  // Navigation / Action callback stream for notification taps
  final _notificationClickController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get onNotificationClick => _notificationClickController.stream;

  PushNotificationService._internal();

  /// Records an event as handled and returns true if it was already processed recently
  bool recordAndCheckDuplicate(String eventKey) {
    if (eventKey.isEmpty) return false;
    final now = DateTime.now();
    // Clean up entries older than 60 seconds
    _handledEvents.removeWhere((_, time) => now.difference(time).inSeconds > 60);

    if (_handledEvents.containsKey(eventKey)) {
      debugPrint('[PushNotificationService] Duplicate event detected and suppressed: $eventKey');
      return true;
    }
    _handledEvents[eventKey] = now;
    return false;
  }

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // 1. Initialize Firebase Core safely
      try {
        await Firebase.initializeApp();
        _firebaseAvailable = true;
        FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      } catch (fbErr) {
        debugPrint('[FCM Init Warning] Firebase Core initialization: $fbErr');
        _firebaseAvailable = false;
      }

      // 2. Initialize Flutter Local Notifications for heads-up alerts
      const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosInit = DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      );
      const initSettings = InitializationSettings(android: androidInit, iOS: iosInit);

      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          debugPrint('[LocalNotif Click] Payload: ${response.payload}');
          if (response.payload != null && response.payload!.isNotEmpty) {
            try {
              final decoded = jsonDecode(response.payload!);
              if (decoded is Map<String, dynamic>) {
                _notificationClickController.add(decoded);
                return;
              }
            } catch (_) {}
            _notificationClickController.add({'payload': response.payload});
          }
        },
      );

      // 3. Create Android High-Priority Notification Channel
      if (!kIsWeb && Platform.isAndroid) {
        final androidPlugin = _localNotifications
            .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
        if (androidPlugin != null) {
          const channel = AndroidNotificationChannel(
            channelId,
            channelName,
            description: channelDescription,
            importance: Importance.max,
            playSound: true,
            enableVibration: true,
            showBadge: true,
          );
          await androidPlugin.createNotificationChannel(channel);
        }
      }

      // 4. Setup FCM Listeners if Firebase is available
      if (_firebaseAvailable) {
        // Foreground message handler
        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          debugPrint('[FCM Foreground] Message received: ${message.notification?.title} | ${message.notification?.body}');
          _handleIncomingMessage(message);
        });

        // Background tap handler
        FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
          debugPrint('[FCM Opened App] User tapped notification: ${message.data}');
          _notificationClickController.add(message.data);
        });

        // Check if app was launched directly by tapping a notification from terminated state
        final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
        if (initialMessage != null) {
          debugPrint('[FCM Initial] App opened from terminated notification: ${initialMessage.data}');
          _notificationClickController.add(initialMessage.data);
        }

        // Fetch initial token if already permitted
        try {
          final token = await FirebaseMessaging.instance.getToken();
          if (token != null) {
            debugPrint('[FCM Initial Token] $token');
            await SecureStorageService.saveFcmToken(token);
            syncTokenWithServer(token: token);
          }
        } catch (tokErr) {
          debugPrint('[FCM Initial Token Warning] $tokErr');
        }

        // Listen for token refreshes
        FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
          debugPrint('[FCM Refresh] New token received: $newToken');
          SecureStorageService.saveFcmToken(newToken);
          syncTokenWithServer(token: newToken);
        });
      }

      _isInitialized = true;
      debugPrint('[PushNotificationService] Initialized successfully. Firebase available: $_firebaseAvailable');
    } catch (e) {
      debugPrint('[PushNotificationService] Initialization error: $e');
    }
  }

  void _handleIncomingMessage(RemoteMessage message) {
    final notification = message.notification;
    final data = message.data;
    final type = data['type']?.toString() ?? '';
    final eventId = data['orderId'] ?? data['callId'] ?? message.messageId ?? '';

    // Deduplicate against Socket.IO events already processed in foreground
    final dedupeKey = '${type}_$eventId';
    if (recordAndCheckDuplicate(dedupeKey)) {
      return;
    }

    // Play appropriate floor sound & haptics
    if (type == 'WAITER_CALL') {
      AlertService().triggerWaiterCallAlert();
    } else {
      AlertService().triggerNewOrderAlert();
    }

    // Display local high-priority notification banner
    final title = notification?.title ?? (type == 'WAITER_CALL' ? '🚨 Captain Call' : '🛎️ New Order');
    final body = notification?.body ?? 'New floor alert received';

    showLocalNotification(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      payload: jsonEncode(data),
    );
  }

  Future<void> showLocalNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    final soundEnabled = await SecureStorageService.isSoundEnabled();
    final vibrationEnabled = await SecureStorageService.isVibrationEnabled();

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDescription,
      importance: Importance.max,
      priority: Priority.max,
      playSound: soundEnabled,
      enableVibration: vibrationEnabled,
      channelShowBadge: true,
      ticker: title,
      styleInformation: BigTextStyleInformation(
        body,
        contentTitle: title,
        summaryText: 'ScanMenu Floor Alert',
      ),
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      id,
      title,
      body,
      notificationDetails,
      payload: payload,
    );
  }

  /// Request Notification Permission (Android 13+ and iOS)
  Future<bool> requestPermission() async {
    try {
      bool isGranted = false;

      // 1. Android 13+ POST_NOTIFICATIONS runtime permission check
      if (!kIsWeb && Platform.isAndroid) {
        final status = await Permission.notification.request();
        isGranted = status.isGranted;
      }

      // 2. Firebase Messaging permission check
      if (_firebaseAvailable) {
        final settings = await FirebaseMessaging.instance.requestPermission(
          alert: true,
          badge: true,
          sound: true,
          provisional: false,
        );
        isGranted = isGranted ||
            (settings.authorizationStatus == AuthorizationStatus.authorized ||
                settings.authorizationStatus == AuthorizationStatus.provisional);

        if (isGranted) {
          final token = await FirebaseMessaging.instance.getToken();
          if (token != null) {
            debugPrint('[FCM] Token retrieved: $token');
            await SecureStorageService.saveFcmToken(token);
            await syncTokenWithServer(token: token);
          }
        }
      }

      debugPrint('[PushNotificationService] Permission granted: $isGranted');
      return isGranted;
    } catch (e) {
      debugPrint('[PushNotificationService] Error requesting permission: $e');
      return false;
    }
  }

  /// Checks if notification permission is currently granted
  Future<bool> isPermissionGranted() async {
    try {
      if (!kIsWeb && Platform.isAndroid) {
        final status = await Permission.notification.status;
        return status.isGranted;
      }
      if (_firebaseAvailable) {
        final settings = await FirebaseMessaging.instance.getNotificationSettings();
        return settings.authorizationStatus == AuthorizationStatus.authorized;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Synchronizes device token with the backend server
  Future<void> syncTokenWithServer({String? token, String? restaurantId}) async {
    try {
      final fcmToken = token ?? await SecureStorageService.getFcmToken();
      if (fcmToken == null || fcmToken.isEmpty) return;

      final targetRestaurantId =
          restaurantId ?? await SecureStorageService.getActiveRestaurantId();
      if (targetRestaurantId == null || targetRestaurantId.isEmpty) return;

      final platformStr = Platform.isIOS ? 'ios' : 'android';

      await ApiClient().dio.post(
        ApiConstants.registerDeviceToken,
        data: {
          'token': fcmToken,
          'platform': platformStr,
          'restaurantId': targetRestaurantId,
        },
      );
      debugPrint('[PushNotificationService] Successfully synced token with backend for restaurant $targetRestaurantId');
    } catch (e) {
      debugPrint('[PushNotificationService] Failed to sync token with backend: $e');
    }
  }

  /// Unregisters device token on captain logout
  Future<void> unregisterToken() async {
    try {
      final fcmToken = await SecureStorageService.getFcmToken();
      if (fcmToken != null && fcmToken.isNotEmpty) {
        await ApiClient().dio.post(
          ApiConstants.unregisterDeviceToken,
          data: {'token': fcmToken},
        );
        debugPrint('[PushNotificationService] Successfully unregistered device token from backend');
      }
    } catch (e) {
      debugPrint('[PushNotificationService] Error unregistering token: $e');
    }
  }
}
