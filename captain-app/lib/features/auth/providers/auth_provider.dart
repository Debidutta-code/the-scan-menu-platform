import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/sockets/socket_service.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/user_model.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

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

  AuthNotifier() : super(AuthState.initial()) {
    checkSession();
  }

  Future<void> checkSession() async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      await _apiClient.updateBaseUrl();
      final token = await SecureStorageService.getAccessToken();
      if (token == null) {
        state = state.copyWith(status: AuthStatus.unauthenticated);
        return;
      }

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

        String? savedRestaurantId = await SecureStorageService.getActiveRestaurantId();
        
        // Ensure savedRestaurantId is actually in the user's assigned restaurants
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
            // If fetching failed with stale ID, fallback to first assigned restaurant
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

          // Connect socket
          await _socketService.connect(savedRestaurantId);
        }

        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: userData,
          activeRestaurant: restaurant,
        );
      } else {
        await logout();
        state = state.copyWith(status: AuthStatus.unauthenticated);
      }
    } catch (e) {
      await logout();
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

          await _socketService.connect(activeRestaurantId);
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
      }
    } catch (_) {}
  }

  Future<void> logout() async {
    try {
      final refreshToken = await SecureStorageService.getRefreshToken();
      await _apiClient.dio.post(
        ApiConstants.logout,
        data: {'refreshToken': refreshToken},
      );
    } catch (_) {}
    await SecureStorageService.clearTokens();
    _socketService.disconnect();
    state = AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
