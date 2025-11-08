import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { AccessDenied } from "~/components/AccessDenied";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: Array<"Developer" | "Admin" | "Manager" | "Viewer" | "1st AD" | "2nd AD" | "Director" | "Crew" | "Actor">;
  requirePermission?: (permissions: ReturnType<typeof usePermissions>) => boolean;
  accessDeniedMessage?: string;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  requirePermission,
  accessDeniedMessage,
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const permissions = usePermissions();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  // Check role-based access
  if (requiredRoles && requiredRoles.length > 0) {
    if (!permissions.hasRole(requiredRoles)) {
      return (
        <AccessDenied
          requiredRoles={requiredRoles}
          message={accessDeniedMessage}
        />
      );
    }
  }

  // Check permission function
  if (requirePermission && !requirePermission(permissions)) {
    return (
      <AccessDenied
        requiredRoles={requiredRoles}
        message={accessDeniedMessage}
      />
    );
  }

  return <>{children}</>;
}
