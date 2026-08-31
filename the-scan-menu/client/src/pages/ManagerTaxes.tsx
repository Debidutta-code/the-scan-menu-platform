import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ManagerTaxes — Legacy route redirector.
 * Tax Management has been elevated and secured within ManagerSettings.tsx (Taxes & Compliance tab).
 */
export const ManagerTaxes: React.FC = () => {
  return <Navigate to="/manager/settings?tab=taxes" replace />;
};

export default ManagerTaxes;
