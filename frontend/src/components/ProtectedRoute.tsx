import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
