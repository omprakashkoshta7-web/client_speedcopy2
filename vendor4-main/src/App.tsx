
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import VendorLayout from "./components/layout/VendorLayout";
import LoginPage from "./pages/auth/LoginPage";
import VendorDashboardPage from "./pages/dashboard/VendorDashboardPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import ClosurePage from "./pages/earnings/ClosurePage";
import EarningsPage from "./pages/earnings/EarningsPage";
import PayoutsPage from "./pages/earnings/PayoutsPage";
import OrgProfilePage from "./pages/org/OrgProfilePage";
import LegalPage from "./pages/org/LegalPage";
import JobDetailPage from "./pages/orders/JobDetailPage";
import JobQueuePage from "./pages/orders/JobQueuePage";
import VendorScorePage from "./pages/orders/VendorScorePage";
import ProductionPage from "./pages/production/ProductionPage";
import StaffListPage from "./pages/staff/StaffListPage";
import CreateStorePage from "./pages/stores/CreateStorePage";
import StoreDetailPage from "./pages/stores/StoreDetailPage";
import StoreListPage from "./pages/stores/StoreListPage";
import SupportPage from "./pages/support/SupportPage";
import { getVendorSession, subscribeVendorSession } from "./services/session";

const App = () => {
  const [session, setSession] = useState(() => getVendorSession());

  useEffect(() => {
    setSession(getVendorSession());

    return subscribeVendorSession(() => {
      setSession(getVendorSession());
    });
  }, []);

  const isAuthenticated = Boolean(session?.token);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/"
          element={isAuthenticated ? <VendorLayout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<VendorDashboardPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="org" element={<OrgProfilePage />} />
          <Route path="legal" element={<LegalPage />} />
          <Route path="stores" element={<StoreListPage />} />
          <Route path="stores/new" element={<CreateStorePage />} />
          <Route path="stores/:id" element={<StoreDetailPage />} />
          <Route path="staff" element={<StaffListPage />} />
          <Route path="orders" element={<JobQueuePage />} />
          <Route path="orders/:id" element={<JobDetailPage />} />
          <Route path="score" element={<VendorScorePage />} />
          <Route path="production" element={<ProductionPage />} />
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="closure" element={<ClosurePage />} />
          <Route path="payouts" element={<PayoutsPage />} />
          <Route path="support" element={<SupportPage />} />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
