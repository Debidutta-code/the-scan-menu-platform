enum TableStatus { available, occupied, billRequested, reserved }

class TableModel {
  final String id;
  final String restaurantId;
  final String? zoneId;
  final String tableNumber;
  final String displayName;
  final String token;
  final bool isActive;
  final TableStatus status;
  final int activeOrderCount;
  final int totalAmountInPaise;
  final DateTime? seatedAt;

  TableModel({
    required this.id,
    required this.restaurantId,
    this.zoneId,
    required this.tableNumber,
    required this.displayName,
    required this.token,
    required this.isActive,
    required this.status,
    this.activeOrderCount = 0,
    this.totalAmountInPaise = 0,
    this.seatedAt,
  });

  factory TableModel.fromJson(Map<String, dynamic> json) {
    TableStatus status = TableStatus.available;
    final rawStatus = (json['status'] ?? 'AVAILABLE').toString().toUpperCase();
    final activeOrders = json['activeOrderCount'] as int? ?? 0;
    final activeSession = json['activeSession'];

    if (rawStatus == 'OCCUPIED' || activeOrders > 0 || activeSession != null) {
      if (activeSession is Map && activeSession['status'] == 'BILL_REQUESTED') {
        status = TableStatus.billRequested;
      } else {
        status = TableStatus.occupied;
      }
    } else if (rawStatus == 'RESERVED') {
      status = TableStatus.reserved;
    }

    DateTime? seatedAt;
    if (activeSession is Map && activeSession['openedAt'] != null) {
      try {
        seatedAt = DateTime.parse(activeSession['openedAt']);
      } catch (_) {}
    }

    int total = 0;
    if (activeSession is Map && activeSession['total'] != null) {
      total = (activeSession['total'] as num).toInt();
    }

    String? zoneId;
    if (json['zoneId'] is Map) {
      zoneId = json['zoneId']['_id'] ?? json['zoneId']['id'];
    } else if (json['zoneId'] is String) {
      zoneId = json['zoneId'];
    }

    return TableModel(
      id: json['_id'] ?? json['id'] ?? '',
      restaurantId: json['restaurantId']?.toString() ?? '',
      zoneId: zoneId,
      tableNumber: json['tableNumber'] ?? '',
      displayName: json['displayName'] ?? json['tableNumber'] ?? '',
      token: json['token'] ?? '',
      isActive: json['isActive'] ?? true,
      status: status,
      activeOrderCount: activeOrders,
      totalAmountInPaise: total,
      seatedAt: seatedAt,
    );
  }

  TableModel copyWith({
    String? id,
    String? restaurantId,
    String? zoneId,
    String? tableNumber,
    String? displayName,
    String? token,
    bool? isActive,
    TableStatus? status,
    int? activeOrderCount,
    int? totalAmountInPaise,
    DateTime? seatedAt,
  }) {
    return TableModel(
      id: id ?? this.id,
      restaurantId: restaurantId ?? this.restaurantId,
      zoneId: zoneId ?? this.zoneId,
      tableNumber: tableNumber ?? this.tableNumber,
      displayName: displayName ?? this.displayName,
      token: token ?? this.token,
      isActive: isActive ?? this.isActive,
      status: status ?? this.status,
      activeOrderCount: activeOrderCount ?? this.activeOrderCount,
      totalAmountInPaise: totalAmountInPaise ?? this.totalAmountInPaise,
      seatedAt: seatedAt ?? this.seatedAt,
    );
  }
}
