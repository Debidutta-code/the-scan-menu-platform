class UserModel {
  final String id;
  final String email;
  final String name;
  final String role;
  final bool isActive;
  final List<String> restaurants;

  UserModel({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.isActive,
    required this.restaurants,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['_id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? '',
      role: json['role'] ?? 'STAFF',
      isActive: json['isActive'] ?? true,
      restaurants: (json['restaurants'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'role': role,
        'isActive': isActive,
        'restaurants': restaurants,
      };
}

class RestaurantProfile {
  final String id;
  final String name;
  final String slug;
  final String currency;
  final String? address;
  final String? phone;
  final String orderWorkflowMode;

  RestaurantProfile({
    required this.id,
    required this.name,
    required this.slug,
    required this.currency,
    this.address,
    this.phone,
    required this.orderWorkflowMode,
  });

  factory RestaurantProfile.fromJson(Map<String, dynamic> json) {
    final settings = json['settings'] is Map ? json['settings'] : {};
    final workflow = settings['workflow'] is Map ? settings['workflow'] : {};
    final orderWorkflowMode = workflow['orderWorkflowMode'] ??
        json['orderWorkflowMode'] ??
        'FIVE_STEP';

    return RestaurantProfile(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      currency: json['currency'] ?? 'INR',
      address: json['address'],
      phone: json['phone'],
      orderWorkflowMode: orderWorkflowMode,
    );
  }
}
