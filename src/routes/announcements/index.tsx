import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { DashboardLayout } from "~/components/DashboardLayout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { AnnouncementCard } from "~/components/AnnouncementCard";
import { SendAnnouncementModal } from "~/components/SendAnnouncementModal";
import { usePermissions } from "~/hooks/usePermissions";
import { useState } from "react";
import { Bell, Plus, Loader2, Inbox } from "lucide-react";

export const Route = createFileRoute("/announcements/")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  return (
    <ProtectedRoute requiredPermission="view_announcements">
      <AnnouncementsPageContent />
    </ProtectedRoute>
  );
}

function AnnouncementsPageContent() {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const permissions = usePermissions();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const announcementsQuery = useQuery(
    trpc.getAnnouncements.queryOptions({ token: token || "" })
  );

  const statsQuery = useQuery(
    trpc.getAnnouncementStats.queryOptions({ token: token || "" })
  );

  const announcements = announcementsQuery.data || [];
  const stats = statsQuery.data || { total: 0, unread: 0, urgentUnread: 0 };

  // Filter announcements based on selected filter
  const filteredAnnouncements = announcements.filter((announcement) => {
    if (filter === "unread") return !announcement.isRead;
    if (filter === "read") return announcement.isRead;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
                <Bell className="h-6 w-6 text-cinematic-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Announcements</h1>
              {stats.unread > 0 && (
                <span className="px-3 py-1 bg-cinematic-blue-500 text-white text-sm font-bold rounded-full">
                  {stats.unread}
                </span>
              )}
            </div>
            <p className="text-gray-400">
              Stay updated with production news and schedule changes
            </p>
          </div>

          {permissions.canSendAnnouncements() && (
            <button
              onClick={() => setSendModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cinematic-blue-500 to-cinematic-blue-600 text-white rounded-lg hover:from-cinematic-blue-600 hover:to-cinematic-blue-700 transition-all font-semibold shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Send Announcement
            </button>
          )}
        </div>

        {/* Stats Cards */}
        {stats.urgentUnread > 0 && (
          <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Bell className="h-6 w-6 text-red-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {stats.urgentUnread} Urgent Announcement{stats.urgentUnread !== 1 ? "s" : ""}
                </h3>
                <p className="text-red-300 text-sm">
                  Please review these high-priority messages immediately
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-800">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2.5 font-medium transition-all ${
              filter === "all"
                ? "text-cinematic-blue-400 border-b-2 border-cinematic-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2.5 font-medium transition-all ${
              filter === "unread"
                ? "text-cinematic-blue-400 border-b-2 border-cinematic-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Unread ({stats.unread})
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-4 py-2.5 font-medium transition-all ${
              filter === "read"
                ? "text-cinematic-blue-400 border-b-2 border-cinematic-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Read ({stats.total - stats.unread})
          </button>
        </div>

        {/* Announcements List */}
        {announcementsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cinematic-blue-500" />
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
              <Inbox className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {filter === "unread"
                ? "No unread announcements"
                : filter === "read"
                ? "No read announcements"
                : "No announcements yet"}
            </h3>
            <p className="text-gray-400 mb-6">
              {filter === "all"
                ? "Announcements from your team will appear here"
                : filter === "unread"
                ? "You're all caught up!"
                : "Read announcements will appear here"}
            </p>
            {permissions.canSendAnnouncements() && filter === "all" && (
              <button
                onClick={() => setSendModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cinematic-blue-500 text-white rounded-lg hover:bg-cinematic-blue-600 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                Send First Announcement
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        )}
      </div>

      {/* Send Announcement Modal */}
      <SendAnnouncementModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
      />
    </DashboardLayout>
  );
}
