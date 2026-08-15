import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';

enum SocketConnectionState { connecting, connected, disconnected }

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  io.Socket? _socket;
  final ValueNotifier<SocketConnectionState> connectionState =
      ValueNotifier(SocketConnectionState.disconnected);

  String? _currentRestaurantId;

  // Stream controllers for real-time events
  final _orderCreatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _orderStatusUpdatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _orderItemStatusUpdatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _waiterCallCreatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _waiterCallResolvedController = StreamController<Map<String, dynamic>>.broadcast();
  final _inventoryUpdatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _sessionUpdatedController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get onOrderCreated => _orderCreatedController.stream;
  Stream<Map<String, dynamic>> get onOrderStatusUpdated => _orderStatusUpdatedController.stream;
  Stream<Map<String, dynamic>> get onOrderItemStatusUpdated => _orderItemStatusUpdatedController.stream;
  Stream<Map<String, dynamic>> get onWaiterCallCreated => _waiterCallCreatedController.stream;
  Stream<Map<String, dynamic>> get onWaiterCallResolved => _waiterCallResolvedController.stream;
  Stream<Map<String, dynamic>> get onInventoryUpdated => _inventoryUpdatedController.stream;
  Stream<Map<String, dynamic>> get onSessionUpdated => _sessionUpdatedController.stream;

  SocketService._internal();

  Future<void> connect(String restaurantId) async {
    _currentRestaurantId = restaurantId;
    final token = await SecureStorageService.getAccessToken();
    final rawBaseUrl = await SecureStorageService.getBaseUrl() ?? ApiConstants.defaultBaseUrl;
    final baseUrl = rawBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');

    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
    }

    connectionState.value = SocketConnectionState.connecting;

    try {
      _socket = io.io(
        baseUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(1000)
            .setReconnectionDelayMax(5000)
            .setAuth({'token': 'Bearer $token'})
            .build(),
      );

      _socket!.onConnect((_) {
        debugPrint('Socket connected: ${_socket!.id}');
        connectionState.value = SocketConnectionState.connected;

        // Automatically join restaurant room
        _socket!.emit(ApiConstants.socketEventJoinRestaurant, {
          'restaurantId': _currentRestaurantId,
        });
      });

      _socket!.on(ApiConstants.socketEventJoinedRestaurant, (data) {
        debugPrint('Successfully joined restaurant socket room: $data');
      });

      _socket!.onDisconnect((_) {
        debugPrint('Socket disconnected');
        connectionState.value = SocketConnectionState.disconnected;
      });

      _socket!.onConnectError((err) {
        debugPrint('Socket connect error: $err');
        connectionState.value = SocketConnectionState.disconnected;
      });

      // Event listeners
      _socket!.on(ApiConstants.socketEventOrderCreated, (data) {
        if (data is Map) {
          _orderCreatedController.add(Map<String, dynamic>.from(data));
        }
      });

      _socket!.on(ApiConstants.socketEventOrderStatusUpdated, (data) {
        if (data is Map) {
          _orderStatusUpdatedController.add(Map<String, dynamic>.from(data));
        }
      });

      _socket!.on(ApiConstants.socketEventOrderItemStatusUpdated, (data) {
        if (data is Map) {
          _orderItemStatusUpdatedController.add(Map<String, dynamic>.from(data));
        }
      });

      _socket!.on(ApiConstants.socketEventWaiterCallCreated, (data) {
        if (data is Map) {
          _waiterCallCreatedController.add(Map<String, dynamic>.from(data));
        }
      });

      _socket!.on(ApiConstants.socketEventWaiterCallResolved, (data) {
        if (data is Map) {
          _waiterCallResolvedController.add(Map<String, dynamic>.from(data));
        }
      });

      _socket!.on(ApiConstants.socketEventInventoryUpdated, (data) {
        if (data is Map) {
          _inventoryUpdatedController.add(Map<String, dynamic>.from(data));
        }
      });

      _socket!.on(ApiConstants.socketEventSessionUpdated, (data) {
        if (data is Map) {
          _sessionUpdatedController.add(Map<String, dynamic>.from(data));
        }
      });

      _socket!.connect();
    } catch (e) {
      debugPrint('Failed to initialize socket: $e');
      connectionState.value = SocketConnectionState.disconnected;
    }
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    connectionState.value = SocketConnectionState.disconnected;
  }
}
