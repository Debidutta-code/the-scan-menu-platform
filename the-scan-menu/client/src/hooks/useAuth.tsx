/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import apiClient from '../lib/api';

export interface ImpersonatedOutlet {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  impersonatedOutlet: ImpersonatedOutlet | null;
  activeRestaurantId: string | undefined;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  impersonateOutlet: (outlet: ImpersonatedOutlet) => void;
  exitImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState(true);
  const [impersonatedOutlet, setImpersonatedOutlet] = useState<ImpersonatedOutlet | null>(() => {
    const raw = localStorage.getItem('tsm_impersonated_outlet');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        try {
          const response = await apiClient.get('/auth/me');
          setUser(response.data.data.user);
          setIsLoading(false);
          return;
        } catch (err) {
          // Token is expired or invalid, proceed to silent refresh
        }
      }

      // No access token in memory/localStorage or it expired -> attempt silent refresh
      try {
        const refreshResponse = await apiClient.post('/auth/refresh', { clientType: 'web' });
        const newToken = refreshResponse.data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        setAccessToken(newToken);
        const meResponse = await apiClient.get('/auth/me');
        setUser(meResponse.data.data.user);
      } catch (refreshErr) {
        // Silent refresh failed -> user is logged out, clear any stale state
        localStorage.removeItem('accessToken');
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password, clientType: 'web' });
      const { accessToken: token, user: userData } = response.data.data;
      localStorage.setItem('accessToken', token);
      setAccessToken(token);
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      // Ignore failures on logout and clean local state
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('tsm_impersonated_outlet');
      setAccessToken(null);
      setUser(null);
      setImpersonatedOutlet(null);
      setIsLoading(false);
    }
  };

  const impersonateOutlet = (outlet: ImpersonatedOutlet) => {
    localStorage.setItem('tsm_impersonated_outlet', JSON.stringify(outlet));
    setImpersonatedOutlet(outlet);
  };

  const exitImpersonation = () => {
    localStorage.removeItem('tsm_impersonated_outlet');
    setImpersonatedOutlet(null);
  };

  const activeRestaurantId = impersonatedOutlet?.id || user?.restaurants?.[0] || undefined;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        impersonatedOutlet,
        activeRestaurantId,
        login,
        logout,
        impersonateOutlet,
        exitImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
