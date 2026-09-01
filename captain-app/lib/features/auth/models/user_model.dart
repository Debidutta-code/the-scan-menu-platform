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
  final String activePaymentMode; // 'PREPAID' | 'POSTPAID' | 'HYBRID'
  final String? upiId;
  final num taxRatePercent;
  final bool roundingEnabled;
  final String roundingStrategy; // 'NEAREST' | 'UP' | 'DOWN'
  final List<String> featureFlags;

  RestaurantProfile({
    required this.id,
    required this.name,
    required this.slug,
    required this.currency,
    this.address,
    this.phone,
    required this.orderWorkflowMode,
    this.activePaymentMode = 'POSTPAID',
    this.upiId,
    this.taxRatePercent = 0,
    this.roundingEnabled = true,
    this.roundingStrategy = 'NEAREST',
    this.featureFlags = const [],
  });

  bool get isPrepaid => activePaymentMode.toUpperCase() == 'PREPAID';

  factory RestaurantProfile.fromJson(Map<String, dynamic> json) {
    final settings = json['settings'] is Map ? json['settings'] : {};
    final workflow = settings['workflow'] is Map ? settings['workflow'] : {};
    final orderWorkflowMode = workflow['orderWorkflowMode'] ??
        json['orderWorkflowMode'] ??
        'FIVE_STEP';

    final activePaymentMode = json['activeMode'] ??
        settings['payment']?['activeMode'] ??
        settings['paymentConfig']?['activeMode'] ??
        'POSTPAID';

    final upiId = json['upiId'] ??
        settings['payment']?['upiId'] ??
        settings['paymentConfig']?['upiId'] ??
        settings['printerConfig']?['upiId'];

    final taxRate = json['taxRatePercent'] ??
        settings['payment']?['taxRatePercent'] ??
        settings['paymentConfig']?['taxRatePercent'] ??
        0;

    final roundingCfg = settings['roundingConfig'] is Map
        ? settings['roundingConfig']
        : json['roundingConfig'] is Map
            ? json['roundingConfig']
            : {};
    final roundingEnabled = roundingCfg['enabled'] != false;
    final roundingStrategy = roundingCfg['strategy']?.toString() ?? 'NEAREST';

    List<String> parsedFlags = [];
    if (json['featureFlags'] is List) {
      parsedFlags = (json['featureFlags'] as List)
          .where((f) => f['enabled'] == true)
          .map((f) => f['key'].toString())
          .toList();
    }

    return RestaurantProfile(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      currency: json['currency'] ?? 'INR',
      address: json['address'],
      phone: json['phone'],
      orderWorkflowMode: orderWorkflowMode,
      activePaymentMode: activePaymentMode.toString(),
      upiId: upiId != null && upiId.toString().trim().isNotEmpty
          ? upiId.toString().trim()
          : null,
      taxRatePercent: taxRate is num ? taxRate : 0,
      roundingEnabled: roundingEnabled,
      roundingStrategy: roundingStrategy,
      featureFlags: parsedFlags,
    );
  }
}
