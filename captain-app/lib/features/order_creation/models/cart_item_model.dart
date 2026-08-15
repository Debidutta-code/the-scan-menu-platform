import 'menu_item_model.dart';

class CartItemModel {
  final MenuItemModel item;
  final int quantity;
  final List<AddOnModel> selectedAddOns;
  final String specialInstructions;

  CartItemModel({
    required this.item,
    this.quantity = 1,
    this.selectedAddOns = const [],
    this.specialInstructions = '',
  });

  int get unitPrice {
    int total = item.price;
    for (final addon in selectedAddOns) {
      total += addon.priceDelta;
    }
    return total;
  }

  int get itemTotal => unitPrice * quantity;

  CartItemModel copyWith({
    MenuItemModel? item,
    int? quantity,
    List<AddOnModel>? selectedAddOns,
    String? specialInstructions,
  }) {
    return CartItemModel(
      item: item ?? this.item,
      quantity: quantity ?? this.quantity,
      selectedAddOns: selectedAddOns ?? this.selectedAddOns,
      specialInstructions: specialInstructions ?? this.specialInstructions,
    );
  }

  Map<String, dynamic> toOrderPayloadJson() {
    return {
      'itemId': item.id,
      'quantity': quantity,
      'selectedAddOns': selectedAddOns.map((a) => {'name': a.name}).toList(),
      'specialInstructions': specialInstructions.trim().isEmpty ? null : specialInstructions.trim(),
    };
  }
}
