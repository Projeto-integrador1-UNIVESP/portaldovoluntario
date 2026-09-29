import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageSkeleton } from "@/components/common/PageSkeleton";

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSkeleton />;

  if (!user) {
    // Sem guardar o destino, quem é barrado aqui perde para onde ia e o login
    // não consegue explicar por que a conta é necessária naquele caso.
    const destino = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(destino)}`} replace />;
  }

  if (!allowedRoles.includes(role || "")) return <Navigate to="/" replace />;

  return <>{children}</>;
}
