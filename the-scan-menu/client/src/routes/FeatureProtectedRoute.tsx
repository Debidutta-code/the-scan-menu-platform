import React from 'react';
import { Outlet } from 'react-router-dom';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { ModuleRestrictedState } from '../components/ModuleRestrictedState';

interface FeatureProtectedRouteProps {
  requiredFeature?: string;
  requiredAnyFeatures?: string[];
  featureName?: string;
}

export const FeatureProtectedRoute: React.FC<FeatureProtectedRouteProps> = ({
  requiredFeature,
  requiredAnyFeatures,
  featureName,
}) => {
  const { isEnabled, isLoading } = useFeatureFlags();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  let allowed = true;

  if (requiredFeature) {
    allowed = isEnabled(requiredFeature);
  } else if (requiredAnyFeatures && requiredAnyFeatures.length > 0) {
    allowed = requiredAnyFeatures.some((key) => isEnabled(key));
  }

  if (!allowed) {
    const displayName =
      featureName ||
      (requiredFeature
        ? requiredFeature.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        : 'This Feature');

    return (
      <ModuleRestrictedState
        featureName={displayName}
        featureKey={requiredFeature || requiredAnyFeatures?.join(', ')}
      />
    );
  }

  return <Outlet />;
};

export default FeatureProtectedRoute;
