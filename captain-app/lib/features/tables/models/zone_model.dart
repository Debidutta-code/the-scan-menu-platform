class ZoneModel {
  final String id;
  final String restaurantId;
  final String name;
  final bool isActive;

  ZoneModel({
    required this.id,
    required this.restaurantId,
    required this.name,
    required this.isActive,
  });

  factory ZoneModel.fromJson(Map<String, dynamic> json) {
    return ZoneModel(
      id: json['_id'] ?? json['id'] ?? '',
      restaurantId: json['restaurantId']?.toString() ?? '',
      name: json['name'] ?? '',
      isActive: json['isActive'] ?? true,
    );
  }
}
