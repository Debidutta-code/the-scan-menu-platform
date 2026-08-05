import { FeatureFlagProvider } from './hooks/featureFlags/useFeatureFlags';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';

// Super Admin Pages & Layout
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminRestaurants from './pages/AdminRestaurants';
import AdminRestaurantDetail from './pages/AdminRestaurantDetail';
import AdminProvision from './pages/AdminProvision';
import AdminSubscriptions from './pages/AdminSubscriptions';
import AdminPOSIntegrations from './pages/AdminPOSIntegrations';
import AdminPaymentGateways from './pages/AdminPaymentGateways';
import AdminAuditLogs from './pages/AdminAuditLogs';

import AdminAnalytics from './pages/AdminAnalytics';
import AdminFeatureFlags from './pages/AdminFeatureFlags';
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

// Public Pages
import PublicTable from './pages/PublicTable';
import PublicOrderConfirmation from './pages/PublicOrderConfirmation';
import PublicSessionlessOrder from './pages/PublicSessionlessOrder';

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/manager/orders" replace />;
};

export const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <FeatureFlagProvider>
            <Routes>
              {/* Public customer dining view (Subdomain-aware) */}
              <Route path="/t/:tableToken" element={<PublicTable />} />
              <Route path="/t/:tableToken/order/:orderId" element={<PublicOrderConfirmation />} />
              <Route path="/menu" element={<PublicSessionlessOrder />} />
              <Route path="/order" element={<PublicSessionlessOrder />} />

              {/* Public customer dining view (Legacy path-based fallback) */}
              <Route path="/r/:restaurantSlug/t/:tableToken" element={<PublicTable />} />
              <Route path="/r/:restaurantSlug/t/:tableToken/order/:orderId" element={<PublicOrderConfirmation />} />
              <Route path="/r/:restaurantSlug/order" element={<PublicSessionlessOrder />} />

              {/* Public login */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes (all roles) - root redirect */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardRedirect />} />
              </Route>

              {/* Super Admin routes under AdminLayout */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/restaurants" element={<AdminRestaurants />} />
                  <Route path="/admin/restaurants/provision" element={<AdminProvision />} />
                  <Route path="/admin/restaurants/:id" element={<AdminRestaurantDetail />} />
                  <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                  <Route path="/admin/pos-integrations" element={<AdminPOSIntegrations />} />
                  <Route path="/admin/payments" element={<AdminPaymentGateways />} />
                  <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />

                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/feature-flags" element={<AdminFeatureFlags />} />
                  <Route path="/admin/profile" element={<AdminProfile />} />
                </Route>
              </Route>

              {/* Nested Manager/Staff/Super Admin routes under ManagerLayout */}
              <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'STAFF', 'SUPER_ADMIN']} />}>
                <Route element={<ManagerLayout />}>
                  <Route path="/manager/orders" element={<ManagerOrders />} />
                  <Route path="/manager/counter" element={<ManagerCounter />} />
                  <Route path="/manager/kds" element={<ManagerKDS />} />
                  <Route path="/manager/waiter-calls" element={<ManagerWaiterCalls />} />
                  <Route path="/manager/profile" element={<ManagerProfile />} />
                  <Route path="/manager/transactions" element={<ManagerTransactions />} />
                  {/* STAFF-accessible availability-only view */}
                  <Route path="/manager/menu/availability" element={<ManagerMenuAvailability />} />

                  {/* Manager/Super Admin only routes inside layout */}
                  <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'SUPER_ADMIN']} />}>
                    <Route path="/manager/tables" element={<ManagerTables />} />
                    <Route path="/manager/menu" element={<ManagerMenu />} />
                    <Route path="/manager/inventory" element={<ManagerInventory />} />

                    <Route path="/manager/staff" element={<ManagerStaff />} />
                    <Route path="/manager/taxes" element={<ManagerTaxes />} />
                    <Route path="/manager/settings" element={<ManagerSettings />} />
                    <Route path="/manager/analytics" element={<ManagerAnalytics />} />
                    <Route path="/manager/developer" element={<ManagerDeveloper />} />
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
