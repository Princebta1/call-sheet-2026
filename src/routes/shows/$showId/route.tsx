import { createFileRoute, Link, Outlet, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useMessagesLayoutStore } from "~/stores/messagesLayoutStore";
import { DashboardLayout } from "~/components/DashboardLayout";
import { AccessDenied } from "~/components/AccessDenied";
import { usePermissions } from "~/hooks/usePermissions";
import {
  Film,
  Calendar,
  FileText,
  Users,
  BarChart2,
  Settings,
  Info,
  ChevronRight,
  Clapperboard,
  Bell,
  MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/shows/$showId")({
  component: ProductionLayout,
});

function ProductionLayout() {
  const { showId } = useParams({ from: "/shows/$showId" });
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const permissions = usePermissions();
  const { isFullScreen } = useMessagesLayoutStore();

  // Fetch the show details
  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );

  const show = showsQuery.data?.find((s) => s.id === parseInt(showId));

  // Check if user has access to this show
  if (showsQuery.isSuccess && !show) {
    return (
      <AccessDenied
        message="You do not have access to this production. Please contact an administrator if you believe this is an error."
      />
    );
  }

  const navigation = [
    { name: "Scenes", href: `/shows/${showId}/scenes`, icon: Film },
    { name: "Calendar", href: `/shows/${showId}/calendar`, icon: Calendar },
    { name: "Announcements", href: `/shows/${showId}/announcements`, icon: Bell, requirePermission: () => permissions.canViewAnnouncements() },
    { name: "Messages", href: `/shows/${showId}/messages`, icon: MessageSquare, requirePermission: () => permissions.canViewMessages() },
    { name: "Call Sheets", href: `/shows/${showId}/call-sheets`, icon: FileText },
    { name: "Actors", href: `/shows/${showId}/actors`, icon: Users },
    { name: "Crew", href: `/shows/${showId}/crew`, icon: Users },
    { name: "Reports", href: `/shows/${showId}/reports`, icon: BarChart2, requirePermission: () => permissions.canViewReportsPage() },
    { name: "Settings", href: `/shows/${showId}/settings`, icon: Settings },
    { name: "Profile", href: `/shows/${showId}/profile`, icon: Info },
  ];

  const filteredNavigation = navigation.filter(
    (item) => !item.requirePermission || item.requirePermission()
  );

  // If in full-screen mode, render only the Outlet without sidebars
  if (isFullScreen) {
    return (
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Production Sidebar */}
        <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
          {/* Production Header */}
          <div className="p-6 border-b border-gray-800">
            <Link
              to="/shows"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cinematic-gold-400 transition-colors mb-3"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back to Productions
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
                <Clapperboard className="h-5 w-5 text-cinematic-gold-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">
                  {show?.title || "Loading..."}
                </h2>
                {show?.status && (
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      show.status === "Shooting"
                        ? "bg-cinematic-emerald-500/20 text-cinematic-emerald-400"
                        : show.status === "Pre-Production"
                        ? "bg-cinematic-blue-500/20 text-cinematic-blue-400"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {show.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Production Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all group"
                activeProps={{
                  className: "bg-cinematic-gold-500/10 text-cinematic-gold-400 hover:bg-cinematic-gold-500/20",
                }}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
                <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </DashboardLayout>
  );
}
