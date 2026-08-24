import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { TaxManagementSection } from '../components/settings/TaxManagementSection';
import { AlertCircle } from 'lucide-react';

export const ManagerTaxes: React.FC = () => {
  const { activeRestaurantId } = useAuth();

  if (!activeRestaurantId) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3 animate-pulse" />
        <h3 className="font-bold text-slate-800">No Restaurant Configured</h3>
      </div>
    );
  }

  return <TaxManagementSection restaurantId={activeRestaurantId} />;
};

export default ManagerTaxes;
