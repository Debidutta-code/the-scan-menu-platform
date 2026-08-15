enum WaiterCallType { callWaiter, requestBill, water, tissue, other }
enum WaiterCallStatus { pending, acknowledged, resolved, cancelled }

class WaiterCallModel {
  final String id;
  final String restaurantId;
  final String tableId;
  final String tableNumberSnapshot;
  final WaiterCallType requestType;
  final WaiterCallStatus status;
  final DateTime createdAt;

  WaiterCallModel({
    required this.id,
    required this.restaurantId,
    required this.tableId,
    required this.tableNumberSnapshot,
    required this.requestType,
    required this.status,
    required this.createdAt,
  });

  factory WaiterCallModel.fromJson(Map<String, dynamic> json) {
    WaiterCallType type = WaiterCallType.callWaiter;
    final rawType = (json['requestType'] ?? 'CALL_WAITER').toString().toUpperCase();
    switch (rawType) {
      case 'REQUEST_BILL':
        type = WaiterCallType.requestBill;
        break;
      case 'WATER':
        type = WaiterCallType.water;
        break;
      case 'TISSUE':
        type = WaiterCallType.tissue;
        break;
      case 'OTHER':
        type = WaiterCallType.other;
        break;
      case 'CALL_WAITER':
      default:
        type = WaiterCallType.callWaiter;
    }

    WaiterCallStatus status = WaiterCallStatus.pending;
    final rawStatus = (json['status'] ?? 'PENDING').toString().toUpperCase();
    switch (rawStatus) {
      case 'ACKNOWLEDGED':
        status = WaiterCallStatus.acknowledged;
        break;
      case 'RESOLVED':
        status = WaiterCallStatus.resolved;
        break;
      case 'CANCELLED':
        status = WaiterCallStatus.cancelled;
        break;
      case 'PENDING':
      default:
        status = WaiterCallStatus.pending;
    }

    String tableId = '';
    if (json['tableId'] is Map) {
      tableId = json['tableId']['_id'] ?? json['tableId']['id'] ?? '';
    } else if (json['tableId'] is String) {
      tableId = json['tableId'];
    }

    return WaiterCallModel(
      id: json['_id'] ?? json['id'] ?? '',
      restaurantId: json['restaurantId']?.toString() ?? '',
      tableId: tableId,
      tableNumberSnapshot: json['tableNumberSnapshot'] ?? '',
      requestType: type,
      status: status,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }

  String get typeLabel {
    switch (requestType) {
      case WaiterCallType.requestBill:
        return 'Bill Request';
      case WaiterCallType.water:
        return 'Bring Water';
      case WaiterCallType.tissue:
        return 'Bring Tissues';
      case WaiterCallType.other:
        return 'Floor Assistance';
      case WaiterCallType.callWaiter:
        return 'Call Waiter';
    }
  }

  WaiterCallModel copyWith({
    WaiterCallStatus? status,
  }) {
    return WaiterCallModel(
      id: id,
      restaurantId: restaurantId,
      tableId: tableId,
      tableNumberSnapshot: tableNumberSnapshot,
      requestType: requestType,
      status: status ?? this.status,
      createdAt: createdAt,
    );
  }
}
