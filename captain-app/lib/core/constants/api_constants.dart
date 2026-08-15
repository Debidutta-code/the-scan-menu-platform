class ApiConstants {
  // Remote Render backend URL (or change via Login Screen settings button for local IP development)
  static const String defaultBaseUrl = 'https://the-scan-menu.onrender.com';
  static const String apiV1Path = '/api/v1';

  // Auth endpoints
  static const String login = '$apiV1Path/auth/login';
  static const String refresh = '$apiV1Path/auth/refresh';
  static const String logout = '$apiV1Path/auth/logout';
  static const String me = '$apiV1Path/auth/me';
  static const String updateProfile = '$apiV1Path/auth/profile';

  // Restaurant scoped endpoints
  static String restaurantProfile(String restaurantId) =>
      '$apiV1Path/restaurants/$restaurantId';

  static String tables(String restaurantId) =>
      '$apiV1Path/restaurants/$restaurantId/tables';

  static String tableZones(String restaurantId) =>
      '$apiV1Path/restaurants/$restaurantId/zones';

  static String categories(String restaurantId) =>
      '$apiV1Path/restaurants/$restaurantId/categories';

  static String menuItems(String restaurantId) =>
      '$apiV1Path/restaurants/$restaurantId/menu-items';

  static String toggleItemAvailability(String restaurantId, String itemId) =>
      '$apiV1Path/restaurants/$restaurantId/menu-items/$itemId/availability';

  static String createOrder(String restaurantId) =>
      '$apiV1Path/restaurants/$restaurantId/orders/counter';

  static String activeOrders(String restaurantId) =>
      '$apiV1Path/restaurants/$restaurantId/orders/active';

  static String allOrders(String restaurantId) =>
      '$apiV1Path/restaurants/$restaurantId/orders';

  static String orderDetails(String restaurantId, String orderId) =>
      '$apiV1Path/restaurants/$restaurantId/orders/$orderId';

  static String updateOrderStatus(String restaurantId, String orderId) =>
      '$apiV1Path/restaurants/$restaurantId/orders/$orderId/status';

  static String updateItemStatus(
          String restaurantId, String orderId, int itemIndex) =>
      '$apiV1Path/restaurants/$restaurantId/orders/$orderId/items/$itemIndex/status';

  static String clearOrder(String restaurantId, String orderId) =>
      '$apiV1Path/restaurants/$restaurantId/orders/$orderId/clear';

  static String tableOrders(String restaurantId, String tableId) =>
      '$apiV1Path/restaurants/$restaurantId/tables/$tableId/orders';

  static String closeSession(String restaurantId, String sessionId) =>
      '$apiV1Path/restaurants/$restaurantId/table-sessions/$sessionId/close';

  static String waiterCalls(String restaurantId) =>
      '$apiV1Path/restaurants/$restaurantId/waiter-calls';

  static String acknowledgeWaiterCall(String restaurantId, String callId) =>
      '$apiV1Path/restaurants/$restaurantId/waiter-calls/$callId/acknowledge';

  static String resolveWaiterCall(String restaurantId, String callId) =>
      '$apiV1Path/restaurants/$restaurantId/waiter-calls/$callId/resolve';

  // Socket Events
  static const String socketEventJoinRestaurant = 'join_restaurant';
  static const String socketEventJoinedRestaurant = 'joined_restaurant';
  static const String socketEventOrderCreated = 'order:created';
  static const String socketEventOrderStatusUpdated = 'order:status_updated';
  static const String socketEventOrderItemStatusUpdated = 'order:item_status_updated';
  static const String socketEventWaiterCallCreated = 'waiter_call:created';
  static const String socketEventWaiterCallResolved = 'waiter_call:resolved';
  static const String socketEventSessionUpdated = 'session:updated';
  static const String socketEventInventoryUpdated = 'inventory:updated';
}
