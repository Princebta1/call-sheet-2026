import { Users, CheckCircle2, Clock, XCircle, Shield } from "lucide-react";

interface TeamOverviewCardProps {
  team: {
    total: number;
    active: number;
    inactive: number;
    pendingApproval: number;
    byRole: Array<{
      role: string;
      count: number;
    }>;
  };
}

export function TeamOverviewCard({ team }: TeamOverviewCardProps) {
  const activePercentage = team.total > 0 ? (team.active / team.total) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
          <Users className="h-6 w-6 text-cinematic-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Team Overview</h2>
          <p className="text-sm text-gray-400">Company-wide team statistics</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-cinematic-blue-500/10 border border-cinematic-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-cinematic-blue-400" />
              <span className="text-xs font-medium text-gray-400">Total</span>
            </div>
            <p className="text-2xl font-bold text-white">{team.total}</p>
          </div>

          <div className="bg-cinematic-emerald-500/10 border border-cinematic-emerald-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-cinematic-emerald-400" />
              <span className="text-xs font-medium text-gray-400">Active</span>
            </div>
            <p className="text-2xl font-bold text-white">{team.active}</p>
            <p className="text-xs text-gray-500 mt-1">{activePercentage.toFixed(0)}%</p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-400">Inactive</span>
            </div>
            <p className="text-2xl font-bold text-white">{team.inactive}</p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-medium text-gray-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">{team.pendingApproval}</p>
          </div>
        </div>

        {/* Team by Role */}
        {team.byRole.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-cinematic-gold-400" />
              <h3 className="text-sm font-semibold text-gray-300">Team Composition</h3>
            </div>
            <div className="space-y-2">
              {team.byRole.map((roleData) => {
                const percentage = team.active > 0 ? (roleData.count / team.active) * 100 : 0;
                return (
                  <div key={roleData.role} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-300">{roleData.role}</span>
                        <span className="text-sm font-semibold text-white">
                          {roleData.count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cinematic-blue-500 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
