/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import api from '../../lib/api';
import { useAuth } from '../useAuth';

interface FeatureFlag {
  key: string;
  enabled: boolean;
}

interface FeatureFlagContextType {
  flags: Record<string, boolean>;
  isLoading: boolean;
  error: Error | null;
  isEnabled: (key: string) => boolean;
  refreshFlags: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

interface FeatureFlagProviderProps {
  children: ReactNode;
}

export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({ children }) => {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  // Extract restaurantId from authenticated user context (user.restaurants array or fallback restaurantId property)
  const activeRestaurantId = user?.restaurants?.[0] || (user as any)?.restaurantId;

  const fetchFlags = useCallback(async () => {
    // If no restaurantId is provided, we might be in a context where flags aren't needed yet, or it's a global public view
    // For this implementation, we assume we need a restaurantId to fetch specific flags.
    if (!activeRestaurantId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      // Fetch flags from the backend
      const response = await api.get(`/restaurants/${activeRestaurantId}/feature-flags`);

      const flagsMap: Record<string, boolean> = {};

      if (response.data && response.data.data) {
          response.data.data.forEach((flag: FeatureFlag) => {
             flagsMap[flag.key] = flag.enabled;
          });
      }

      setFlags(flagsMap);
    } catch (err: any) {
      console.error('Failed to fetch feature flags', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags, user]); // Refetch if restaurantId or user changes

  const isEnabled = (key: string) => {
    // If the flag doesn't exist, we assume it's disabled by default
    return !!flags[key];
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, isLoading, error, isEnabled, refreshFlags: fetchFlags }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};
