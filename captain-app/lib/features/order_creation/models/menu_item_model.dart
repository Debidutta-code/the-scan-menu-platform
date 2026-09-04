class AddOnModel {
  final String name;
  final int priceDelta; // in paise/cents

  AddOnModel({
    required this.name,
    required this.priceDelta,
  });

  factory AddOnModel.fromJson(Map<String, dynamic> json) {
    return AddOnModel(
      name: json['name'] ?? '',
      priceDelta: json['priceDelta'] is int
          ? json['priceDelta']
          : (json['priceDelta'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'priceDelta': priceDelta,
      };
}

class MenuItemVariantModel {
  final String name;
  final int price; // in paise/cents
  final bool isDefault;

  MenuItemVariantModel({
    required this.name,
    required this.price,
    this.isDefault = false,
  });

  factory MenuItemVariantModel.fromJson(Map<String, dynamic> json) {
    return MenuItemVariantModel(
      name: json['name'] ?? '',
      price: json['price'] is int
          ? json['price']
          : (json['price'] as num?)?.toInt() ?? 0,
      isDefault: json['isDefault'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'price': price,
        'isDefault': isDefault,
      };
}

class ComboSubItemModel {
  final String? menuItemId;
  final String name;
  final int quantity;
  final String? categoryName;
  final int? priceSnapshot;

  ComboSubItemModel({
    this.menuItemId,
    required this.name,
    this.quantity = 1,
    this.categoryName,
    this.priceSnapshot,
  });

  factory ComboSubItemModel.fromJson(Map<String, dynamic> json) {
    return ComboSubItemModel(
      menuItemId: json['menuItemId']?.toString(),
      name: json['name'] ?? '',
      quantity: json['quantity'] is int
          ? json['quantity']
          : (json['quantity'] as num?)?.toInt() ?? 1,
      categoryName: json['categoryName'],
      priceSnapshot: json['priceSnapshot'] is int
          ? json['priceSnapshot']
          : (json['priceSnapshot'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() => {
        'menuItemId': menuItemId,
        'name': name,
        'quantity': quantity,
        'categoryName': categoryName,
        'priceSnapshot': priceSnapshot,
      };
}

class MenuItemModel {
  final String id;
  final String restaurantId;
  final String categoryId;
  final String name;
  final String? description;
  final int price; // in paise/cents
  final int? originalPrice; // in paise/cents (MRP for discount strikethrough)
  final String pricingType; // 'SINGLE' | 'PORTION'
  final List<MenuItemVariantModel> variants;
  final String? imageUrl;
  final bool isAvailable;
  final bool isVegetarian;
  final bool isSpicy;
  final bool isCombo;
  final bool isTopPick;
  final bool isChefsSpecial;
  final List<ComboSubItemModel> comboItems;
  final int prepTimeMinutes;
  final List<AddOnModel> addOns;

  MenuItemModel({
    required this.id,
    required this.restaurantId,
    required this.categoryId,
    required this.name,
    this.description,
    required this.price,
    this.originalPrice,
    this.pricingType = 'SINGLE',
    this.variants = const [],
    this.imageUrl,
    required this.isAvailable,
    this.isVegetarian = true,
    this.isSpicy = false,
    this.isCombo = false,
    this.isTopPick = false,
    this.isChefsSpecial = false,
    this.comboItems = const [],
    this.prepTimeMinutes = 15,
    required this.addOns,
  });

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    final catRaw = json['categoryId'] ?? json['category'];
    String parsedCatId = '';
    if (catRaw is Map) {
      parsedCatId = (catRaw['_id'] ?? catRaw['id'] ?? '').toString();
    } else if (catRaw != null) {
      parsedCatId = catRaw.toString();
    }

    return MenuItemModel(
      id: json['_id'] ?? json['id'] ?? '',
      restaurantId: json['restaurantId']?.toString() ?? '',
      categoryId: parsedCatId,
      name: json['name'] ?? '',
      description: json['description'],
      price: json['price'] is int
          ? json['price']
          : (json['price'] as num?)?.toInt() ?? 0,
      originalPrice: json['originalPrice'] is int
          ? json['originalPrice']
          : (json['originalPrice'] as num?)?.toInt(),
      pricingType: json['pricingType'] ?? 'SINGLE',
      variants: (json['variants'] as List<dynamic>?)
              ?.map((e) => MenuItemVariantModel.fromJson(e))
              .toList() ??
          [],
      imageUrl: json['imageUrl'],
      isAvailable: json['isAvailable'] ?? true,
      isVegetarian: json['isVegetarian'] ?? true,
      isSpicy: json['isSpicy'] ?? false,
      isCombo: json['isCombo'] ?? false,
      isTopPick: json['isTopPick'] ?? false,
      isChefsSpecial: json['isChefsSpecial'] ?? false,
      comboItems: (json['comboItems'] as List<dynamic>?)
              ?.map((e) => ComboSubItemModel.fromJson(e))
              .toList() ??
          [],
      prepTimeMinutes: json['prepTimeMinutes'] ?? 15,
      addOns: (json['addOns'] as List<dynamic>?)
              ?.map((e) => AddOnModel.fromJson(e))
              .toList() ??
          [],
    );
  }

  MenuItemModel copyWith({
    bool? isAvailable,
    bool? isTopPick,
    bool? isChefsSpecial,
    bool? isCombo,
  }) {
    return MenuItemModel(
      id: id,
      restaurantId: restaurantId,
      categoryId: categoryId,
      name: name,
      description: description,
      price: price,
      originalPrice: originalPrice,
      pricingType: pricingType,
      variants: variants,
      imageUrl: imageUrl,
      isAvailable: isAvailable ?? this.isAvailable,
      isVegetarian: isVegetarian,
      isSpicy: isSpicy,
      isCombo: isCombo ?? this.isCombo,
      isTopPick: isTopPick ?? this.isTopPick,
      isChefsSpecial: isChefsSpecial ?? this.isChefsSpecial,
      comboItems: comboItems,
      prepTimeMinutes: prepTimeMinutes,
      addOns: addOns,
    );
  }
}
