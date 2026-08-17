enum WaiterCallType { callWaiter, requestBill, water, tissue, other }
enum WaiterCallStatus { pending, acknowledged, resolved, expired, cancelled }

class StaffAttributionModel {
  final String? userId;
  final String name;
  final String role;

  StaffAttributionModel({
    this.userId,
    required this.name,
    this.role = 'STAFF',
  });

  factory StaffAttributionModel.fromJson(Map<String, dynamic> json) {
    return StaffAttributionModel(
      userId: json['userId']?.toString(),
      name: json['name']?.toString() ?? 'Staff',
      role: json['role']?.toString() ?? 'STAFF',
    );
  }

  Map<String, dynamic> toJson() => {
    'userId': userId,
    'name': name,
    'role': role,
  };
}

class WaiterCallModel {
  final String id;
  final String restaurantId;
  final String tableId;
  final String tableNumberSnapshot;
  final WaiterCallType requestType;
  final WaiterCallStatus status;
  final DateTime createdAt;
  final DateTime? expiresAt;
  final DateTime? acknowledgedAt;
  final StaffAttributionModel? acknowledgedBy;
  final DateTime? resolvedAt;
  final StaffAttributionModel? resolvedBy;

  WaiterCallModel({
    required this.id,
    required this.restaurantId,
    required this.tableId,
    required this.tableNumberSnapshot,
    required this.requestType,
    required this.status,
    required this.createdAt,
    this.expiresAt,
    this.acknowledgedAt,
    this.acknowledgedBy,
    this.resolvedAt,
    this.resolvedBy,
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
      case 'EXPIRED':
        status = WaiterCallStatus.expired;
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

    StaffAttributionModel? ackBy;
    if (json['acknowledgedBy'] is Map<String, dynamic>) {
      ackBy = StaffAttributionModel.fromJson(json['acknowledgedBy']);
    }

    StaffAttributionModel? resBy;
    if (json['resolvedBy'] is Map<String, dynamic>) {
      resBy = StaffAttributionModel.fromJson(json['resolvedBy']);
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
      expiresAt: json['expiresAt'] != null
          ? DateTime.tryParse(json['expiresAt'].toString())
          : null,
      acknowledgedAt: json['acknowledgedAt'] != null
          ? DateTime.tryParse(json['acknowledgedAt'].toString())
          : null,
      acknowledgedBy: ackBy,
      resolvedAt: json['resolvedAt'] != null
          ? DateTime.tryParse(json['resolvedAt'].toString())
          : null,
      resolvedBy: resBy,
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
    DateTime? acknowledgedAt,
    StaffAttributionModel? acknowledgedBy,
    DateTime? resolvedAt,
    StaffAttributionModel? resolvedBy,
  }) {
    return WaiterCallModel(
      id: id,
      restaurantId: restaurantId,
      tableId: tableId,
      tableNumberSnapshot: tableNumberSnapshot,
      requestType: requestType,
      status: status ?? this.status,
      createdAt: createdAt,
      expiresAt: expiresAt,
      acknowledgedAt: acknowledgedAt ?? this.acknowledgedAt,
      acknowledgedBy: acknowledgedBy ?? this.acknowledgedBy,
      resolvedAt: resolvedAt ?? this.resolvedAt,
      resolvedBy: resolvedBy ?? this.resolvedBy,
    );
  }
}
