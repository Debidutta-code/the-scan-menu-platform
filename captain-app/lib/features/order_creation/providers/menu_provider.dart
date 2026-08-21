import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/sockets/socket_service.dart';
import 'package:fuzzy/fuzzy.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/category_model.dart';
import '../models/menu_item_model.dart';

class MenuState {
  final bool isLoading;
  final List<CategoryModel> categories;
  final List<MenuItemModel> menuItems;
  final String? selectedCategoryId;
  final String searchQuery;
  final String? errorMessage;

  MenuState({
    required this.isLoading,
    required this.categories,
    required this.menuItems,
    this.selectedCategoryId,
    this.searchQuery = '',
    this.errorMessage,
  });

  factory MenuState.initial() => MenuState(
        isLoading: true,
        categories: [],
        menuItems: [],
      );

  List<MenuItemModel> get filteredItems {
    var items = menuItems;
    if (selectedCategoryId != null) {
      items = items.where((item) => item.categoryId == selectedCategoryId).toList();
    }
    
    if (searchQuery.isNotEmpty) {
      final fuse = Fuzzy<MenuItemModel>(
        items,
        options: FuzzyOptions(
          keys: [
            WeightedKey(
              name: 'name',
              getter: (MenuItemModel x) => x.name,
              weight: 1.0,
            ),
            WeightedKey(
              name: 'description',
              getter: (MenuItemModel x) => x.description ?? '',
              weight: 0.5,
            ),
          ],
          threshold: 0.4,
        ),
      );
      
      final results = fuse.search(searchQuery);
      return results.map((r) => r.item).toList();
    }
    
    return items;
  }

  MenuState copyWith({
    bool? isLoading,
    List<CategoryModel>? categories,
    List<MenuItemModel>? menuItems,
    String? selectedCategoryId,
    bool clearCategory = false,
    String? searchQuery,
    String? errorMessage,
  }) {
    return MenuState(
      isLoading: isLoading ?? this.isLoading,
      categories: categories ?? this.categories,
      menuItems: menuItems ?? this.menuItems,
      selectedCategoryId: clearCategory ? null : (selectedCategoryId ?? this.selectedCategoryId),
      searchQuery: searchQuery ?? this.searchQuery,
      errorMessage: errorMessage,
    );
  }
}

class MenuNotifier extends StateNotifier<MenuState> {
  final ApiClient _apiClient = ApiClient();
  final SocketService _socketService = SocketService();
  final String? _restaurantId;

  MenuNotifier(this._restaurantId) : super(MenuState.initial()) {
    if (_restaurantId != null) {
      fetchMenu();
      _setupSocketSubscriptions();
    } else {
      state = state.copyWith(isLoading: false);
    }
  }

  void _setupSocketSubscriptions() {
    _socketService.onInventoryUpdated.listen((data) {
      final itemId = data['itemId']?.toString();
      final isAvailable = data['isAvailable'] as bool?;
      if (itemId != null && isAvailable != null) {
        state = state.copyWith(
          menuItems: state.menuItems.map((item) {
            if (item.id == itemId) {
              return item.copyWith(isAvailable: isAvailable);
            }
            return item;
          }).toList(),
        );
      }
    });
  }

  Future<void> fetchMenu({bool isSilent = false}) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return;
    if (!isSilent) {
      state = state.copyWith(isLoading: true, errorMessage: null);
    }

    try {
      final responses = await Future.wait([
        _apiClient.dio.get(ApiConstants.categories(restaurantId)),
        _apiClient.dio.get(ApiConstants.menuItems(restaurantId)),
      ]);

      final categoriesRes = responses[0];
      final menuItemsRes = responses[1];

      List<CategoryModel> loadedCats = [];
      if (categoriesRes.data['success'] == true && categoriesRes.data['data'] is List) {
        loadedCats = (categoriesRes.data['data'] as List)
            .map((e) => CategoryModel.fromJson(e))
            .where((c) => c.isActive)
            .toList();
        loadedCats.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
      }

      List<MenuItemModel> loadedItems = [];
      if (menuItemsRes.data['success'] == true && menuItemsRes.data['data'] is List) {
        loadedItems = (menuItemsRes.data['data'] as List)
            .map((e) => MenuItemModel.fromJson(e))
            .toList();
      }

      state = state.copyWith(
        isLoading: false,
        categories: loadedCats,
        menuItems: loadedItems,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to load menu: ${e.toString()}',
      );
    }
  }

  void selectCategory(String? categoryId) {
    if (categoryId == null) {
      state = state.copyWith(clearCategory: true);
    } else {
      state = state.copyWith(selectedCategoryId: categoryId);
    }
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  Future<bool> toggleItemAvailability(String itemId, bool currentAvailability) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) return false;
    final target = !currentAvailability;

    // Optimistic update
    state = state.copyWith(
      menuItems: state.menuItems.map((it) {
        if (it.id == itemId) return it.copyWith(isAvailable: target);
        return it;
      }).toList(),
    );

    try {
      final res = await _apiClient.dio.patch(
        ApiConstants.toggleItemAvailability(restaurantId, itemId),
        data: {'isAvailable': target},
      );
      return res.data['success'] == true;
    } catch (_) {
      // Rollback on error
      state = state.copyWith(
        menuItems: state.menuItems.map((it) {
          if (it.id == itemId) return it.copyWith(isAvailable: currentAvailability);
          return it;
        }).toList(),
      );
      return false;
    }
  }
}

final menuProvider = StateNotifierProvider<MenuNotifier, MenuState>((ref) {
  final authState = ref.watch(authProvider);
  final restaurantId = authState.activeRestaurant?.id;
  return MenuNotifier(restaurantId);
});
