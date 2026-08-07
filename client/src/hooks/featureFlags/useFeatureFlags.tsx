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

const CACHE_PREFIX = 'pixora_flags_';

function readCache(restaurantId: string): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${restaurantId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(restaurantId: string, flags: Record<string, boolean>): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${restaurantId}`, JSON.stringify(flags));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({ children }) => {
  const { user } = useAuth();

  // Extract restaurantId from authenticated user context (user.restaurants array or fallback restaurantId property)
  const activeRestaurantId = user?.restaurants?.[0] || (user as any)?.restaurantId;

  // Seed initial state from localStorage so the sidebar renders fully on first paint (no layout jump)
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    if (!activeRestaurantId) return {};
    return readCache(activeRestaurantId) ?? {};
  });

  // isLoading is only true when there is no cached data — prevents spinner on subsequent loads
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!activeRestaurantId) return false;
    return readCache(activeRestaurantId) === null;
  });

  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    // If no restaurantId is provided, we might be in a context where flags aren't needed yet
    if (!activeRestaurantId) {
      setIsLoading(false);
      return;
    }

    try {
      // Only show loading spinner when there is no cached data to display
      if (readCache(activeRestaurantId) === null) {
        setIsLoading(true);
      }
      setError(null);

      const response = await api.get(`/restaurants/${activeRestaurantId}/feature-flags`);

      const flagsMap: Record<string, boolean> = {};

      if (response.data && response.data.data) {
        response.data.data.forEach((flag: FeatureFlag) => {
          flagsMap[flag.key] = flag.enabled;
        });
      }

      setFlags(flagsMap);
      writeCache(activeRestaurantId, flagsMap);
    } catch (err: any) {
      console.error('Failed to fetch feature flags', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurantId]);

  // Re-seed from cache when restaurantId changes (e.g. impersonation switch)
  useEffect(() => {
    if (!activeRestaurantId) return;
    const cached = readCache(activeRestaurantId);
    if (cached) {
      setFlags(cached);
      setIsLoading(false);
    } else {
      setFlags({});
      setIsLoading(true);
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
