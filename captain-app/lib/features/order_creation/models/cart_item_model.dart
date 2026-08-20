import 'menu_item_model.dart';

class CartItemModel {
  final MenuItemModel item;
  final MenuItemVariantModel? selectedVariant;
  final int quantity;
  final List<AddOnModel> selectedAddOns;
  final String specialInstructions;

  CartItemModel({
    required this.item,
    this.selectedVariant,
    this.quantity = 1,
    this.selectedAddOns = const [],
    this.specialInstructions = '',
  });

  String? get variantName => selectedVariant?.name;

  int get unitPrice {
    int base = selectedVariant != null ? selectedVariant!.price : item.price;
    for (final addon in selectedAddOns) {
      base += addon.priceDelta;
    }
    return base;
  }

  int get itemTotal => unitPrice * quantity;

  CartItemModel copyWith({
    MenuItemModel? item,
    MenuItemVariantModel? selectedVariant,
    int? quantity,
    List<AddOnModel>? selectedAddOns,
    String? specialInstructions,
  }) {
    return CartItemModel(
      item: item ?? this.item,
      selectedVariant: selectedVariant ?? this.selectedVariant,
      quantity: quantity ?? this.quantity,
      selectedAddOns: selectedAddOns ?? this.selectedAddOns,
      specialInstructions: specialInstructions ?? this.specialInstructions,
    );
  }

  Map<String, dynamic> toOrderPayloadJson() {
    return {
      'itemId': item.id,
      'variantName': variantName,
      'quantity': quantity,
      'selectedAddOns': selectedAddOns.map((a) => {'name': a.name}).toList(),
      'specialInstructions': specialInstructions.trim().isEmpty ? null : specialInstructions.trim(),
    };
  }
}
