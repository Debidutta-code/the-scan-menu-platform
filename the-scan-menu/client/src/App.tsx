import { FeatureFlagProvider, useFeatureFlags } from './hooks/featureFlags/useFeatureFlags';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import ProtectedRoute from './routes/ProtectedRoute';
import FeatureProtectedRoute from './routes/FeatureProtectedRoute';
import { getPrimaryManagerRoute } from './utils/navigation';
import Login from './pages/Login';
import NetworkToast from './components/NetworkToast';

// Super Admin Pages & Layout
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminRestaurants from './pages/AdminRestaurants';
import AdminRestaurantDetail from './pages/AdminRestaurantDetail';
import AdminSetupHub from './pages/AdminSetupHub';
import AdminSubscriptions from './pages/AdminSubscriptions';
import AdminPOSIntegrations from './pages/AdminPOSIntegrations';
import AdminPaymentGateways from './pages/AdminPaymentGateways';
import AdminAuditLogs from './pages/AdminAuditLogs';

import AdminAnalytics from './pages/AdminAnalytics';
import AdminFeatureFlags from './pages/AdminFeatureFlags';
import AdminLoyalty from './pages/AdminLoyalty';
import AdminProfile from './pages/AdminProfile';

// Manager & Staff Pages & Layout
import ManagerLayout from './components/ManagerLayout';
import ManagerOrders from './pages/ManagerOrders';
import ManagerCounter from './pages/ManagerCounter';
import ManagerKDS from './pages/ManagerKDS';
import ManagerWaiterCalls from './pages/ManagerWaiterCalls';
import ManagerTables from './pages/ManagerTables';
import ManagerMenu from './pages/ManagerMenu';
import ManagerMenuAvailability from './pages/ManagerMenuAvailability';
import ManagerInventory from './pages/ManagerInventory';

import ManagerStaff from './pages/ManagerStaff';
import ManagerTaxes from './pages/ManagerTaxes';
import ManagerSettings from './pages/ManagerSettings';
import ManagerAnalytics from './pages/ManagerAnalytics';
import ManagerDeveloper from './pages/ManagerDeveloper';
import ManagerProfile from './pages/ManagerProfile';
import ManagerTransactions from './pages/ManagerTransactions';
import ManagerTableOperations from './pages/ManagerTableOperations';

import PublicTable from './pages/PublicTable';
import PublicOrderConfirmation from './pages/PublicOrderConfirmation';
import PublicSessionlessOrder from './pages/PublicSessionlessOrder';
import PublicCustomerLogin from './pages/PublicCustomerLogin';
import PublicCustomerPortal from './pages/PublicCustomerPortal';
import PublicLiveDisplay from './pages/PublicLiveDisplay';
import ManagerCustomers from './pages/ManagerCustomers';

const DashboardRedirect = () => {
  const { user } = useAuth();
  const { isEnabled, isLoading } = useFeatureFlags();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }
  const targetRoute = getPrimaryManagerRoute(isEnabled, user?.role);
  return <Navigate to={targetRoute} replace />;
};

export const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <FeatureFlagProvider>
            <NetworkToast />
            <Routes>
              {/* Public customer dining view (Subdomain-aware) */}
              <Route path="/t/:tableToken" element={<PublicTable />} />
              <Route path="/t/:tableToken/order/:orderId" element={<PublicOrderConfirmation />} />
              <Route path="/menu" element={<PublicSessionlessOrder />} />
              <Route path="/order" element={<PublicSessionlessOrder />} />
              <Route path="/display" element={<PublicLiveDisplay />} />
              <Route path="/live-display" element={<PublicLiveDisplay />} />

              {/* Public customer dining view (Legacy path-based fallback) */}
              <Route path="/r/:restaurantSlug/t/:tableToken" element={<PublicTable />} />
              <Route path="/r/:restaurantSlug/t/:tableToken/order/:orderId" element={<PublicOrderConfirmation />} />
              <Route path="/r/:restaurantSlug/order" element={<PublicSessionlessOrder />} />
              <Route path="/r/:restaurantSlug/display" element={<PublicLiveDisplay />} />
              <Route path="/r/:restaurantSlug/live-display" element={<PublicLiveDisplay />} />

              {/* Dedicated Customer Auth & Portal Routes */}
              <Route path="/customer-login" element={<PublicCustomerLogin />} />
              <Route path="/customer-portal" element={<PublicCustomerPortal />} />
              <Route path="/r/:restaurantSlug/login" element={<PublicCustomerLogin />} />
              <Route path="/r/:restaurantSlug/portal" element={<PublicCustomerPortal />} />

              {/* Public login (Staff / Manager / SuperAdmin) */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes (all roles) - root redirect */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardRedirect />} />
              </Route>

              {/* Super Admin routes under AdminLayout */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/setup-hub" element={<AdminSetupHub />} />
                  <Route path="/admin/restaurants" element={<AdminRestaurants />} />
                  <Route path="/admin/restaurants/provision" element={<Navigate to="/admin/setup-hub" replace />} />
                  <Route path="/admin/restaurants/:id" element={<AdminRestaurantDetail />} />
                  <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                  <Route path="/admin/pos-integrations" element={<AdminPOSIntegrations />} />
                  <Route path="/admin/payments" element={<AdminPaymentGateways />} />
                  <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />

                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/feature-flags" element={<AdminFeatureFlags />} />
                  <Route path="/admin/loyalty" element={<AdminLoyalty />} />
                  <Route path="/admin/profile" element={<AdminProfile />} />
                </Route>
              </Route>

              {/* Nested Manager/Staff/Super Admin routes under ManagerLayout */}
              <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'STAFF', 'SUPER_ADMIN']} />}>
                <Route element={<ManagerLayout />}>
                  {/* Shared Profile (Always accessible) */}
                  <Route path="/manager/profile" element={<ManagerProfile />} />

                  {/* Feature-Gated Routes (Staff & Manager) */}
                  <Route element={<FeatureProtectedRoute requiredFeature="ordering" featureName="Order Management" />}>
                    <Route path="/manager/orders" element={<ManagerOrders />} />
                  </Route>

                  <Route element={<FeatureProtectedRoute requiredFeature="inventory" featureName="Inventory & Stock Control" />}>
                    <Route path="/manager/inventory" element={<ManagerInventory />} />
                  </Route>

                  <Route element={<FeatureProtectedRoute requiredFeature="qr_menu" featureName="Digital Menu Availability" />}>
                    <Route path="/manager/menu/availability" element={<ManagerMenuAvailability />} />
                  </Route>

                  <Route element={<FeatureProtectedRoute requiredFeature="waiter_call" featureName="Waiter Call Assistance" />}>
                    <Route path="/manager/waiter-calls" element={<ManagerWaiterCalls />} />
                  </Route>

                  {/* Manager/Super Admin only routes inside layout */}
                  <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'SUPER_ADMIN']} />}>
                    {/* Settings is always accessible for managers */}
                    <Route path="/manager/settings" element={<ManagerSettings />} />

                    <Route element={<FeatureProtectedRoute requiredFeature="pos" featureName="Counter POS" />}>
                      <Route path="/manager/counter" element={<ManagerCounter />} />
                    </Route>

                    <Route element={<FeatureProtectedRoute requiredFeature="kds" featureName="Kitchen Display System (KDS)" />}>
                      <Route path="/manager/kds" element={<ManagerKDS />} />
                    </Route>

                    <Route element={<FeatureProtectedRoute requiredAnyFeatures={['payments', 'pos']} featureName="Transactions & Payments" />}>
                      <Route path="/manager/transactions" element={<ManagerTransactions />} />
                    </Route>

                    <Route element={<FeatureProtectedRoute requiredFeature="qr_menu" featureName="Table Management" />}>
                      <Route path="/manager/tables" element={<ManagerTables />} />
                      <Route path="/manager/tables/operations" element={<ManagerTableOperations />} />
                    </Route>

                    <Route element={<FeatureProtectedRoute requiredFeature="qr_menu" featureName="Digital Menu Management" />}>
                      <Route path="/manager/menu" element={<ManagerMenu />} />
                    </Route>

                    <Route element={<FeatureProtectedRoute requiredAnyFeatures={['crm', 'pos']} featureName="Staff Management" />}>
                      <Route path="/manager/staff" element={<ManagerStaff />} />
                    </Route>

                    <Route element={<FeatureProtectedRoute requiredFeature="crm" featureName="Customer Directory & CRM" />}>
                      <Route path="/manager/customers" element={<ManagerCustomers />} />
                    </Route>

                    <Route element={<FeatureProtectedRoute requiredFeature="ordering" featureName="Tax Management" />}>
                      <Route path="/manager/taxes" element={<ManagerTaxes />} />
                    </Route>

                    <Route element={<FeatureProtectedRoute requiredFeature="analytics" featureName="Analytics & Insights" />}>
                      <Route path="/manager/analytics" element={<ManagerAnalytics />} />
                    </Route>
                  </Route>

                  {/* Super Admin only routes inside layout */}
                  <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                    <Route element={<FeatureProtectedRoute requiredFeature="api_webhooks" featureName="Developer APIs & Webhooks" />}>
                      <Route path="/manager/developer" element={<ManagerDeveloper />} />
                    </Route>
                  </Route>
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </FeatureFlagProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
