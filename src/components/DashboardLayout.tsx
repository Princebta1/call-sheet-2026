import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { useMessageNotificationStore } from "~/stores/messageNotificationStore";
import { useMessagesLayoutStore } from "~/stores/messagesLayoutStore";
import { SearchBar } from "~/components/SearchBar";
import toast from "react-hot-toast";
import {
  Film,
  LayoutDashboard,
  Clapperboard,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Code2,
  Bell,
  Building2,
  MessageSquare,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { token, user, clearAuth } = useAuthStore();
  const permissions = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isFullScreen } = useMessagesLayoutStore();

  const trpc = useTRPC();
  const announcementsStatsQuery = useQuery(
    trpc.getAnnouncementStats.queryOptions({ token: token || "" })
  );
  const unreadCount = announcementsStatsQuery.data?.unread || 0;

  const { lastViewedTimestamps } = useMessageNotificationStore();
  const previousUnreadCountRef = useRef<number>(0);
  
  // Convert lastViewedTimestamps to the format expected by the API
  const lastViewedTimestampsForApi = Object.entries(lastViewedTimestamps).reduce(
    (acc, [showId, timestamp]) => {
      acc[showId] = new Date(timestamp).toISOString();
      return acc;
    },
    {} as Record<string, string>
  );

  const messageStatsQuery = useQuery({
    ...trpc.getMessageStats.queryOptions({
      token: token || "",
      lastViewedTimestamps: lastViewedTimestampsForApi,
    }),
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: !!token && permissions.canViewMessages(),
  });

  const unreadMessageCount = messageStatsQuery.data?.totalUnread || 0;

  // Update user presence every 2 minutes
  const updatePresenceMutation = useMutation(
    trpc.updateUserPresence.mutationOptions()
  );

  useEffect(() => {
    if (!token) return;

    // Update presence immediately on mount
    updatePresenceMutation.mutate({ token });

    // Then update every 2 minutes
    const interval = setInterval(() => {
      updatePresenceMutation.mutate({ token });
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Only depend on token, mutation is stable

  // Play notification sound and show toast notifications when new messages arrive
  useEffect(() => {
    if (messageStatsQuery.data && previousUnreadCountRef.current > 0) {
      const currentCount = messageStatsQuery.data.totalUnread;
      const previousCount = previousUnreadCountRef.current;
      
      if (currentCount > previousCount) {
        const newMessageCount = currentCount - previousCount;
        const unreadByShow = messageStatsQuery.data.unreadByShow;
        
        // Play notification sound
        const audio = new Audio("/notification-sound.mp3");
        audio.volume = 0.5; // Set volume to 50%
        audio.play().catch((error) => {
          console.log("Could not play notification sound:", error);
        });
        
        if (unreadByShow.length === 1) {
          // Single show with new messages
          toast(
            `${newMessageCount} new message${newMessageCount > 1 ? "s" : ""} in ${unreadByShow[0].showTitle}`,
            {
              icon: "💬",
              duration: 6000,
            }
          );
        } else if (unreadByShow.length > 1) {
          // Multiple shows with new messages
          toast(
            `${newMessageCount} new message${newMessageCount > 1 ? "s" : ""} across ${unreadByShow.length} shows`,
            {
              icon: "💬",
              duration: 6000,
            }
          );
        }
      }
    }
    
    previousUnreadCountRef.current = unreadMessageCount;
  }, [messageStatsQuery.data, unreadMessageCount]);

  const handleLogout = () => {
    clearAuth();
    navigate({ to: "/login" });
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requirePermission: () => true },
    { name: "Company Dashboard", href: "/company-dashboard", icon: Building2, requirePermission: () => permissions.canManageCompany() },
    { name: "Production Dashboard", href: "/production-admin-dashboard", icon: Clapperboard, requirePermission: () => permissions.canManageShows() || permissions.canManageCompany() },
    { name: "Productions", href: "/shows", icon: Clapperboard, requirePermission: () => true },
    { name: "Production Houses", href: "/production-houses", icon: Building2, requirePermission: () => permissions.isDeveloper() },
    { name: "Scenes", href: "/scenes", icon: Film, requirePermission: () => !permissions.isDeveloper() },
    { name: "Calendar", href: "/calendar", icon: Calendar, requirePermission: () => !permissions.isDeveloper() },
    { name: "Announcements", href: "/announcements", icon: Bell, requirePermission: () => permissions.canViewAnnouncements(), badge: unreadCount > 0 ? unreadCount : undefined },
    { name: "Messages", href: "/shows", icon: MessageSquare, requirePermission: () => permissions.canViewMessages(), badge: unreadMessageCount > 0 ? unreadMessageCount : undefined },
    { name: "Call Sheets", href: "/call-sheets", icon: FileText, requirePermission: () => !permissions.isDeveloper() },
    { name: "Team", href: "/team", icon: Users, requirePermission: () => permissions.canViewTeamPage() },
    { name: "Actors", href: "/actors", icon: Users, requirePermission: () => !permissions.isDeveloper() },
    { name: "Reports", href: "/reports", icon: FileText, requirePermission: () => permissions.canViewReportsPage() && !permissions.isDeveloper() },
    { name: "Settings", href: "/settings", icon: Settings, requirePermission: () => true },
    { name: "Developer Dashboard", href: "/developer-dashboard", icon: Code2, requirePermission: () => permissions.isDeveloper() },
  ];

  // Filter navigation based on user permissions
  const filteredNavigation = navigation.filter(item => item.requirePermission());

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!isFullScreen && (
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-800">
              <div className="bg-gradient-to-br from-cinematic-gold-500 to-cinematic-gold-600 p-2 rounded-lg">
                <Film className="h-6 w-6 text-gray-950" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient-gold">
                  Call Sheet
                </h1>
                <p className="text-xs text-gray-400">{user?.companyName}</p>
              </div>
            </div>

            {/* Navigation */}
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
                  {item.badge && (
                    <span className="ml-auto px-2 py-0.5 bg-cinematic-blue-500 text-white text-xs font-bold rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {!item.badge && (
                    <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>
              ))}
            </nav>

            {/* User profile */}
            <div className="border-t border-gray-800 p-4">
              <div className="flex items-center gap-3 mb-3">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-cinematic-blue-500 to-cinematic-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {user?.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100 truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.role}</p>
                  {user?.statusMessage && (
                    <p className="text-xs text-gray-500 italic truncate">
                      "{user.statusMessage}"
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className={isFullScreen ? "" : "lg:pl-64"}>
        {/* Mobile header */}
        {!isFullScreen && (
          <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-400 hover:text-white"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-cinematic-gold-500 to-cinematic-gold-600 p-2 rounded-lg">
                  <Film className="h-5 w-5 text-gray-950" />
                </div>
                <span className="text-lg font-bold text-gradient-gold">
                  Call Sheet
                </span>
              </div>
              <div className="w-6" /> {/* Spacer for centering */}
            </div>
            <div className="px-4 pb-3">
              <SearchBar />
            </div>
          </header>
        )}

        {/* Desktop header */}
        {!isFullScreen && (
          <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 hidden lg:block">
            <div className="flex items-center justify-center px-6 py-4">
              <SearchBar />
            </div>
          </header>
        )}

        {/* Page content */}
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
