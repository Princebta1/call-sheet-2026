import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { AnnouncementCard } from "~/components/AnnouncementCard";
import { SendAnnouncementModal } from "~/components/SendAnnouncementModal";
import { usePermissions } from "~/hooks/usePermissions";
import { useState } from "react";
import { Bell, Plus, Loader2, Inbox } from "lucide-react";

export const Route = createFileRoute("/shows/$showId/announcements/")({
  component: ShowAnnouncementsPage,
});

function ShowAnnouncementsPage() {
  return (
    <ProtectedRoute requiredPermission="view_announcements">
      <ShowAnnouncementsPageContent />
    </ProtectedRoute>
  );
}

function ShowAnnouncementsPageContent() {
  const { showId } = useParams({ from: "/shows/$showId/announcements/" });
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const permissions = usePermissions();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  // Fetch show details
  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );
  const show = showsQuery.data?.find((s) => s.id === parseInt(showId));

  // Fetch show-specific announcements
  const announcementsQuery = useQuery(
    trpc.getAnnouncements.queryOptions({
      token: token || "",
      showId: parseInt(showId),
    })
  );

  const announcements = announcementsQuery.data || [];

  // Calculate stats
  const unreadCount = announcements.filter((a) => !a.isRead).length;
  const urgentUnreadCount = announcements.filter(
    (a) => !a.isRead && (a.priority === "urgent" || a.priority === "high")
  ).length;

  // Filter announcements
  const filteredAnnouncements = announcements.filter((announcement) => {
    if (filter === "unread") return !announcement.isRead;
    if (filter === "read") return announcement.isRead;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
              <Bell className="h-6 w-6 text-cinematic-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Announcements</h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-cinematic-blue-500 text-white text-sm font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-gray-400">
            Updates and notifications for {show?.title || "this production"}
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

      {/* Urgent Alert */}
      {urgentUnreadCount > 0 && (
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Bell className="h-6 w-6 text-red-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {urgentUnreadCount} Urgent Announcement{urgentUnreadCount !== 1 ? "s" : ""}
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
          All ({announcements.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2.5 font-medium transition-all ${
            filter === "unread"
              ? "text-cinematic-blue-400 border-b-2 border-cinematic-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter("read")}
          className={`px-4 py-2.5 font-medium transition-all ${
            filter === "read"
              ? "text-cinematic-blue-400 border-b-2 border-cinematic-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Read ({announcements.length - unreadCount})
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
              ? `Announcements for ${show?.title || "this production"} will appear here`
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

      {/* Send Announcement Modal */}
      <SendAnnouncementModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        showId={parseInt(showId)}
        showTitle={show?.title}
      />
    </div>
  );
}
