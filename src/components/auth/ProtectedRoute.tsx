import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  const isRecoveryLink =
    new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery" ||
    new URLSearchParams(location.search).get("type") === "recovery";

  if (isRecoveryLink) {
    return <Navigate to={`/reset-password${location.search}${window.location.hash}`} replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
