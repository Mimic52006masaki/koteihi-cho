import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FixedCosts from "./pages/FixedCosts";
import MonthlyDetail from "./pages/MonthlyDetail";
import History from "./pages/History";
import CurrentMonthly from "./pages/CurrentMonthly";
import Settings from "./pages/Settings";
import {Accounts} from "./pages/Accounts";
import AccountHistory from "./pages/AccountHistory";
import TransferPlan from "./components/TransferPlan";
import Analytics from "./pages/Analytics";
import ImportReview from "./pages/ImportReview";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { GoogleOAuthProvider } from "@react-oauth/google";

// 未設定ならGoogleログインを出さない（Providerもマウントしない）
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function App() {
  const tree = (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/fixed-costs" element={<FixedCosts />} />
            <Route path="/history" element={<History />} />
            <Route path="/monthly/current" element={<CurrentMonthly />} />
            <Route path="/monthly/:id" element={<MonthlyDetail />} />
            <Route path="/transfer" element={<TransferPlan />} />
            <Route path="/accounts/:id/history" element={<AccountHistory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/imports" element={<ImportReview />} />
          </Route>

          <Route path="*" element={<Navigate replace to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );

  return googleClientId
    ? <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider>
    : tree;
}

export default App;
