import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/audio/alert_service.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/notifications/push_notification_service.dart';
import '../../../core/sockets/socket_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/waiter_call_model.dart';

class WaiterCallsState {
  final bool isLoading;
  final List<WaiterCallModel> calls;
  final Set<String> pendingActionCallIds;
  final String? errorMessage;

  WaiterCallsState({
    required this.isLoading,
    required this.calls,
    this.pendingActionCallIds = const {},
    this.errorMessage,
  });

  factory WaiterCallsState.initial() => WaiterCallsState(
        isLoading: true,
        calls: [],
      );

  List<WaiterCallModel> get activeCalls => calls
      .where((c) =>
          c.status == WaiterCallStatus.pending ||
          c.status == WaiterCallStatus.acknowledged)
      .toList();

  int get pendingCount =>
      calls.where((c) => c.status == WaiterCallStatus.pending).length;

  WaiterCallsState copyWith({
    bool? isLoading,
    List<WaiterCallModel>? calls,
    Set<String>? pendingActionCallIds,
    String? errorMessage,
  }) {
    return WaiterCallsState(
      isLoading: isLoading ?? this.isLoading,
      calls: calls ?? this.calls,
      pendingActionCallIds: pendingActionCallIds ?? this.pendingActionCallIds,
      errorMessage: errorMessage,
    );
  }
}

class WaiterCallsNotifier extends StateNotifier<WaiterCallsState> {
  final ApiClient _apiClient = ApiClient();
  final SocketService _socketService = SocketService();
  final AlertService _alertService = AlertService();
  final String? _restaurantId;

  WaiterCallsNotifier(this._restaurantId) : super(WaiterCallsState.initial()) {
    if (_restaurantId != null) {
      fetchWaiterCalls();
      _setupSocketSubscriptions();
    } else {
      state = state.copyWith(isLoading: false);
    }
  }

  void _setupSocketSubscriptions() {
    _socketService.onWaiterCallCreated.listen((data) {
      final callId = (data['_id'] ?? data['id'] ?? data['callId'] ?? '').toString();
      final dedupeKey = 'WAITER_CALL_$callId';

      // Deduplicate against FCM notifications
      if (PushNotificationService().recordAndCheckDuplicate(dedupeKey)) {
        fetchWaiterCalls(isSilent: true);
        return;
      }

      final tableNum = data['tableNumberSnapshot'] ?? data['tableNumber'] ?? 'Floor';
      final reqType = data['requestType']?.toString() ?? 'CALL_WAITER';
      final reasonLabel = reqType == 'REQUEST_BILL'
          ? 'Requesting Bill / Payment'
          : reqType == 'WATER'
              ? 'Water Needed'
              : reqType == 'TISSUE'
                  ? 'Tissues Needed'
                  : 'Assistance Requested';

      // 1. Trigger audio chime and vibration
      _alertService.triggerWaiterCallAlert();

      // 2. Trigger high-priority heads-up local notification banner with valid JSON payload
      final payloadData = {
        'type': 'WAITER_CALL',
        'callId': callId,
        'tableNumber': tableNum.toString(),
        'requestType': reqType,
        'reason': reasonLabel,
      };

      PushNotificationService().showLocalNotification(
        id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
        title: '🚨 Captain Call: Table $tableNum',
        body: 'Table $tableNum • $reasonLabel',
        payload: jsonEncode(payloadData),
      );

      fetchWaiterCalls(isSilent: true);
    });

    _socketService.onWaiterCallResolved.listen((data) {
      final callId = data['callId']?.toString();
      if (callId != null) {
        state = state.copyWith(
          calls: state.calls.where((c) => c.id != callId).toList(),
        );
      }
    });
  }

  Future<void> fetchWaiterCalls({bool isSilent = false}) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return;
    if (!isSilent) {
      state = state.copyWith(isLoading: true, errorMessage: null);
    }

    try {
      final res =
          await _apiClient.dio.get(ApiConstants.waiterCalls(restaurantId));
      if (res.data['success'] == true &&
          res.data['data']?['waiterCalls'] is List) {
        final list = (res.data['data']['waiterCalls'] as List)
            .map((e) => WaiterCallModel.fromJson(e))
            .toList();
        state = state.copyWith(isLoading: false, calls: list);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      String msg = 'Failed to load waiter calls';
      if (e is DioException) {
        msg = _apiClient.formatDioError(e).message;
      } else {
        msg = e.toString();
      }
      state = state.copyWith(
        isLoading: false,
        errorMessage: msg,
      );
    }
  }

  Future<bool> acknowledgeCall(String callId) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return false;

    final pending = Set<String>.from(state.pendingActionCallIds)..add(callId);
    state = state.copyWith(
      pendingActionCallIds: pending,
      calls: state.calls.map((c) {
        if (c.id == callId) return c.copyWith(status: WaiterCallStatus.acknowledged);
        return c;
      }).toList(),
    );

    try {
      final res = await _apiClient.dio.patch(
        ApiConstants.acknowledgeWaiterCall(restaurantId, callId),
      );
      return res.data['success'] == true;
    } catch (_) {
      fetchWaiterCalls(isSilent: true);
      return false;
    } finally {
      final nextPending = Set<String>.from(state.pendingActionCallIds)..remove(callId);
      state = state.copyWith(pendingActionCallIds: nextPending);
    }
  }

  Future<bool> resolveCall(String callId) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return false;

    final pending = Set<String>.from(state.pendingActionCallIds)..add(callId);
    state = state.copyWith(
      pendingActionCallIds: pending,
      calls: state.calls.where((c) => c.id != callId).toList(),
    );

    try {
      final res = await _apiClient.dio.patch(
        ApiConstants.resolveWaiterCall(restaurantId, callId),
      );
      return res.data['success'] == true;
    } catch (_) {
      fetchWaiterCalls(isSilent: true);
      return false;
    } finally {
      final nextPending = Set<String>.from(state.pendingActionCallIds)..remove(callId);
      state = state.copyWith(pendingActionCallIds: nextPending);
    }
  }
}

final waiterCallsProvider =
    StateNotifierProvider<WaiterCallsNotifier, WaiterCallsState>((ref) {
  final authState = ref.watch(authProvider);
  final restaurantId = authState.activeRestaurant?.id;
  return WaiterCallsNotifier(restaurantId);
});
