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
  debugPrint('[FCM Background] Message received ID: ${message.messageId} | Data: ${message.data}');
}

class PushNotificationService {
  static final PushNotificationService _instance = PushNotificationService._internal();
  factory PushNotificationService() => _instance;

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  bool _isInitialized = false;
  bool _firebaseAvailable = false;

  // In-memory cache to deduplicate foreground Socket.IO and FCM events
  final Map<String, DateTime> _handledEvents = {};

  static const String channelIdDefault = 'scanmenu_alerts_channel';
  static const String channelIdWaiterCalls = 'scanmenu_waiter_calls';
  static const String channelIdOrders = 'scanmenu_orders';

  // Navigation / Action callback stream for notification taps
  final _notificationClickController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get onNotificationClick => _notificationClickController.stream;

  // Cached initial launch payload for cold-start navigation
  Map<String, dynamic>? _initialPayload;

  PushNotificationService._internal();

  /// Consumes and clears the cold-start launch payload (if any)
  Map<String, dynamic>? consumeInitialPayload() {
    final payload = _initialPayload;
    if (payload != null) {
      debugPrint('[PushNotificationService] Consuming cold-start payload: $payload');
      _initialPayload = null;
    }
    return payload;
  }

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
        debugPrint('[PushNotificationService] Firebase Core initialized successfully.');
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
          debugPrint('[LocalNotif Click] Notification tapped with payload: ${response.payload}');
          if (response.payload != null && response.payload!.isNotEmpty) {
            try {
              final decoded = jsonDecode(response.payload!);
              if (decoded is Map<String, dynamic>) {
                _initialPayload = decoded;
                _notificationClickController.add(decoded);
                return;
              }
            } catch (_) {}
            final wrap = {'payload': response.payload};
            _initialPayload = wrap;
            _notificationClickController.add(wrap);
          }
        },
      );

      // Check if local notification caused cold start
      final launchDetails = await _localNotifications.getNotificationAppLaunchDetails();
      if (launchDetails != null &&
          launchDetails.didNotificationLaunchApp &&
          launchDetails.notificationResponse?.payload != null) {
        try {
          final decoded = jsonDecode(launchDetails.notificationResponse!.payload!);
          if (decoded is Map<String, dynamic>) {
            _initialPayload = decoded;
            debugPrint('[LocalNotif Cold Start] Initial payload captured: $_initialPayload');
          }
        } catch (_) {}
      }

      // 3. Create Android High-Priority Notification Channels with custom sounds
      if (!kIsWeb && Platform.isAndroid) {
        final androidPlugin = _localNotifications
            .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
        if (androidPlugin != null) {
          // Waiter Calls channel
          const waiterChannel = AndroidNotificationChannel(
            channelIdWaiterCalls,
            'ScanMenu Waiter Calls',
            description: 'High priority alerts for guest assistance and bill requests',
            importance: Importance.max,
            playSound: true,
            sound: RawResourceAndroidNotificationSound('call_bell'),
            enableVibration: true,
            showBadge: true,
          );

          // Orders channel
          const orderChannel = AndroidNotificationChannel(
            channelIdOrders,
            'ScanMenu Orders',
            description: 'High priority alerts for new customer orders',
            importance: Importance.max,
            playSound: true,
            sound: RawResourceAndroidNotificationSound('order_alert'),
            enableVibration: true,
            showBadge: true,
          );

          // Default floor alerts fallback channel
          const defaultChannel = AndroidNotificationChannel(
            channelIdDefault,
            'ScanMenu Floor Alerts',
            description: 'High priority notifications for floor events',
            importance: Importance.max,
            playSound: true,
            sound: RawResourceAndroidNotificationSound('call_bell'),
            enableVibration: true,
            showBadge: true,
          );

          await androidPlugin.createNotificationChannel(waiterChannel);
          await androidPlugin.createNotificationChannel(orderChannel);
          await androidPlugin.createNotificationChannel(defaultChannel);
          debugPrint('[PushNotificationService] Created Android notification channels with custom sounds.');
        }
      }

      // 4. Setup FCM Listeners if Firebase is available
      if (_firebaseAvailable) {
        // Foreground message handler
        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          debugPrint('[FCM Foreground] Message received -> Title: "${message.notification?.title}" | Data: ${message.data}');
          _handleIncomingMessage(message);
        });

        // Background tap handler (when app was in background)
        FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
          debugPrint('[FCM Opened App] User tapped background notification: ${message.data}');
          _initialPayload = message.data;
          _notificationClickController.add(message.data);
        });

        // Cold Start handler (when app was completely terminated)
        final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
        if (initialMessage != null) {
          debugPrint('[FCM Initial/Cold Start] App launched from terminated notification: ${initialMessage.data}');
          _initialPayload = initialMessage.data;
          _notificationClickController.add(initialMessage.data);
        }

        // Fetch initial token
        try {
          final token = await FirebaseMessaging.instance.getToken();
          if (token != null) {
            debugPrint('[FCM Token] Initial token retrieved: ${token.substring(0, 15)}...');
            await SecureStorageService.saveFcmToken(token);
            syncTokenWithServer(token: token);
          }
        } catch (tokErr) {
          debugPrint('[FCM Token Warning] Failed to fetch initial token: $tokErr');
        }

        // Listen for token refreshes
        FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
          debugPrint('[FCM Token Refresh] New token received: ${newToken.substring(0, 15)}...');
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
    final type = (data['type'] ?? '').toString().toUpperCase();
    final eventId = data['orderId'] ?? data['callId'] ?? message.messageId ?? '';

    // Deduplicate against Socket.IO events already processed in foreground
    final dedupeKey = '${type}_$eventId';
    if (recordAndCheckDuplicate(dedupeKey)) {
      debugPrint('[PushNotificationService] Suppressing duplicate foreground FCM alert for: $dedupeKey');
      return;
    }

    // Play appropriate floor sound & haptics
    if (type == 'WAITER_CALL' || type == 'CALL') {
      AlertService().triggerWaiterCallAlert();
    } else {
      AlertService().triggerNewOrderAlert();
    }

    // Display local high-priority notification banner
    final title = notification?.title ?? (type == 'WAITER_CALL' || type == 'CALL' ? '🚨 Captain Call' : '🛎️ New Order');
    final body = notification?.body ?? 'New floor alert received';

    final targetChannel = (type == 'WAITER_CALL' || type == 'CALL') ? channelIdWaiterCalls : channelIdOrders;
    final targetSound = (type == 'WAITER_CALL' || type == 'CALL') ? 'call_bell' : 'order_alert';

    showLocalNotification(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      payload: jsonEncode(data),
      channelId: targetChannel,
      soundName: targetSound,
    );
  }

  Future<void> showLocalNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
    String channelId = channelIdDefault,
    String soundName = 'call_bell',
  }) async {
    final soundEnabled = await SecureStorageService.isSoundEnabled();
    final vibrationEnabled = await SecureStorageService.isVibrationEnabled();

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelId == channelIdWaiterCalls
          ? 'ScanMenu Waiter Calls'
          : channelId == channelIdOrders
              ? 'ScanMenu Orders'
              : 'ScanMenu Floor Alerts',
      channelDescription: 'High priority real-time alerts for staff',
      importance: Importance.max,
      priority: Priority.max,
      playSound: soundEnabled,
      sound: soundEnabled ? RawResourceAndroidNotificationSound(soundName) : null,
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
            debugPrint('[FCM] Token retrieved after permission: ${token.substring(0, 15)}...');
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

      debugPrint('[PushNotificationService] Syncing token with backend for restaurant $targetRestaurantId (platform: $platformStr)...');
      final res = await ApiClient().dio.post(
        ApiConstants.registerDeviceToken,
        data: {
          'token': fcmToken,
          'platform': platformStr,
          'restaurantId': targetRestaurantId,
        },
      );
      debugPrint('[PushNotificationService] Token synced successfully. Response: ${res.data['message']}');
    } catch (e) {
      debugPrint('[PushNotificationService] Failed to sync token with backend: $e');
    }
  }

  /// Unregisters device token on captain logout
  Future<void> unregisterToken() async {
    try {
      final fcmToken = await SecureStorageService.getFcmToken();
      if (fcmToken != null && fcmToken.isNotEmpty) {
        debugPrint('[PushNotificationService] Unregistering device token from backend...');
        await ApiClient().dio.post(
          ApiConstants.unregisterDeviceToken,
          data: {'token': fcmToken},
        );
        debugPrint('[PushNotificationService] Successfully unregistered device token from backend.');
      }
    } catch (e) {
      debugPrint('[PushNotificationService] Error unregistering token: $e');
    }
  }
}

