class OrderItemSnapshot {
  final String name;
  final int unitPrice;
  final int quantity;
  final List<String> selectedAddOns;
  final String? specialInstructions;
  final String itemStatus; // PENDING, PREPARING, READY, SERVED

  OrderItemSnapshot({
    required this.name,
    required this.unitPrice,
    required this.quantity,
    required this.selectedAddOns,
    this.specialInstructions,
    required this.itemStatus,
  });

  factory OrderItemSnapshot.fromJson(Map<String, dynamic> json) {
    return OrderItemSnapshot(
      name: json['nameSnapshot'] ?? json['name'] ?? '',
      unitPrice: json['unitPriceSnapshot'] ?? json['unitPrice'] ?? 0,
      quantity: json['quantity'] ?? 1,
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
  }) {
    return OrderModel(
      id: id,
      restaurantId: restaurantId,
      tableId: tableId,
      tableName: tableName,
      orderNumber: orderNumber,
      orderMode: orderMode,
      status: status ?? this.status,
      paymentStatus: paymentStatus,
      subtotal: subtotal,
      tax: tax,
      total: total,
      items: items,
      customerName: customerName,
      customerPhone: customerPhone,
      customerNote: customerNote,
      createdAt: createdAt,
    );
  }
}
