import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/api';

export interface CustomerProfile {
  id: string;
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  totalOrdersCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  lifetimePointsEarned: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  redeemableRupees: number;
  lastOrderAt?: string;
  createdAt?: string;
}

const CUSTOMER_TOKEN_KEY = 'pixora_customer_token';
const CUSTOMER_PROFILE_KEY = 'pixora_customer_profile';

export const useCustomerAuth = () => {
  const [customerToken, setCustomerToken] = useState<string | null>(() => {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
  });

  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    const raw = localStorage.getItem(CUSTOMER_PROFILE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate token on mount
  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return null;
    }

    try {
      const res = await apiClient.get('/public/customers/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data?.success && res.data.data?.customer) {
        const c = res.data.data.customer;
        const pts = c.loyaltyPoints || 0;
        const prof: CustomerProfile = {
          id: c._id || c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          totalOrdersCount: c.totalOrdersCount || 0,
          totalSpent: c.totalSpent || 0,
          loyaltyPoints: pts,
          lifetimePointsEarned: c.lifetimePointsEarned || pts,
          tier: c.tier || 'BRONZE',
          redeemableRupees: c.redeemableRupees !== undefined ? c.redeemableRupees : (pts * 50) / 100,
          lastOrderAt: c.lastOrderAt,
          createdAt: c.createdAt,
        };
        setCustomer(prof);
        localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(prof));
        setIsLoading(false);
        return prof;
      }
    } catch {
      // Invalid/expired token
      localStorage.removeItem(CUSTOMER_TOKEN_KEY);
      localStorage.removeItem(CUSTOMER_PROFILE_KEY);
      setCustomerToken(null);
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshProfile();

    const handleFocus = () => {
      refreshProfile();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refreshProfile]);

  const sendOtp = async (phone: string, restaurantSlug?: string, restaurantId?: string) => {
    const res = await apiClient.post('/public/customers/send-otp', {
      phone,
      restaurantSlug,
      restaurantId,
    });
    return res.data;
  };

  const verifyOtp = async (
    phone: string,
    otp: string,
    restaurantSlug?: string,
    restaurantId?: string,
    name?: string
  ) => {
    const res = await apiClient.post('/public/customers/verify-otp', {
      phone,
      otp,
      name,
      restaurantSlug,
      restaurantId,
    });

    if (res.data?.success && res.data.data?.customerToken) {
      const token = res.data.data.customerToken;
      const c = res.data.data.customer;
      const pts = c.loyaltyPoints || 0;
      const prof: CustomerProfile = {
        id: c._id || c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalOrdersCount: c.totalOrdersCount || 0,
        totalSpent: c.totalSpent || 0,
        loyaltyPoints: pts,
        lifetimePointsEarned: c.lifetimePointsEarned || pts,
        tier: c.tier || 'BRONZE',
        redeemableRupees: c.redeemableRupees !== undefined ? c.redeemableRupees : (pts * 50) / 100,
        lastOrderAt: c.lastOrderAt,
        createdAt: c.createdAt,
      };

      setCustomerToken(token);
      setCustomer(prof);
      localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
      localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(prof));
    }

    return res.data;
  };

  const updateProfile = async (data: { name?: string; email?: string }) => {
    const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
    if (!token) throw new Error('Not authenticated');

    const res = await apiClient.patch('/public/customers/profile', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.data?.success) {
      await refreshProfile();
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_PROFILE_KEY);
    setCustomerToken(null);
    setCustomer(null);
  };

  const switchCustomer = () => {
    logout();
  };

  return {
    customer,
    customerToken,
    isAuthenticated: !!customerToken && !!customer,
    isLoading,
    sendOtp,
    verifyOtp,
    updateProfile,
    refreshProfile,
    logout,
    switchCustomer,
  };
};

export default useCustomerAuth;
