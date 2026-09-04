class OrderComboSubItemSnapshot {
  final String name;
  final int quantity;
  final String? categoryName;
  final int? priceSnapshot;

  OrderComboSubItemSnapshot({
    required this.name,
    this.quantity = 1,
    this.categoryName,
    this.priceSnapshot,
  });

  factory OrderComboSubItemSnapshot.fromJson(Map<String, dynamic> json) {
    return OrderComboSubItemSnapshot(
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
}

class OrderItemSnapshot {
  final String name;
  final int unitPrice;
  final int? originalPrice;
  final int quantity;
  final bool isCombo;
  final List<OrderComboSubItemSnapshot> comboItems;
  final List<String> selectedAddOns;
  final String? specialInstructions;
  final String itemStatus; // PENDING, PREPARING, READY, SERVED

  OrderItemSnapshot({
    required this.name,
    required this.unitPrice,
    this.originalPrice,
    required this.quantity,
    this.isCombo = false,
    this.comboItems = const [],
    required this.selectedAddOns,
    this.specialInstructions,
    required this.itemStatus,
  });

  factory OrderItemSnapshot.fromJson(Map<String, dynamic> json) {
    return OrderItemSnapshot(
      name: json['nameSnapshot'] ?? json['name'] ?? '',
      unitPrice: json['unitPriceSnapshot'] ?? json['unitPrice'] ?? 0,
      originalPrice: json['originalPriceSnapshot'] is int
          ? json['originalPriceSnapshot']
          : (json['originalPriceSnapshot'] as num?)?.toInt(),
      quantity: json['quantity'] ?? 1,
      isCombo: json['isCombo'] ?? false,
      comboItems: (json['comboItemsSnapshot'] as List<dynamic>?)
              ?.map((e) => OrderComboSubItemSnapshot.fromJson(e))
              .toList() ??
          [],
      selectedAddOns: (json['selectedAddOns'] as List<dynamic>?)
              ?.map((e) => e is Map ? e['name'].toString() : e.toString())
              .toList() ??
          [],
      specialInstructions: json['specialInstructions'],
      itemStatus: json['itemStatus'] ?? 'PENDING',
    );
  }
}

class OrderModel {
  final String id;
  final String restaurantId;
  final String? tableId;
  final String? tableName;
  final int orderNumber;
  final String orderMode; // DINE_IN, TAKEAWAY, DELIVERY, COUNTER
  final String status; // PENDING, ACCEPTED, PREPARING, READY, SERVED, CANCELLED
  final String paymentStatus;
  final int subtotal;
  final int tax;
  final int roundOff;
  final int total;
  final List<OrderItemSnapshot> items;
  final String? customerName;
  final String? customerPhone;
  final String? customerNote;
  final DateTime createdAt;

  OrderModel({
    required this.id,
    required this.restaurantId,
    this.tableId,
    this.tableName,
    required this.orderNumber,
    required this.orderMode,
    required this.status,
    required this.paymentStatus,
    required this.subtotal,
    required this.tax,
    this.roundOff = 0,
    required this.total,
    required this.items,
    this.customerName,
    this.customerPhone,
    this.customerNote,
    required this.createdAt,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    String? tableId;
    String? tableName;

    if (json['tableId'] is Map) {
      tableId = json['tableId']['_id'] ?? json['tableId']['id'];
      tableName = json['tableId']['displayName'] ??
          'Table ${json['tableId']['tableNumber']}';
    } else if (json['tableId'] is String) {
      tableId = json['tableId'];
    }

    return OrderModel(
      id: json['_id'] ?? json['id'] ?? '',
      restaurantId: json['restaurantId']?.toString() ?? '',
      tableId: tableId,
      tableName: tableName,
      orderNumber: json['orderNumber'] ?? 0,
      orderMode: json['orderMode'] ?? 'DINE_IN',
      status: json['status'] ?? 'PENDING',
      paymentStatus: json['paymentStatus'] ?? 'PENDING',
      subtotal: json['subtotal'] ?? 0,
      tax: json['tax'] ?? 0,
      roundOff: json['roundOff'] ?? 0,
      total: json['total'] ?? 0,
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => OrderItemSnapshot.fromJson(e))
              .toList() ??
          [],
      customerName: json['customerName'],
      customerPhone: json['customerPhone'],
      customerNote: json['customerNote'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }

  OrderModel copyWith({
    String? status,
    String? paymentStatus,
  }) {
    return OrderModel(
      id: id,
      restaurantId: restaurantId,
      tableId: tableId,
      tableName: tableName,
      orderNumber: orderNumber,
      orderMode: orderMode,
      status: status ?? this.status,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      subtotal: subtotal,
      tax: tax,
      roundOff: roundOff,
      total: total,
      items: items,
      customerName: customerName,
      customerPhone: customerPhone,
      customerNote: customerNote,
      createdAt: createdAt,
    );
  }
}
