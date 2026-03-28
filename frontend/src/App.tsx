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
import PaydayFlow from "./pages/PaydayFlow";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

function App() {
  return (
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
            <Route path="/payday" element={<PaydayFlow />} />
          </Route>

          <Route path="*" element={<Navigate replace to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
