import { Building2, Users, Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface SystemHealthCardProps {
  health: {
    companies: {
      total: number;
      active: number;
      inactive: number;
      pendingApproval: number;
    };
    users: {
      total: number;
      active: number;
      inactive: number;
    };
    automation: {
      recentFailures: number;
      totalLogs: number;
      successRate: number;
    };
  };
}

export function SystemHealthCard({ health }: SystemHealthCardProps) {
  const getHealthStatus = () => {
    if (health.automation.successRate >= 95) return "healthy";
    if (health.automation.successRate >= 80) return "warning";
    return "critical";
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cinematic-emerald-500/20 rounded-lg">
          <Activity className="h-6 w-6 text-cinematic-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">System Health</h2>
          <p className="text-sm text-gray-400">Real-time system metrics</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Companies Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-5 w-5 text-cinematic-blue-400" />
            <h3 className="text-sm font-semibold text-gray-300">Companies</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricBox
              label="Total"
              value={health.companies.total}
              color="blue"
            />
            <MetricBox
              label="Active"
              value={health.companies.active}
              color="emerald"
            />
            <MetricBox
              label="Inactive"
              value={health.companies.inactive}
              color="gray"
            />
            <MetricBox
              label="Pending"
              value={health.companies.pendingApproval}
              color="gold"
              highlight={health.companies.pendingApproval > 0}
            />
          </div>
        </div>

        {/* Users Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-cinematic-gold-400" />
            <h3 className="text-sm font-semibold text-gray-300">Users</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricBox
              label="Total"
              value={health.users.total}
              color="gold"
            />
            <MetricBox
              label="Active"
              value={health.users.active}
              color="emerald"
            />
            <MetricBox
              label="Inactive"
              value={health.users.inactive}
              color="gray"
            />
          </div>
        </div>

        {/* Automation Health Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-cinematic-emerald-400" />
            <h3 className="text-sm font-semibold text-gray-300">Automation Health</h3>
          </div>
          <div className="space-y-3">
            <div
              className={`p-4 rounded-lg border ${
                healthStatus === "healthy"
                  ? "bg-cinematic-emerald-500/10 border-cinematic-emerald-500/30"
                  : healthStatus === "warning"
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">
                  Success Rate
                </span>
                <div className="flex items-center gap-2">
                  {healthStatus === "healthy" ? (
                    <CheckCircle2 className="h-5 w-5 text-cinematic-emerald-400" />
                  ) : healthStatus === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  <span
                    className={`text-2xl font-bold ${
                      healthStatus === "healthy"
                        ? "text-cinematic-emerald-400"
                        : healthStatus === "warning"
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {health.automation.successRate.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Last 7 days</span>
                <span>
                  {health.automation.recentFailures} failures / {health.automation.totalLogs} total
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricBoxProps {
  label: string;
  value: number;
  color: "blue" | "emerald" | "gold" | "gray";
  highlight?: boolean;
}

function MetricBox({ label, value, color, highlight }: MetricBoxProps) {
  const colorClasses = {
    blue: "bg-cinematic-blue-500/10 border-cinematic-blue-500/30 text-cinematic-blue-400",
    emerald:
      "bg-cinematic-emerald-500/10 border-cinematic-emerald-500/30 text-cinematic-emerald-400",
    gold: "bg-cinematic-gold-500/10 border-cinematic-gold-500/30 text-cinematic-gold-400",
    gray: "bg-gray-800/50 border-gray-700 text-gray-400",
  };

  return (
    <div
      className={`p-3 rounded-lg border ${colorClasses[color]} ${
        highlight ? "ring-2 ring-cinematic-gold-500 ring-offset-2 ring-offset-gray-900" : ""
      }`}
    >
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
