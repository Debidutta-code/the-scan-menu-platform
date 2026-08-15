import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/audio/alert_service.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/sockets/socket_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/order_model.dart';

class ActiveOrdersState {
  final bool isLoading;
  final List<OrderModel> orders;
  final String statusFilter; // 'ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'
  final String searchQuery;
  final Set<String> pendingActionOrderIds;
  final String? errorMessage;

  ActiveOrdersState({
    required this.isLoading,
    required this.orders,
    this.statusFilter = 'ALL',
    this.searchQuery = '',
    this.pendingActionOrderIds = const {},
    this.errorMessage,
  });

  factory ActiveOrdersState.initial() => ActiveOrdersState(
        isLoading: true,
        orders: [],
      );

  List<OrderModel> get filteredOrders {
    return orders.where((order) {
      if (statusFilter != 'ALL' && order.status != statusFilter) {
        return false;
      }
      if (searchQuery.isNotEmpty) {
        final q = searchQuery.toLowerCase();
        final matchNum = order.orderNumber.toString().contains(q);
        final matchTable = order.tableName?.toLowerCase().contains(q) ?? false;
        final matchCustomer = order.customerName?.toLowerCase().contains(q) ?? false;
        return matchNum || matchTable || matchCustomer;
      }
      return true;
    }).toList();
  }

  int get pendingCount => orders.where((o) => o.status == 'PENDING').length;
  int get acceptedCount => orders.where((o) => o.status == 'ACCEPTED').length;
  int get preparingCount => orders.where((o) => o.status == 'PREPARING').length;
  int get readyCount => orders.where((o) => o.status == 'READY').length;
  int get servedCount => orders.where((o) => o.status == 'SERVED').length;

  ActiveOrdersState copyWith({
    bool? isLoading,
    List<OrderModel>? orders,
    String? statusFilter,
    String? searchQuery,
    Set<String>? pendingActionOrderIds,
    String? errorMessage,
  }) {
    return ActiveOrdersState(
      isLoading: isLoading ?? this.isLoading,
      orders: orders ?? this.orders,
      statusFilter: statusFilter ?? this.statusFilter,
      searchQuery: searchQuery ?? this.searchQuery,
      pendingActionOrderIds: pendingActionOrderIds ?? this.pendingActionOrderIds,
      errorMessage: errorMessage,
    );
  }
}

class ActiveOrdersNotifier extends StateNotifier<ActiveOrdersState> {
  final ApiClient _apiClient = ApiClient();
  final SocketService _socketService = SocketService();
  final AlertService _alertService = AlertService();
  final String? _restaurantId;

  ActiveOrdersNotifier(this._restaurantId) : super(ActiveOrdersState.initial()) {
    if (_restaurantId != null) {
      fetchActiveOrders();
      _setupSocketSubscriptions();
    } else {
      state = state.copyWith(isLoading: false);
    }
  }

  void _setupSocketSubscriptions() {
    _socketService.onOrderCreated.listen((data) {
      _alertService.triggerNewOrderAlert();
      fetchActiveOrders(isSilent: true);
    });

    _socketService.onOrderStatusUpdated.listen((data) {
      final orderId = data['orderId']?.toString();
      final nextStatus = data['status']?.toString();
      if (orderId != null && nextStatus != null) {
        state = state.copyWith(
          orders: state.orders.map((o) {
            if (o.id == orderId) return o.copyWith(status: nextStatus);
            return o;
          }).toList(),
        );
      }
    });
  }

  Future<void> fetchActiveOrders({bool isSilent = false}) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return;
    if (!isSilent) {
      state = state.copyWith(isLoading: true, errorMessage: null);
    }

    try {
      final res = await _apiClient.dio.get(ApiConstants.activeOrders(restaurantId));
      if (res.data['success'] == true && res.data['data'] is List) {
        final list = (res.data['data'] as List)
            .map((e) => OrderModel.fromJson(e))
            .toList();
        state = state.copyWith(isLoading: false, orders: list);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to load active orders: ${e.toString()}',
      );
    }
  }

  void setStatusFilter(String filter) {
    state = state.copyWith(statusFilter: filter);
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  String? getNextWorkflowStatus(String currentStatus, String workflowMode) {
    if (workflowMode == 'THREE_STEP') {
      switch (currentStatus) {
        case 'PENDING':
          return 'PREPARING';
        case 'PREPARING':
          return 'SERVED';
        default:
          return null;
      }
    } else if (workflowMode == 'FOUR_STEP') {
      switch (currentStatus) {
        case 'PENDING':
          return 'PREPARING';
        case 'PREPARING':
          return 'READY';
        case 'READY':
          return 'SERVED';
        default:
          return null;
      }
    } else {
      // FIVE_STEP (Default)
      switch (currentStatus) {
        case 'PENDING':
          return 'ACCEPTED';
        case 'ACCEPTED':
          return 'PREPARING';
        case 'PREPARING':
          return 'READY';
        case 'READY':
          return 'SERVED';
        default:
          return null;
      }
    }
  }

  Future<bool> advanceOrderStatus(String orderId, String nextStatus) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return false;

    final originalStatus =
        state.orders.firstWhere((o) => o.id == orderId).status;

    // Mark pending action & optimistically update state
    final pending = Set<String>.from(state.pendingActionOrderIds)..add(orderId);
    state = state.copyWith(
      pendingActionOrderIds: pending,
      orders: state.orders.map((o) {
        if (o.id == orderId) return o.copyWith(status: nextStatus);
        return o;
      }).toList(),
    );

    try {
      final res = await _apiClient.dio.patch(
        ApiConstants.updateOrderStatus(restaurantId, orderId),
        data: {'status': nextStatus},
      );

      final nextPending = Set<String>.from(state.pendingActionOrderIds)..remove(orderId);
      state = state.copyWith(pendingActionOrderIds: nextPending);
      return res.data['success'] == true;
    } catch (_) {
      // Rollback on failure
      final nextPending = Set<String>.from(state.pendingActionOrderIds)..remove(orderId);
      state = state.copyWith(
        pendingActionOrderIds: nextPending,
        orders: state.orders.map((o) {
          if (o.id == orderId) return o.copyWith(status: originalStatus);
          return o;
        }).toList(),
      );
      return false;
    }
  }

  Future<bool> clearOrder(String orderId) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return false;

    final pending = Set<String>.from(state.pendingActionOrderIds)..add(orderId);
    state = state.copyWith(
      pendingActionOrderIds: pending,
      orders: state.orders.where((o) => o.id != orderId).toList(),
    );

    try {
      final res = await _apiClient.dio.post(ApiConstants.clearOrder(restaurantId, orderId));
      final nextPending = Set<String>.from(state.pendingActionOrderIds)..remove(orderId);
      state = state.copyWith(pendingActionOrderIds: nextPending);
      return res.data['success'] == true;
    } catch (_) {
      fetchActiveOrders(isSilent: true);
      return false;
    }
  }
}

final activeOrdersProvider =
    StateNotifierProvider<ActiveOrdersNotifier, ActiveOrdersState>((ref) {
  final authState = ref.watch(authProvider);
  final restaurantId = authState.activeRestaurant?.id;
  return ActiveOrdersNotifier(restaurantId);
});
