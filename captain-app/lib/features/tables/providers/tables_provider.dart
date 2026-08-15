import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/sockets/socket_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/table_model.dart';
import '../models/zone_model.dart';

class TablesState {
  final bool isLoading;
  final List<TableModel> tables;
  final List<ZoneModel> zones;
  final String? selectedZoneId;
  final String searchQuery;
  final String? errorMessage;

  TablesState({
    required this.isLoading,
    required this.tables,
    required this.zones,
    this.selectedZoneId,
    this.searchQuery = '',
    this.errorMessage,
  });

  factory TablesState.initial() => TablesState(
        isLoading: true,
        tables: [],
        zones: [],
      );

  List<TableModel> get filteredTables {
    return tables.where((table) {
      if (!table.isActive) return false;
      if (selectedZoneId != null && table.zoneId != selectedZoneId) {
        return false;
      }
      if (searchQuery.isNotEmpty) {
        final q = searchQuery.toLowerCase();
        final matchNumber = table.tableNumber.toLowerCase().contains(q);
        final matchName = table.displayName.toLowerCase().contains(q);
        return matchNumber || matchName;
      }
      return true;
    }).toList();
  }

  int get availableCount =>
      tables.where((t) => t.status == TableStatus.available && t.isActive).length;

  int get occupiedCount =>
      tables.where((t) => t.status == TableStatus.occupied && t.isActive).length;

  int get billRequestedCount =>
      tables.where((t) => t.status == TableStatus.billRequested && t.isActive).length;

  TablesState copyWith({
    bool? isLoading,
    List<TableModel>? tables,
    List<ZoneModel>? zones,
    String? selectedZoneId,
    bool clearZone = false,
    String? searchQuery,
    String? errorMessage,
  }) {
    return TablesState(
      isLoading: isLoading ?? this.isLoading,
      tables: tables ?? this.tables,
      zones: zones ?? this.zones,
      selectedZoneId: clearZone ? null : (selectedZoneId ?? this.selectedZoneId),
      searchQuery: searchQuery ?? this.searchQuery,
      errorMessage: errorMessage,
    );
  }
}

class TablesNotifier extends StateNotifier<TablesState> {
  final ApiClient _apiClient = ApiClient();
  final SocketService _socketService = SocketService();
  final String? _restaurantId;

  TablesNotifier(this._restaurantId) : super(TablesState.initial()) {
    if (_restaurantId != null) {
      fetchTablesAndZones();
      _setupSocketSubscriptions();
    } else {
      state = state.copyWith(isLoading: false);
    }
  }

  void _setupSocketSubscriptions() {
    _socketService.onOrderCreated.listen((_) => fetchTablesAndZones(isSilent: true));
    _socketService.onOrderStatusUpdated.listen((_) => fetchTablesAndZones(isSilent: true));
    _socketService.onSessionUpdated.listen((_) => fetchTablesAndZones(isSilent: true));
  }

  Future<void> fetchTablesAndZones({bool isSilent = false}) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return;
    if (!isSilent) {
      state = state.copyWith(isLoading: true, errorMessage: null);
    }

    try {
      final responses = await Future.wait([
        _apiClient.dio.get(ApiConstants.tables(restaurantId)),
        _apiClient.dio.get(ApiConstants.tableZones(restaurantId)),
      ]);

      final tablesRes = responses[0];
      final zonesRes = responses[1];

      List<TableModel> loadedTables = [];
      if (tablesRes.data['success'] == true && tablesRes.data['data'] is List) {
        loadedTables = (tablesRes.data['data'] as List)
            .map((e) => TableModel.fromJson(e))
            .toList();
      }

      List<ZoneModel> loadedZones = [];
      if (zonesRes.data['success'] == true && zonesRes.data['data'] is List) {
        loadedZones = (zonesRes.data['data'] as List)
            .map((e) => ZoneModel.fromJson(e))
            .toList();
      }

      state = state.copyWith(
        isLoading: false,
        tables: loadedTables,
        zones: loadedZones,
      );
    } catch (e) {
      String msg = 'Failed to load tables';
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

  void setZoneFilter(String? zoneId) {
    if (zoneId == null) {
      state = state.copyWith(clearZone: true);
    } else {
      state = state.copyWith(selectedZoneId: zoneId);
    }
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  Future<List<Map<String, dynamic>>> fetchTableOrders(String tableId) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return [];
    try {
      final res = await _apiClient.dio.get(ApiConstants.tableOrders(restaurantId, tableId));
      if (res.data['success'] == true && res.data['data'] is List) {
        return List<Map<String, dynamic>>.from(res.data['data']);
      }
    } catch (_) {}
    return [];
  }
}

final tablesProvider =
    StateNotifierProvider<TablesNotifier, TablesState>((ref) {
  final authState = ref.watch(authProvider);
  final restaurantId = authState.activeRestaurant?.id;
  return TablesNotifier(restaurantId);
});
