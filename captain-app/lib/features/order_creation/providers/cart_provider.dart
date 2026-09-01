import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../auth/providers/auth_provider.dart';
import '../../tables/models/table_model.dart';
import '../models/cart_item_model.dart';
import '../models/menu_item_model.dart';

class CartState {
  final TableModel? selectedTable;
  final String orderMode; // 'DINE_IN' | 'TAKEAWAY'
  final List<CartItemModel> items;
  final String customerName;
  final String customerPhone;
  final String customerNote;
  final String paymentMethod; // 'CASH' | 'UPI' | 'CARD'
  final String paymentStatus; // 'PENDING' | 'PAID'
  final bool isSubmitting;
  final String? errorMessage;

  CartState({
    this.selectedTable,
    this.orderMode = 'DINE_IN',
    this.items = const [],
    this.customerName = '',
    this.customerPhone = '',
    this.customerNote = '',
    this.paymentMethod = 'CASH',
    this.paymentStatus = 'PENDING',
    this.isSubmitting = false,
    this.errorMessage,
  });

  int get totalItemCount => items.fold(0, (sum, i) => sum + i.quantity);

  int get subtotalInPaise => items.fold(0, (sum, i) => sum + i.itemTotal);

  int calculateTaxInPaise(num taxRatePercent) {
    if (taxRatePercent <= 0) return 0;
    return ((subtotalInPaise * taxRatePercent) / 100).round();
  }

  int calculateUnroundedTotalInPaise(num taxRatePercent) {
    return subtotalInPaise + calculateTaxInPaise(taxRatePercent);
  }

  int calculateRoundOffInPaise(num taxRatePercent,
      {bool roundingEnabled = true, String roundingStrategy = 'NEAREST'}) {
    final unrounded = calculateUnroundedTotalInPaise(taxRatePercent);
    if (!roundingEnabled) return 0;

    int rounded = unrounded;
    if (roundingStrategy == 'UP') {
      rounded = ((unrounded / 100).ceil()) * 100;
    } else if (roundingStrategy == 'DOWN') {
      rounded = ((unrounded / 100).floor()) * 100;
    } else {
      // Default: NEAREST
      rounded = ((unrounded / 100).round()) * 100;
    }
    return rounded - unrounded;
  }

  int calculateGrandTotalInPaise(num taxRatePercent,
      {bool roundingEnabled = true, String roundingStrategy = 'NEAREST'}) {
    final unrounded = calculateUnroundedTotalInPaise(taxRatePercent);
    final roundOff = calculateRoundOffInPaise(taxRatePercent,
        roundingEnabled: roundingEnabled, roundingStrategy: roundingStrategy);
    return unrounded + roundOff;
  }

  bool get isEmpty => items.isEmpty;

  int getItemQuantity(String itemId) =>
      items.where((i) => i.item.id == itemId).fold(0, (sum, i) => sum + i.quantity);

  CartState copyWith({
    TableModel? selectedTable,
    bool clearTable = false,
    String? orderMode,
    List<CartItemModel>? items,
    String? customerName,
    String? customerPhone,
    String? customerNote,
    String? paymentMethod,
    String? paymentStatus,
    bool? isSubmitting,
    String? errorMessage,
  }) {
    return CartState(
      selectedTable: clearTable ? null : (selectedTable ?? this.selectedTable),
      orderMode: orderMode ?? this.orderMode,
      items: items ?? this.items,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      customerNote: customerNote ?? this.customerNote,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: errorMessage,
    );
  }
}

class CartNotifier extends StateNotifier<CartState> {
  final ApiClient _apiClient = ApiClient();
  final String? _restaurantId;

  CartNotifier(this._restaurantId) : super(CartState());

  void setTable(TableModel table) {
    state = state.copyWith(selectedTable: table, orderMode: 'DINE_IN');
  }

  void clearTable() {
    state = state.copyWith(clearTable: true);
  }

  void setOrderMode(String mode) {
    state = state.copyWith(orderMode: mode);
  }

  void setPaymentMethod(String method) {
    state = state.copyWith(paymentMethod: method);
  }

  void setPaymentStatus(String status) {
    state = state.copyWith(paymentStatus: status);
  }

  void setCustomerInfo({String? name, String? phone, String? note}) {
    state = state.copyWith(
      customerName: name ?? state.customerName,
      customerPhone: phone ?? state.customerPhone,
      customerNote: note ?? state.customerNote,
    );
  }

  void addItem(
    MenuItemModel item, {
    MenuItemVariantModel? selectedVariant,
    int quantity = 1,
    List<AddOnModel> selectedAddOns = const [],
    String specialInstructions = '',
  }) {
    final existingIndex = state.items.indexWhere((i) {
      final sameItem = i.item.id == item.id;
      final sameVariant = i.selectedVariant?.name == selectedVariant?.name;
      final sameAddons = _areAddonsEqual(i.selectedAddOns, selectedAddOns);
      final sameNotes = i.specialInstructions == specialInstructions;
      return sameItem && sameVariant && sameAddons && sameNotes;
    });

    if (existingIndex != -1) {
      final updated = List<CartItemModel>.from(state.items);
      updated[existingIndex] = updated[existingIndex].copyWith(
        quantity: updated[existingIndex].quantity + quantity,
      );
      state = state.copyWith(items: updated);
    } else {
      state = state.copyWith(
        items: [
          ...state.items,
          CartItemModel(
            item: item,
            selectedVariant: selectedVariant,
            quantity: quantity,
            selectedAddOns: selectedAddOns,
            specialInstructions: specialInstructions,
          ),
        ],
      );
    }
  }

  List<CartItemModel> getItemConfigurations(String itemId) =>
      state.items.where((i) => i.item.id == itemId).toList();

  void incrementSpecificItem(CartItemModel target) {
    final existingIndex = state.items.indexWhere((i) {
      final sameItem = i.item.id == target.item.id;
      final sameVariant = i.selectedVariant?.name == target.selectedVariant?.name;
      final sameAddons = _areAddonsEqual(i.selectedAddOns, target.selectedAddOns);
      final sameNotes = i.specialInstructions == target.specialInstructions;
      return sameItem && sameVariant && sameAddons && sameNotes;
    });

    if (existingIndex != -1) {
      final updated = List<CartItemModel>.from(state.items);
      updated[existingIndex] = updated[existingIndex].copyWith(
        quantity: updated[existingIndex].quantity + 1,
      );
      state = state.copyWith(items: updated);
    }
  }

  void decrementSpecificItem(CartItemModel target) {
    final existingIndex = state.items.indexWhere((i) {
      final sameItem = i.item.id == target.item.id;
      final sameVariant = i.selectedVariant?.name == target.selectedVariant?.name;
      final sameAddons = _areAddonsEqual(i.selectedAddOns, target.selectedAddOns);
      final sameNotes = i.specialInstructions == target.specialInstructions;
      return sameItem && sameVariant && sameAddons && sameNotes;
    });

    if (existingIndex == -1) return;

    final currentQty = state.items[existingIndex].quantity;
    if (currentQty > 1) {
      final updated = List<CartItemModel>.from(state.items);
      updated[existingIndex] = updated[existingIndex].copyWith(
        quantity: currentQty - 1,
      );
      state = state.copyWith(items: updated);
    } else {
      removeItem(existingIndex);
    }
  }

  void incrementItem(MenuItemModel item) {
    final existingIndex =
        state.items.lastIndexWhere((i) => i.item.id == item.id);
    if (existingIndex != -1) {
      final updated = List<CartItemModel>.from(state.items);
      updated[existingIndex] = updated[existingIndex].copyWith(
        quantity: updated[existingIndex].quantity + 1,
      );
      state = state.copyWith(items: updated);
    } else {
      addItem(item);
    }
  }

  void decrementItem(MenuItemModel item) {
    final existingIndex =
        state.items.lastIndexWhere((i) => i.item.id == item.id);
    if (existingIndex == -1) return;

    final currentQty = state.items[existingIndex].quantity;
    if (currentQty > 1) {
      final updated = List<CartItemModel>.from(state.items);
      updated[existingIndex] = updated[existingIndex].copyWith(
        quantity: currentQty - 1,
      );
      state = state.copyWith(items: updated);
    } else {
      removeItem(existingIndex);
    }
  }

  void updateQuantity(int index, int quantity) {
    if (index < 0 || index >= state.items.length) return;
    if (quantity <= 0) {
      removeItem(index);
      return;
    }

    final updated = List<CartItemModel>.from(state.items);
    updated[index] = updated[index].copyWith(quantity: quantity);
    state = state.copyWith(items: updated);
  }

  void removeItem(int index) {
    if (index < 0 || index >= state.items.length) return;
    final updated = List<CartItemModel>.from(state.items)..removeAt(index);
    state = state.copyWith(items: updated);
  }

  void clearCart() {
    state = CartState(
      selectedTable: state.selectedTable,
      orderMode: state.orderMode,
    );
  }

  bool _areAddonsEqual(List<AddOnModel> a, List<AddOnModel> b) {
    if (a.length != b.length) return false;
    final aNames = a.map((e) => e.name).toSet();
    final bNames = b.map((e) => e.name).toSet();
    return aNames.containsAll(bNames) && bNames.containsAll(aNames);
  }

  Future<Map<String, dynamic>?> submitOrder() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null || state.items.isEmpty) return null;

    state = state.copyWith(isSubmitting: true, errorMessage: null);

    try {
      final payload = {
        'orderMode': state.orderMode,
        'source': 'WAITER',
        'tableId': state.selectedTable?.id,
        'customerName': state.customerName.trim().isEmpty ? null : state.customerName.trim(),
        'customerPhone': state.customerPhone.trim().isEmpty ? null : state.customerPhone.trim(),
        'customerNote': state.customerNote.trim().isEmpty ? null : state.customerNote.trim(),
        'paymentStatus': state.paymentStatus,
        'paymentMethod': state.paymentMethod,
        'items': state.items.map((i) => i.toOrderPayloadJson()).toList(),
      };

      final response = await _apiClient.dio.post(
        ApiConstants.createOrder(restaurantId),
        data: payload,
      );

      if (response.data['success'] == true) {
        final orderData = response.data['data'] as Map<String, dynamic>;
        clearCart();
        state = state.copyWith(isSubmitting: false);
        return orderData;
      } else {
        throw ApiException(message: response.data['error']?['message'] ?? 'Failed to place order');
      }
    } on DioException catch (e) {
      final err = _apiClient.formatDioError(e);
      state = state.copyWith(isSubmitting: false, errorMessage: err.message);
      return null;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.toString());
      return null;
    }
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  final authState = ref.watch(authProvider);
  final restaurantId = authState.activeRestaurant?.id;
  return CartNotifier(restaurantId);
});
