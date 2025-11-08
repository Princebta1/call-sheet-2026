import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { DashboardLayout } from "~/components/DashboardLayout";
import { CompanyOverviewCard } from "~/components/CompanyOverviewCard";
import { TeamOverviewCard } from "~/components/TeamOverviewCard";
import { ProductionOverviewCard } from "~/components/ProductionOverviewCard";
import {
  Building2,
  Users,
  UserPlus,
  Clapperboard,
  Settings,
  FileText,
  TrendingUp,
  Plus,
  Loader2,
  XCircle,
  Shield,
  Calendar,
  Bell,
} from "lucide-react";

export const Route = createFileRoute("/company-dashboard/")({
  component: CompanyDashboardPage,
});

function CompanyDashboardPage() {
  const trpc = useTRPC();
  const { token, user } = useAuthStore();
  const permissions = usePermissions();

  // Check if user is an admin
  if (!permissions.canManageCompany()) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400 mb-6">
              This dashboard is only accessible to company administrators.
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

  const companyDashboardQuery = useQuery(
    trpc.getCompanyDashboardStats.queryOptions({ token: token || "" })
  );

  const isLoading = companyDashboardQuery.isLoading;
  const data = companyDashboardQuery.data;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
              <Building2 className="h-6 w-6 text-cinematic-gold-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Company Dashboard</h1>
          </div>
          <p className="text-gray-400">
            Comprehensive overview of {user?.companyName || "your company"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-12 w-12 animate-spin text-cinematic-gold-500" />
          </div>
        ) : data ? (
          <>
            {/* Company Overview */}
            <CompanyOverviewCard company={data.company} />

            {/* Team and Production Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TeamOverviewCard team={data.team} />
              <ProductionOverviewCard
                shows={data.shows}
                scenes={data.scenes}
                content={data.content}
              />
            </div>

            {/* Production Houses */}
            {data.productionHouses.total > 0 && (
              <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cinematic-emerald-500/20 rounded-lg">
                      <Building2 className="h-6 w-6 text-cinematic-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Production Houses</h2>
                      <p className="text-sm text-gray-400">
                        {data.productionHouses.total} production {data.productionHouses.total === 1 ? "house" : "houses"}
                      </p>
                    </div>
                  </div>
                  {permissions.canManageProductionHouses() && (
                    <Link
                      to="/production-houses"
                      className="text-sm text-cinematic-gold-400 hover:text-cinematic-gold-300 font-medium transition-colors"
                    >
                      View All
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.productionHouses.houses.map((house) => (
                    <div
                      key={house.id}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                    >
                      <h3 className="font-semibold text-white mb-2">{house.name}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clapperboard className="h-4 w-4" />
                          {house.showCount} {house.showCount === 1 ? "show" : "shows"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {house.memberCount} {house.memberCount === 1 ? "member" : "members"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-cinematic-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                  <p className="text-sm text-gray-400">Last 30 days</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <ActivityStat label="New Users" value={data.recentActivity.users} icon={UserPlus} />
                <ActivityStat label="New Shows" value={data.recentActivity.shows} icon={Clapperboard} />
                <ActivityStat label="Scenes Added" value={data.recentActivity.scenes} icon={Calendar} />
                <ActivityStat label="Call Sheets" value={data.recentActivity.callSheets} icon={FileText} />
                <ActivityStat label="Reports" value={data.recentActivity.reports} icon={FileText} />
                <ActivityStat label="Announcements" value={data.recentActivity.announcements} icon={Bell} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {permissions.canManageTeam() && (
                  <QuickActionButton
                    icon={UserPlus}
                    label="Invite Team Member"
                    description="Add new users"
                    href="/team"
                  />
                )}
                {permissions.canManageShows() && (
                  <QuickActionButton
                    icon={Plus}
                    label="Create Show"
                    description="Start new production"
                    href="/shows/new"
                  />
                )}
                {permissions.canManageProductionHouses() && (
                  <QuickActionButton
                    icon={Building2}
                    label="Production Houses"
                    description="Manage houses"
                    href="/production-houses"
                  />
                )}
                <QuickActionButton
                  icon={Settings}
                  label="Company Settings"
                  description="Configure company"
                  href="/settings"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">Failed to load company dashboard data</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

interface ActivityStatProps {
  label: string;
  value: number;
  icon: React.ElementType;
}

function ActivityStat({ label, value, icon: Icon }: ActivityStatProps) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-cinematic-gold-400" />
        <span className="text-xs font-medium text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
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
