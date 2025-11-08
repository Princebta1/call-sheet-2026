import { Clapperboard, Film, FileText, TrendingUp, CheckCircle2 } from "lucide-react";

interface ProductionOverviewCardProps {
  shows: {
    total: number;
    preProduction: number;
    shooting: number;
    wrapped: number;
  };
  scenes: {
    total: number;
    unshot: number;
    inProgress: number;
    complete: number;
    completionRate: number;
  };
  content: {
    reports: number;
    callSheets: number;
    departments: number;
    customRoles: number;
    announcements: number;
  };
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
    <div>
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
  );
}

interface ContentStatProps {
  icon: React.ElementType;
  label: string;
  value: number;
}

function ContentStat({ icon: Icon, label, value }: ContentStatProps) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-cinematic-gold-400" />
        <span className="text-xs font-medium text-gray-400">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

export function ProductionOverviewCard({ shows, scenes, content }: ProductionOverviewCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
          <Clapperboard className="h-6 w-6 text-cinematic-gold-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Production Overview</h2>
          <p className="text-sm text-gray-400">Shows, scenes, and content</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Shows Statistics */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Shows</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-cinematic-gold-500/10 border border-cinematic-gold-500/30 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-white">{shows.total}</p>
            </div>
            <div className="bg-cinematic-blue-500/10 border border-cinematic-blue-500/30 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 mb-1">Pre-Production</p>
              <p className="text-2xl font-bold text-white">{shows.preProduction}</p>
            </div>
            <div className="bg-cinematic-emerald-500/10 border border-cinematic-emerald-500/30 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 mb-1">Shooting</p>
              <p className="text-2xl font-bold text-white">{shows.shooting}</p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 mb-1">Wrapped</p>
              <p className="text-2xl font-bold text-white">{shows.wrapped}</p>
            </div>
          </div>
        </div>

        {/* Scenes Progress */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">Scenes Progress</h3>
            <div className="flex items-center gap-2 bg-cinematic-emerald-500/10 border border-cinematic-emerald-500/30 px-3 py-1 rounded-full">
              <CheckCircle2 className="h-4 w-4 text-cinematic-emerald-400" />
              <span className="text-sm font-bold text-cinematic-emerald-400">
                {scenes.completionRate}%
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <ProgressBar
              label="Complete"
              value={scenes.complete}
              total={scenes.total}
              color="emerald"
            />
            <ProgressBar
              label="In Progress"
              value={scenes.inProgress}
              total={scenes.total}
              color="blue"
            />
            <ProgressBar
              label="Unshot"
              value={scenes.unshot}
              total={scenes.total}
              color="gray"
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-400">Total Scenes</span>
            <span className="font-bold text-white">{scenes.total}</span>
          </div>
        </div>

        {/* Content Statistics */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Content & Resources</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ContentStat icon={FileText} label="Reports" value={content.reports} />
            <ContentStat icon={FileText} label="Call Sheets" value={content.callSheets} />
            <ContentStat icon={TrendingUp} label="Announcements" value={content.announcements} />
            <ContentStat icon={Film} label="Departments" value={content.departments} />
            <ContentStat icon={Clapperboard} label="Custom Roles" value={content.customRoles} />
          </div>
        </div>
      </div>
    </div>
  );
}
