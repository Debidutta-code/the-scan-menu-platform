import axios from 'axios';
import config from '../config';

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const handleAuthUnauthorized = () => {
  // Clear tokens & session state
  localStorage.removeItem('accessToken');
  localStorage.removeItem('tsm_impersonated_outlet');

  // Broadcast to AuthProvider to instantly update React state
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tsm_auth_unauthorized'));

    const currentPath = window.location.pathname;
    const isPublicRoute =
      currentPath.startsWith('/login') ||
      currentPath.startsWith('/customer-login') ||
      currentPath.startsWith('/customer-portal') ||
      currentPath.startsWith('/t/') ||
      currentPath.startsWith('/r/') ||
      currentPath === '/menu' ||
      currentPath === '/order' ||
      currentPath === '/display' ||
      currentPath === '/live-display';

    // Immediately redirect to login for any manager/admin or protected page
    if (!isPublicRoute) {
      const redirectQuery =
        currentPath && currentPath !== '/'
          ? `?redirect=${encodeURIComponent(currentPath + window.location.search)}`
          : '';
      window.location.href = `/login${redirectQuery}`;
    }
  }
};

// Request Interceptor to automatically attach accessToken & impersonation header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const impersonatedRaw = localStorage.getItem('tsm_impersonated_outlet');
    if (impersonatedRaw && config.headers) {
      try {
        const impersonated = JSON.parse(impersonatedRaw);
        if (impersonated?.id) {
          config.headers['x-impersonate-restaurant-id'] = impersonated.id;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor to handle silent refresh, 401s, and immediate login redirection
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // If the request was for /auth/login (i.e. user typed wrong password), don't redirect away from /login
      if (originalRequest?.url?.includes('/auth/login')) {
        return Promise.reject(error);
      }

      // Handle token expired (TOKEN_EXPIRED) with silent refresh attempt
      if (
        error.response.data?.error?.code === 'TOKEN_EXPIRED' &&
        !originalRequest._retry
      ) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const response = await axios.post(
            `${config.apiBaseUrl}/auth/refresh`,
            { clientType: 'web' },
            { withCredentials: true }
          );

          const newAccessToken = response.data.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          isRefreshing = false;

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          handleAuthUnauthorized();
          return Promise.reject(refreshError);
        }
      }

      // For any other 401 (invalid/revoked token, user deleted/disabled, unauthorized session)
      handleAuthUnauthorized();
    }

    return Promise.reject(error);
  }
);
export default apiClient;
