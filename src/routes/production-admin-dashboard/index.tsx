import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { DashboardLayout } from "~/components/DashboardLayout";
import { ShowPreview } from "~/components/ShowPreview";
import {
  Clapperboard,
  Film,
  CheckCircle2,
  Clock,
  Building2,
  Plus,
  TrendingUp,
  Activity,
  Calendar,
  Users,
  XCircle,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/production-admin-dashboard/")({
  component: ProductionAdminDashboardPage,
});

function ProductionAdminDashboardPage() {
  const trpc = useTRPC();
  const { token, user } = useAuthStore();
  const permissions = usePermissions();

  // Check if user has permission to view this dashboard
  if (!permissions.canManageShows() && !permissions.canManageCompany()) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400 mb-6">
              This dashboard is only accessible to production managers and administrators.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-semibold"
            >
              Go to Main Dashboard
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );

  const scenesQuery = useQuery(
    trpc.getAllScenes.queryOptions({ token: token || "" })
  );

  const productionHousesQuery = useQuery(
    trpc.getProductionHouses.queryOptions({ token: token || "" })
  );

  const shows = showsQuery.data || [];
  const scenes = scenesQuery.data || [];
  const productionHouses = productionHousesQuery.data || [];

  const isLoading = showsQuery.isLoading || scenesQuery.isLoading;

  // Calculate statistics
  const stats = {
    totalShows: shows.length,
    activeShows: shows.filter((s) => s.status === "Shooting").length,
    preProductionShows: shows.filter((s) => s.status === "Pre-Production").length,
    wrappedShows: shows.filter((s) => s.status === "Wrapped").length,
    totalScenes: scenes.length,
    completedScenes: scenes.filter((s) => s.status === "Complete").length,
    inProgressScenes: scenes.filter((s) => s.status === "In Progress").length,
    unshotScenes: scenes.filter((s) => s.status === "Unshot").length,
    totalProductionHouses: productionHouses.length,
  };

  const completionRate = stats.totalScenes > 0
    ? Math.round((stats.completedScenes / stats.totalScenes) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
              <Clapperboard className="h-6 w-6 text-cinematic-gold-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Production Dashboard</h1>
          </div>
          <p className="text-gray-400">
            Comprehensive overview of all productions across {user?.companyName || "your company"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-12 w-12 animate-spin text-cinematic-gold-500" />
          </div>
        ) : (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Shows"
                value={stats.totalShows}
                icon={Clapperboard}
                color="gold"
                trend={`${stats.activeShows} active`}
              />
              <StatCard
                title="Total Scenes"
                value={stats.totalScenes}
                icon={Film}
                color="blue"
                trend={`${stats.unshotScenes} unshot`}
              />
              <StatCard
                title="In Progress"
                value={stats.inProgressScenes}
                icon={Activity}
                color="emerald"
                trend="Currently filming"
              />
              <StatCard
                title="Completed"
                value={stats.completedScenes}
                icon={CheckCircle2}
                color="gold"
                trend={`${completionRate}% complete`}
              />
            </div>

            {/* Production Status Overview */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-cinematic-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Production Status</h2>
                  <p className="text-sm text-gray-400">Shows by production stage</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatusCard
                  label="Pre-Production"
                  count={stats.preProductionShows}
                  color="blue"
                  icon={Calendar}
                />
                <StatusCard
                  label="Shooting"
                  count={stats.activeShows}
                  color="emerald"
                  icon={Activity}
                />
                <StatusCard
                  label="Wrapped"
                  count={stats.wrappedShows}
                  color="gray"
                  icon={CheckCircle2}
                />
              </div>
            </div>

            {/* Production Houses Overview */}
            {stats.totalProductionHouses > 0 && (
              <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cinematic-emerald-500/20 rounded-lg">
                      <Building2 className="h-6 w-6 text-cinematic-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Production Houses</h2>
                      <p className="text-sm text-gray-400">
                        {stats.totalProductionHouses} {stats.totalProductionHouses === 1 ? "house" : "houses"}
                      </p>
                    </div>
                  </div>
                  {permissions.canManageProductionHouses() && (
                    <Link
                      to="/production-houses"
                      className="text-sm text-cinematic-gold-400 hover:text-cinematic-gold-300 font-medium transition-colors"
                    >
                      Manage All
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productionHouses.slice(0, 6).map((house) => (
                    <Link
                      key={house.id}
                      to="/production-houses/$productionHouseId/shows"
                      params={{ productionHouseId: house.id.toString() }}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-cinematic-gold-500/50 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        {house.logoURL ? (
                          <img
                            src={house.logoURL}
                            alt={house.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-cinematic-gold-500/20 rounded flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-cinematic-gold-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white mb-1 group-hover:text-cinematic-gold-400 transition-colors truncate">
                            {house.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clapperboard className="h-3 w-3" />
                              {house.showCount} {house.showCount === 1 ? "show" : "shows"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {house.memberCount} {house.memberCount === 1 ? "member" : "members"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Shows */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Recent Shows</h2>
                <Link
                  to="/shows"
                  className="text-sm text-cinematic-gold-400 hover:text-cinematic-gold-300 font-medium transition-colors"
                >
                  View All
                </Link>
              </div>

              {shows.length === 0 ? (
                <div className="text-center py-12">
                  <Clapperboard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No shows yet</p>
                  {permissions.canManageShows() && (
                    <Link
                      to="/shows/new"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      Create Your First Show
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {shows.slice(0, 5).map((show) => (
                    <Link
                      key={show.id}
                      to="/shows/$showId"
                      params={{ showId: show.id.toString() }}
                      className="block bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl p-4 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <ShowPreview
                          thumbnailURL={show.thumbnailURL}
                          showTitle={show.title}
                          size="sm"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-white group-hover:text-cinematic-gold-400 transition-colors mb-1">
                            {show.title}
                          </h3>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {show.productionHouse && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {show.productionHouse.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Film className="h-3 w-3" />
                              {show.sceneCount} scenes
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full font-medium ${
                                show.status === "Shooting"
                                  ? "bg-cinematic-emerald-500/20 text-cinematic-emerald-400"
                                  : show.status === "Pre-Production"
                                  ? "bg-cinematic-blue-500/20 text-cinematic-blue-400"
                                  : "bg-gray-700 text-gray-400"
                              }`}
                            >
                              {show.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {permissions.canManageShows() && (
              <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <QuickActionButton
                    icon={Plus}
                    label="New Show"
                    description="Create production"
                    href="/shows/new"
                  />
                  <QuickActionButton
                    icon={Film}
                    label="Manage Scenes"
                    description="View all scenes"
                    href="/scenes"
                  />
                  <QuickActionButton
                    icon={Calendar}
                    label="Calendar"
                    description="View schedule"
                    href="/calendar"
                  />
                  <QuickActionButton
                    icon={Building2}
                    label="Production Houses"
                    description="Manage houses"
                    href="/production-houses"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: "gold" | "blue" | "emerald";
  trend?: string;
}

function StatCard({ title, value, icon: Icon, color, trend }: StatCardProps) {
  const colorClasses = {
    gold: "from-cinematic-gold-500/20 to-cinematic-gold-600/20 border-cinematic-gold-500/30 text-cinematic-gold-400",
    blue: "from-cinematic-blue-500/20 to-cinematic-blue-600/20 border-cinematic-blue-500/30 text-cinematic-blue-400",
    emerald:
      "from-cinematic-emerald-500/20 to-cinematic-emerald-600/20 border-cinematic-emerald-500/30 text-cinematic-emerald-400",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-6`}
    >
      <div className="flex items-center justify-between mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-sm font-medium text-gray-300">{title}</p>
        {trend && <p className="text-xs text-gray-500">{trend}</p>}
      </div>
    </div>
  );
}

interface StatusCardProps {
  label: string;
  count: number;
  color: "blue" | "emerald" | "gray";
  icon: React.ElementType;
}

function StatusCard({ label, count, color, icon: Icon }: StatusCardProps) {
  const colorClasses = {
    blue: "bg-cinematic-blue-500/20 text-cinematic-blue-400",
    emerald: "bg-cinematic-emerald-500/20 text-cinematic-emerald-400",
    gray: "bg-gray-700 text-gray-400",
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{count}</div>
          <div className="text-sm text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
}

function QuickActionButton({
  icon: Icon,
  label,
  description,
  href,
}: QuickActionButtonProps) {
  return (
    <Link
      to={href}
      className="block p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl transition-all group"
    >
      <div className="p-3 bg-cinematic-gold-500/20 rounded-lg group-hover:bg-cinematic-gold-500/30 transition-colors mb-3">
        <Icon className="h-6 w-6 text-cinematic-gold-400" />
      </div>
      <h3 className="font-semibold text-white group-hover:text-cinematic-gold-400 transition-colors mb-1">
        {label}
      </h3>
      <p className="text-xs text-gray-500">{description}</p>
    </Link>
  );
}
