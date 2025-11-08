import { ShieldAlert } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { DashboardLayout } from "~/components/DashboardLayout";

interface AccessDeniedProps {
  requiredRoles?: string[];
  message?: string;
}

export function AccessDenied({
  requiredRoles,
  message = "You don't have permission to access this page.",
}: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 rounded-2xl mb-6">
            <ShieldAlert className="h-10 w-10 text-red-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-3">
            Access Denied
          </h1>
          
          <p className="text-gray-400 mb-6">
            {message}
          </p>

          {requiredRoles && requiredRoles.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-400 mb-2">
                Required role{requiredRoles.length > 1 ? "s" : ""}:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {requiredRoles.map((role) => (
                  <span
                    key={role}
                    className="px-3 py-1 bg-cinematic-blue-500/20 text-cinematic-blue-400 rounded-full text-sm font-medium"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
