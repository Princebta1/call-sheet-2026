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
  Clock,
  CheckCircle2,
  Plus,
  Users,
  Calendar,
  Settings,
  Building2,
  BarChart3,
  UserPlus,
  FileText,
  Code2,
  TrendingUp,
  Activity,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

function DashboardPage() {
  const trpc = useTRPC();
  const { token, user } = useAuthStore();
  const permissions = usePermissions();

  const dashboardStatsQuery = useQuery(
    trpc.getDashboardStats.queryOptions({ token: token || "" })
  );

  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );

  const stats = dashboardStatsQuery.data?.stats;
  const role = dashboardStatsQuery.data?.role || user?.role;
  const shows = showsQuery.data || [];

  // Get role-specific welcome message
  const getWelcomeMessage = () => {
    switch (role) {
      case "Developer":
        return "System Overview";
      case "Admin":
        return "Company Management Dashboard";
      case "Manager":
        return "Production Management Dashboard";
      case "Viewer":
        return "Production Overview";
      case "Actor":
        return "Your Schedule & Assignments";
      case "Crew":
        return "Production Schedule";
      default:
        return "Dashboard";
    }
  };

  // Get role-specific subtitle
  const getSubtitle = () => {
    switch (role) {
      case "Developer":
        return "Monitor system health and manage all companies";
      case "Admin":
        return "Manage your production company and team";
      case "Manager":
        return "Oversee productions and coordinate your team";
      case "Viewer":
        return "Stay informed about production progress";
      case "Actor":
        return "View your upcoming scenes and call times";
      case "Crew":
        return "Stay updated on production schedules and team coordination";
      default:
        return "Here's what's happening with your productions today";
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.name}
          </h1>
          <p className="text-gray-400">{getSubtitle()}</p>
        </div>

        {/* Stats Grid - Different for each role */}
        {dashboardStatsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cinematic-gold-500"></div>
          </div>
        ) : (
          <>
            {role === "Developer" && stats && (
              <DeveloperStats stats={stats} />
            )}
            {(role === "Admin" || role === "Manager") && stats && (
              <ManagerStats stats={stats} />
            )}
            {role === "Viewer" && stats && (
              <ViewerStats stats={stats} />
            )}
            {role === "Actor" && stats && (
              <ActorStats stats={stats} />
            )}
            {role === "Crew" && stats && (
              <CrewStats stats={stats} />
            )}
          </>
        )}

        {/* Quick Actions - Filtered by permissions */}
        <QuickActionsSection permissions={permissions} role={role} />

        {/* Recent Shows */}
        <RecentShowsSection
          shows={shows}
          isLoading={showsQuery.isLoading}
          permissions={permissions}
          role={role}
        />
      </div>
    </DashboardLayout>
  );
}

interface DeveloperStatsProps {
  stats: {
    totalCompanies: number;
    activeCompanies: number;
    totalUsers: number;
    totalShows: number;
    totalScenes: number;
  };
}

function DeveloperStats({ stats }: DeveloperStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Companies"
        value={stats.totalCompanies}
        icon={Building2}
        color="gold"
        trend={`${stats.activeCompanies} active`}
      />
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        icon={Users}
        color="blue"
        trend="Platform-wide"
      />
      <StatCard
        title="Total Shows"
        value={stats.totalShows}
        icon={Clapperboard}
        color="emerald"
        trend="All companies"
      />
      <StatCard
        title="Total Scenes"
        value={stats.totalScenes}
        icon={Film}
        color="gold"
        trend="System-wide"
      />
    </div>
  );
}

interface ManagerStatsProps {
  stats: {
    totalShows: number;
    activeShows: number;
    totalScenes: number;
    teamMemberCount: number;
    unshotScenes: number;
    inProgressScenes: number;
    completeScenes: number;
    upcomingScenes: number;
  };
}

function ManagerStats({ stats }: ManagerStatsProps) {
  return (
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
        trend={`${stats.upcomingScenes} upcoming`}
      />
      <StatCard
        title="In Progress"
        value={stats.inProgressScenes}
        icon={Activity}
        color="emerald"
        trend="Currently filming"
      />
      <StatCard
        title="Team Members"
        value={stats.teamMemberCount}
        icon={Users}
        color="gold"
        trend="Active users"
      />
    </div>
  );
}

interface ViewerStatsProps {
  stats: {
    totalShows: number;
    activeShows: number;
    totalScenes: number;
    completeScenes: number;
    upcomingScenes: number;
  };
}

function ViewerStats({ stats }: ViewerStatsProps) {
  const completionRate = stats.totalScenes > 0 
    ? Math.round((stats.completeScenes / stats.totalScenes) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Your Shows"
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
        trend="Across all shows"
      />
      <StatCard
        title="Completed"
        value={stats.completeScenes}
        icon={CheckCircle2}
        color="emerald"
        trend={`${completionRate}% complete`}
      />
      <StatCard
        title="Upcoming"
        value={stats.upcomingScenes}
        icon={Clock}
        color="gold"
        trend="Scheduled ahead"
      />
    </div>
  );
}

interface ActorStatsProps {
  stats: {
    totalShows: number;
    activeShows: number;
    assignedScenes: number;
    upcomingScenes: number;
    completedScenes: number;
  };
}

function ActorStats({ stats }: ActorStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Your Shows"
        value={stats.totalShows}
        icon={Clapperboard}
        color="gold"
        trend={`${stats.activeShows} active`}
      />
      <StatCard
        title="Your Scenes"
        value={stats.assignedScenes}
        icon={Film}
        color="blue"
        trend="Total assigned"
      />
      <StatCard
        title="Upcoming"
        value={stats.upcomingScenes}
        icon={Clock}
        color="emerald"
        trend="To be filmed"
      />
      <StatCard
        title="Completed"
        value={stats.completedScenes}
        icon={CheckCircle2}
        color="gold"
        trend="Scenes filmed"
      />
    </div>
  );
}

interface CrewStatsProps {
  stats: {
    totalShows: number;
    activeShows: number;
    totalScenes: number;
    teamMemberCount: number;
    upcomingScenes: number;
    completeScenes: number;
  };
}

function CrewStats({ stats }: CrewStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Active Shows"
        value={stats.activeShows}
        icon={Clapperboard}
        color="gold"
        trend={`${stats.totalShows} total`}
      />
      <StatCard
        title="Total Scenes"
        value={stats.totalScenes}
        icon={Film}
        color="blue"
        trend="All productions"
      />
      <StatCard
        title="Upcoming"
        value={stats.upcomingScenes}
        icon={Clock}
        color="emerald"
        trend="Scheduled ahead"
      />
      <StatCard
        title="Team Size"
        value={stats.teamMemberCount}
        icon={Users}
        color="gold"
        trend="Active members"
      />
    </div>
  );
}

interface QuickActionsSectionProps {
  permissions: ReturnType<typeof usePermissions>;
  role?: string;
}

function QuickActionsSection({ permissions, role }: QuickActionsSectionProps) {
  const quickActions = [];

  // Developer gets special actions
  if (permissions.isDeveloper()) {
    quickActions.push(
      { icon: Code2, label: "Developer Dashboard", href: "/developer-dashboard" },
      { icon: Building2, label: "Production Houses", href: "/production-houses" },
      { icon: Settings, label: "System Settings", href: "/settings" }
    );
  } else {
    // Admin and Manager can create and manage
    if (permissions.canManageShows()) {
      quickActions.push(
        { icon: Plus, label: "New Show", href: "/shows/new" }
      );
    }
    
    // Admin gets company dashboard
    if (permissions.canManageCompany()) {
      quickActions.push(
        { icon: Building2, label: "Company Dashboard", href: "/company-dashboard" }
      );
    }
    
    if (permissions.canManageScenes()) {
      quickActions.push(
        { icon: Film, label: "Manage Scenes", href: "/scenes" }
      );
    }

    // Everyone can view calendar
    quickActions.push(
      { icon: Calendar, label: "View Calendar", href: "/calendar" }
    );

    if (permissions.canManageTeam()) {
      quickActions.push(
        { icon: UserPlus, label: "Invite Team Member", href: "/team" }
      );
    }

    if (permissions.canManageReports()) {
      quickActions.push(
        { icon: FileText, label: "Generate Report", href: "/reports" }
      );
    }

    // Viewers and Actors get view-only actions
    if (permissions.isViewer() || permissions.isActor()) {
      quickActions.push(
        { icon: BarChart3, label: "View Reports", href: "/reports" }
      );
    }

    // Everyone can access settings for their profile
    quickActions.push(
      { icon: Settings, label: "My Profile", href: "/settings" }
    );
  }

  if (quickActions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <QuickActionButton
            key={action.href}
            icon={action.icon}
            label={action.label}
            href={action.href}
          />
        ))}
      </div>
    </div>
  );
}

interface RecentShowsSectionProps {
  shows: Array<{
    id: number;
    title: string;
    description: string | null;
    status: string;
    sceneCount: number;
    createdAt: Date;
    thumbnailURL: string | null;
    productionHouse: {
      id: number;
      name: string;
      logoURL: string | null;
    } | null;
  }>;
  isLoading: boolean;
  permissions: ReturnType<typeof usePermissions>;
  role?: string;
}

function RecentShowsSection({ shows, isLoading, permissions, role }: RecentShowsSectionProps) {
  const getSectionTitle = () => {
    if (role === "Actor") return "Your Shows";
    if (role === "Viewer") return "Shows You're Monitoring";
    if (role === "Crew") return "Your Productions";
    return "Recent Shows";
  };

  const getEmptyMessage = () => {
    if (role === "Actor") return "You haven't been assigned to any shows yet";
    if (role === "Viewer") return "No shows available to view";
    if (permissions.canManageShows()) return "No shows yet";
    return "No shows assigned to you yet";
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">{getSectionTitle()}</h2>
        <Link
          to="/shows"
          className="text-sm text-cinematic-gold-400 hover:text-cinematic-gold-300 font-medium transition-colors"
        >
          View All
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cinematic-gold-500"></div>
        </div>
      ) : shows.length === 0 ? (
        <div className="text-center py-12">
          <Clapperboard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">{getEmptyMessage()}</p>
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
        <div className="space-y-4">
          {shows.slice(0, 5).map((show) => (
            <Link
              key={show.id}
              to="/shows/$showId"
              params={{ showId: show.id.toString() }}
              className="block bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl p-4 transition-all group"
            >
              <div className="flex items-start gap-3">
                <ShowPreview
                  thumbnailURL={show.thumbnailURL}
                  showTitle={show.title}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white group-hover:text-cinematic-gold-400 transition-colors mb-1">
                    {show.title}
                  </h3>
                  {show.description && (
                    <p className="text-sm text-gray-400 line-clamp-1 mb-2">
                      {show.description}
                    </p>
                  )}
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

interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  href: string;
}

function QuickActionButton({
  icon: Icon,
  label,
  href,
}: QuickActionButtonProps) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl transition-all group"
    >
      <div className="p-2 bg-cinematic-gold-500/20 rounded-lg group-hover:bg-cinematic-gold-500/30 transition-colors">
        <Icon className="h-5 w-5 text-cinematic-gold-400" />
      </div>
      <span className="font-medium text-gray-300 group-hover:text-white transition-colors">
        {label}
      </span>
    </Link>
  );
}
