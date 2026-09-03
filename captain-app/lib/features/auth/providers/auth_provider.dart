import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/notifications/push_notification_service.dart';
import '../../../core/sockets/socket_service.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/user_model.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, mobileDisabled, error }

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final RestaurantProfile? activeRestaurant;
  final String? errorMessage;

  AuthState({
    required this.status,
    this.user,
    this.activeRestaurant,
    this.errorMessage,
  });

  factory AuthState.initial() => AuthState(status: AuthStatus.initial);

  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    RestaurantProfile? activeRestaurant,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      activeRestaurant: activeRestaurant ?? this.activeRestaurant,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient = ApiClient();
  final SocketService _socketService = SocketService();
  final PushNotificationService _pushNotificationService = PushNotificationService();

  AuthNotifier() : super(AuthState.initial()) {
    _apiClient.onMobileDisabled = (message) {
      if (state.status != AuthStatus.mobileDisabled) {
        state = state.copyWith(
          status: AuthStatus.mobileDisabled,
          errorMessage: message,
        );
      }
    };
    checkSession();
  }

  Future<void> checkSession() async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      await _apiClient.updateBaseUrl();
      final token = await SecureStorageService.getAccessToken();
      final refreshToken = await SecureStorageService.getRefreshToken();

      if (token == null && refreshToken == null) {
        state = state.copyWith(status: AuthStatus.unauthenticated);
        return;
      }

      // Check cached user profile for instant offline/glitch resilience
      UserModel? cachedUser;
      final cachedProfileStr = await SecureStorageService.getUserProfile();
      if (cachedProfileStr != null && cachedProfileStr.isNotEmpty) {
        try {
          final decoded = jsonDecode(cachedProfileStr);
          cachedUser = UserModel.fromJson(decoded);
        } catch (_) {}
      }

      try {
        final meRes = await _apiClient.dio.get(ApiConstants.me);
        if (meRes.data['success'] == true) {
          final userData = UserModel.fromJson(meRes.data['data']['user']);

          // Check if user is staff or manager
          if (userData.role != 'STAFF' && userData.role != 'MANAGER' && userData.role != 'SUPER_ADMIN') {
            await logout();
            state = state.copyWith(
              status: AuthStatus.error,
              errorMessage: 'Access restricted to Staff and Captains only.',
            );
            return;
          }

          // Cache verified user profile
          await SecureStorageService.saveUserProfile(jsonEncode(meRes.data['data']['user']));

          String? savedRestaurantId = await SecureStorageService.getActiveRestaurantId();
          
          // Ensure savedRestaurantId is in assigned restaurants
          if (savedRestaurantId == null ||
              (userData.role != 'SUPER_ADMIN' &&
               userData.restaurants.isNotEmpty &&
               !userData.restaurants.contains(savedRestaurantId))) {
            savedRestaurantId = userData.restaurants.isNotEmpty
                ? userData.restaurants.first
                : null;
            if (savedRestaurantId != null) {
              await SecureStorageService.saveActiveRestaurantId(savedRestaurantId);
            }
          }

          RestaurantProfile? restaurant;
          if (savedRestaurantId != null) {
            try {
              final restRes = await _apiClient.dio
                  .get(ApiConstants.restaurantProfile(savedRestaurantId));
              if (restRes.data['success'] == true) {
                restaurant = RestaurantProfile.fromJson(restRes.data['data']);
              }
            } catch (_) {
              if (userData.restaurants.isNotEmpty &&
                  userData.restaurants.first != savedRestaurantId) {
                savedRestaurantId = userData.restaurants.first;
                await SecureStorageService.saveActiveRestaurantId(savedRestaurantId);
                try {
                  final fallbackRes = await _apiClient.dio
                      .get(ApiConstants.restaurantProfile(savedRestaurantId));
                  if (fallbackRes.data['success'] == true) {
                    restaurant = RestaurantProfile.fromJson(fallbackRes.data['data']);
                  }
                } catch (_) {}
              }
            }

            // Connect socket & sync push notification token
            await _socketService.connect(savedRestaurantId);
            _pushNotificationService.syncTokenWithServer(restaurantId: savedRestaurantId);
          }

          // Check if Mobile App access is enabled for this restaurant
          if (userData.role != 'SUPER_ADMIN' && restaurant != null) {
            final isMobileEnabled = restaurant.featureFlags.contains('mobile_app');
            if (!isMobileEnabled) {
              state = state.copyWith(
                status: AuthStatus.mobileDisabled,
                user: userData,
                activeRestaurant: restaurant,
                errorMessage: 'Mobile application access is disabled for ${restaurant.name}.',
              );
              return;
            }
          }

          // ignore: avoid_print
          print('[AUTH] Persistent Mobile Session Verified -> ${userData.email} | Rest: $savedRestaurantId');

          state = state.copyWith(
            status: AuthStatus.authenticated,
            user: userData,
            activeRestaurant: restaurant,
          );
          return;
        } else {
          await logout();
          state = state.copyWith(status: AuthStatus.unauthenticated);
          return;
        }
      } on DioException catch (dioErr) {
        final statusCode = dioErr.response?.statusCode;
        // If explicitly unauthorized (e.g. invalid/revoked token after refresh failed)
        if (statusCode == 401 || statusCode == 403) {
          // ignore: avoid_print
          print('[AUTH] Session Revoked/Unauthorized (HTTP $statusCode) -> logging out');
          await logout();
          state = state.copyWith(status: AuthStatus.unauthenticated);
          return;
        }

        // Connection timeout, network offline, or server restarting
        // If we have cached credentials, maintain authenticated state and do NOT logout!
        if (cachedUser != null) {
          final savedRestaurantId = await SecureStorageService.getActiveRestaurantId();
          // ignore: avoid_print
          print('[AUTH] Offline/Network hiccup: Maintaining persistent mobile session for ${cachedUser.email}');

          state = state.copyWith(
            status: AuthStatus.authenticated,
            user: cachedUser,
          );

          if (savedRestaurantId != null) {
            _socketService.connect(savedRestaurantId);
          }
          return;
        }

        // If no cached user and network failed
        state = state.copyWith(
          status: AuthStatus.error,
          errorMessage: 'Network connection issue. Please check your internet.',
        );
      }
    } catch (e) {
      // ignore: avoid_print
      print('[AUTH] checkSession unexpected error: $e');
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      await _apiClient.updateBaseUrl();
      final response = await _apiClient.dio.post(
        ApiConstants.login,
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
          'clientType': 'mobile',
        },
      );

      if (response.data['success'] == true) {
        final data = response.data['data'];
        final accessToken = data['accessToken'] as String;
        final refreshToken = data['refreshToken'] as String?;
        final userData = UserModel.fromJson(data['user']);

        if (!userData.isActive) {
          throw ApiException(message: 'Your account has been deactivated.');
        }

        await SecureStorageService.saveTokens(
          accessToken: accessToken,
          refreshToken: refreshToken,
        );

        // Cache user profile for instant persistent startup
        await SecureStorageService.saveUserProfile(jsonEncode(data['user']));

        String? activeRestaurantId;
        if (userData.restaurants.isNotEmpty) {
          activeRestaurantId = userData.restaurants.first;
          await SecureStorageService.saveActiveRestaurantId(activeRestaurantId);
        }

        RestaurantProfile? restaurant;
        if (activeRestaurantId != null) {
          try {
            final restRes = await _apiClient.dio
                .get(ApiConstants.restaurantProfile(activeRestaurantId));
            if (restRes.data['success'] == true) {
              restaurant = RestaurantProfile.fromJson(restRes.data['data']);
            }
          } catch (_) {}
        }

        // Check if Mobile App access is enabled for this restaurant
        if (userData.role != 'SUPER_ADMIN' && restaurant != null) {
          final isMobileEnabled = restaurant.featureFlags.contains('mobile_app');
          if (!isMobileEnabled) {
            state = state.copyWith(
              status: AuthStatus.mobileDisabled,
              user: userData,
              activeRestaurant: restaurant,
              errorMessage: 'Mobile application access is disabled for ${restaurant.name}.',
            );
            return;
          }
        }

        if (activeRestaurantId != null) {
          await _socketService.connect(activeRestaurantId);
          _pushNotificationService.syncTokenWithServer(restaurantId: activeRestaurantId);
        }

        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: userData,
          activeRestaurant: restaurant,
        );
      } else {
        throw ApiException(message: response.data['error']?['message'] ?? 'Login failed');
      }
    } on DioException catch (dioErr) {
      final formatted = _apiClient.formatDioError(dioErr);
      final errorCode = dioErr.response?.data?['error']?['code'];
      if (errorCode == 'MOBILE_APP_DISABLED') {
        state = state.copyWith(
          status: AuthStatus.mobileDisabled,
          errorMessage: formatted.message,
        );
        return;
      }
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: formatted.message,
      );
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> selectRestaurant(String restaurantId) async {
    try {
      await SecureStorageService.saveActiveRestaurantId(restaurantId);
      final restRes =
          await _apiClient.dio.get(ApiConstants.restaurantProfile(restaurantId));
      if (restRes.data['success'] == true) {
        final restaurant = RestaurantProfile.fromJson(restRes.data['data']);
        state = state.copyWith(activeRestaurant: restaurant);
        await _socketService.connect(restaurantId);
        _pushNotificationService.syncTokenWithServer(restaurantId: restaurantId);
      }
    } catch (_) {}
  }

  Future<void> logout() async {
    try {
      // 1. Unregister device push token
      await _pushNotificationService.unregisterToken();

      // 2. Revoke refresh token on server
      final refreshToken = await SecureStorageService.getRefreshToken();
      if (refreshToken != null) {
        await _apiClient.dio.post(
          ApiConstants.logout,
          data: {'refreshToken': refreshToken},
        );
      }
    } catch (_) {}
    
    // 3. Clear local tokens & cached profile
    await SecureStorageService.clearTokens();
    await SecureStorageService.clearUserProfile();
    _socketService.disconnect();
    state = AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
