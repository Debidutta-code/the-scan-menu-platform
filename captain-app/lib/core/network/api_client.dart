import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';
import 'api_exceptions.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;
  bool _isRefreshing = false;
  final List<void Function(String token)> _refreshQueue = [];

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.defaultBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _setupInterceptors();
  }

  Future<void> updateBaseUrl() async {
    final storedUrl = await SecureStorageService.getBaseUrl();
    if (storedUrl != null && storedUrl.trim().isNotEmpty) {
      dio.options.baseUrl = storedUrl.trim().replaceAll(RegExp(r'/+$'), '');
    } else {
      dio.options.baseUrl = ApiConstants.defaultBaseUrl;
    }
  }

  void _setupInterceptors() {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorageService.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          // ignore: avoid_print
          print('[HTTP REQ] ${options.method} ${options.baseUrl}${options.path} (Has Auth: ${token != null && token.isNotEmpty})');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          // ignore: avoid_print
          print('[HTTP RES ${response.statusCode}] ${response.requestOptions.path}');
          return handler.next(response);
        },
        onError: (DioException error, handler) async {
          final response = error.response;
          // ignore: avoid_print
          print('[HTTP ERR ${response?.statusCode}] ${error.requestOptions.baseUrl}${error.requestOptions.path} => Response Body: ${response?.data}');

          // Check if token expired (401 with TOKEN_EXPIRED code)
          final isTokenExpired = response?.statusCode == 401 &&
              response?.data is Map &&
              response?.data['error']?['code'] == 'TOKEN_EXPIRED';

          if (isTokenExpired && error.requestOptions.extra['retry'] != true) {
            if (_isRefreshing) {
              // Wait in queue for current refresh attempt
              _refreshQueue.add((newToken) {
                error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
                error.requestOptions.extra['retry'] = true;
                dio.fetch(error.requestOptions).then(
                  (res) => handler.resolve(res),
                  onError: (e) => handler.reject(e),
                );
              });
              return;
            }

            _isRefreshing = true;
            try {
              final refreshToken = await SecureStorageService.getRefreshToken();
              if (refreshToken == null) {
                await SecureStorageService.clearTokens();
                return handler.next(error);
              }

              final refreshResponse = await dio.post(
                ApiConstants.refresh,
                data: {'refreshToken': refreshToken},
                options: Options(extra: {'retry': true}),
              );

              final newAccessToken =
                  refreshResponse.data['data']['accessToken'] as String;
              final newRefreshToken =
                  refreshResponse.data['data']['refreshToken'] as String?;

              await SecureStorageService.saveTokens(
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              );

              // Notify queue
              for (final callback in _refreshQueue) {
                callback(newAccessToken);
              }
              _refreshQueue.clear();
              _isRefreshing = false;

              // Retry original request
              error.requestOptions.headers['Authorization'] =
                  'Bearer $newAccessToken';
              error.requestOptions.extra['retry'] = true;
              final retryResponse = await dio.fetch(error.requestOptions);
              return handler.resolve(retryResponse);
            } catch (refreshErr) {
              _isRefreshing = false;
              _refreshQueue.clear();
              await SecureStorageService.clearTokens();
              return handler.next(error);
            }
          }

          return handler.next(error);
        },
      ),
    );
  }

  // Helper method to unwrap standard response envelopes and throw ApiException
  ApiException formatDioError(DioException error) {
    if (error.response?.data is Map) {
      final data = error.response!.data as Map<String, dynamic>;
      final errorMap = data['error'];
      if (errorMap is Map) {
        return ApiException(
          message: errorMap['message'] ?? 'An error occurred',
          code: errorMap['code'],
          statusCode: error.response?.statusCode,
          details: errorMap['details'],
        );
      }
    }
    return ApiException(
      message: error.message ?? 'Network connection failed',
      statusCode: error.response?.statusCode,
    );
  }
}
