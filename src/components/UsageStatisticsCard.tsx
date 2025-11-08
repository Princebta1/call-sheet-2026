import { Clapperboard, Film, FileText, TrendingUp, Package } from "lucide-react";

interface UsageStatisticsCardProps {
  statistics: {
    content: {
      totalShows: number;
      totalScenes: number;
      totalCallSheets: number;
      totalReports: number;
    };
    sceneStatus: {
      unshot: number;
      inProgress: number;
      complete: number;
    };
    showStatus: {
      preProduction: number;
      shooting: number;
      wrapped: number;
    };
    subscriptions: {
      basic: number;
      pro: number;
      enterprise: number;
    };
    recentActivity: {
      shows: number;
      scenes: number;
      callSheets: number;
      reports: number;
    };
  };
}

export function UsageStatisticsCard({ statistics }: UsageStatisticsCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
          <TrendingUp className="h-6 w-6 text-cinematic-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Usage Statistics</h2>
          <p className="text-sm text-gray-400">Platform-wide metrics</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Content Overview */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Content Overview
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatBox
              icon={Clapperboard}
              label="Shows"
              value={statistics.content.totalShows}
              color="gold"
            />
            <StatBox
              icon={Film}
              label="Scenes"
              value={statistics.content.totalScenes}
              color="blue"
            />
            <StatBox
              icon={FileText}
              label="Call Sheets"
              value={statistics.content.totalCallSheets}
              color="emerald"
            />
            <StatBox
              icon={FileText}
              label="Reports"
              value={statistics.content.totalReports}
              color="gold"
            />
          </div>
        </div>

        {/* Scene Status Breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Scene Status
          </h3>
          <div className="space-y-2">
            <ProgressBar
              label="Complete"
              value={statistics.sceneStatus.complete}
              total={statistics.content.totalScenes}
              color="emerald"
            />
            <ProgressBar
              label="In Progress"
              value={statistics.sceneStatus.inProgress}
              total={statistics.content.totalScenes}
              color="blue"
            />
            <ProgressBar
              label="Unshot"
              value={statistics.sceneStatus.unshot}
              total={statistics.content.totalScenes}
              color="gray"
            />
          </div>
        </div>

        {/* Subscription Tiers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-cinematic-gold-400" />
            <h3 className="text-sm font-semibold text-gray-300">
              Active Subscriptions
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <TierBox
              label="Basic"
              value={statistics.subscriptions.basic}
              color="gray"
            />
            <TierBox
              label="Pro"
              value={statistics.subscriptions.pro}
              color="blue"
            />
            <TierBox
              label="Enterprise"
              value={statistics.subscriptions.enterprise}
              color="gold"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Recent Activity (30 days)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <ActivityBox label="Shows Created" value={statistics.recentActivity.shows} />
            <ActivityBox label="Scenes Added" value={statistics.recentActivity.scenes} />
            <ActivityBox label="Call Sheets" value={statistics.recentActivity.callSheets} />
            <ActivityBox label="Reports Generated" value={statistics.recentActivity.reports} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatBoxProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "gold" | "blue" | "emerald";
}

function StatBox({ icon: Icon, label, value, color }: StatBoxProps) {
  const colorClasses = {
    gold: "from-cinematic-gold-500/20 to-cinematic-gold-600/20 border-cinematic-gold-500/30 text-cinematic-gold-400",
    blue: "from-cinematic-blue-500/20 to-cinematic-blue-600/20 border-cinematic-blue-500/30 text-cinematic-blue-400",
    emerald:
      "from-cinematic-emerald-500/20 to-cinematic-emerald-600/20 border-cinematic-emerald-500/30 text-cinematic-emerald-400",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-4`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5" />
        <span className="text-xs font-medium text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  color: "emerald" | "blue" | "gray";
}

function ProgressBar({ label, value, total, color }: ProgressBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  const colorClasses = {
    emerald: "bg-cinematic-emerald-500",
    blue: "bg-cinematic-blue-500",
    gray: "bg-gray-600",
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-400">{label}</span>
          <span className="text-xs font-semibold text-white">
            {value.toLocaleString()} ({percentage.toFixed(0)}%)
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClasses[color]} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface TierBoxProps {
  label: string;
  value: number;
  color: "gray" | "blue" | "gold";
}

function TierBox({ label, value, color }: TierBoxProps) {
  const colorClasses = {
    gray: "bg-gray-800/50 border-gray-700 text-gray-400",
    blue: "bg-cinematic-blue-500/10 border-cinematic-blue-500/30 text-cinematic-blue-400",
    gold: "bg-cinematic-gold-500/10 border-cinematic-gold-500/30 text-cinematic-gold-400",
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

interface ActivityBoxProps {
  label: string;
  value: number;
}

function ActivityBox({ label, value }: ActivityBoxProps) {
  return (
    <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}
