class CategoryModel {
  final String id;
  final String restaurantId;
  final String name;
  final String? description;
  final int sortOrder;
  final bool isActive;

  CategoryModel({
    required this.id,
    required this.restaurantId,
    required this.name,
    this.description,
    this.sortOrder = 0,
    required this.isActive,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['_id'] ?? json['id'] ?? '',
      restaurantId: json['restaurantId']?.toString() ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      sortOrder: json['sortOrder'] ?? 0,
      isActive: json['isActive'] ?? true,
    );
  }
}
