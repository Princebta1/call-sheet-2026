import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { 
  AlertCircle, 
  Bell, 
  Calendar, 
  FileText, 
  MessageSquare,
  CheckCircle2,
  Clapperboard,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AnnouncementCardProps {
  announcement: {
    id: number;
    subject: string;
    content: string;
    type: string;
    priority: string;
    createdAt: Date;
    sender: {
      id: number;
      name: string;
      profileImage: string | null;
      role: string;
    };
    show: {
      id: number;
      title: string;
    } | null;
    isRead: boolean;
    readAt: Date | null;
  };
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  const markReadMutation = useMutation(
    trpc.markAnnouncementRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAnnouncements.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getAnnouncementStats.queryKey(),
        });
      },
    })
  );

  const handleMarkAsRead = () => {
    if (!announcement.isRead) {
      markReadMutation.mutate({
        token: token || "",
        announcementId: announcement.id,
      });
    }
  };

  const getPriorityStyles = () => {
    switch (announcement.priority) {
      case "urgent":
        return "bg-red-500/10 border-red-500/30 text-red-400";
      case "high":
        return "bg-orange-500/10 border-orange-500/30 text-orange-400";
      case "normal":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "low":
        return "bg-gray-500/10 border-gray-500/30 text-gray-400";
      default:
        return "bg-gray-500/10 border-gray-500/30 text-gray-400";
    }
  };

  const getTypeIcon = () => {
    switch (announcement.type) {
      case "production_update":
        return <Clapperboard className="h-4 w-4" />;
      case "call_sheet_update":
        return <FileText className="h-4 w-4" />;
      case "schedule_change":
        return <Calendar className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (announcement.type) {
      case "production_update":
        return "Production Update";
      case "call_sheet_update":
        return "Call Sheet Update";
      case "schedule_change":
        return "Schedule Change";
      default:
        return "General";
    }
  };

  return (
    <div
      onClick={handleMarkAsRead}
      className={`bg-gradient-to-br from-gray-900 to-gray-900/50 border rounded-2xl p-6 transition-all cursor-pointer hover:border-cinematic-blue-500/50 ${
        announcement.isRead
          ? "border-gray-800 opacity-75"
          : "border-cinematic-blue-500/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Sender Avatar */}
          {announcement.sender.profileImage ? (
            <img
              src={announcement.sender.profileImage}
              alt={announcement.sender.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-cinematic-blue-500 to-cinematic-blue-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {announcement.sender.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Sender Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-white">
                {announcement.sender.name}
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-400">
                {announcement.sender.role}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(announcement.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {announcement.show && (
                <>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-400">
                    {announcement.show.title}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Read Status */}
        {announcement.isRead ? (
          <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
        ) : (
          <div className="relative flex-shrink-0">
            <Bell className="h-5 w-5 text-cinematic-blue-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-cinematic-blue-400 rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-3">
        {/* Type Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs font-medium text-gray-300">
          {getTypeIcon()}
          <span>{getTypeLabel()}</span>
        </div>

        {/* Priority Badge */}
        {(announcement.priority === "urgent" || announcement.priority === "high") && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-xs font-bold ${getPriorityStyles()}`}
          >
            <AlertCircle className="h-3 w-3" />
            <span>
              {announcement.priority === "urgent" ? "URGENT" : "HIGH PRIORITY"}
            </span>
          </div>
        )}
      </div>

      {/* Subject */}
      <h3 className="text-lg font-bold text-white mb-2">
        {announcement.subject}
      </h3>

      {/* Content */}
      <p className="text-gray-300 text-sm whitespace-pre-wrap line-clamp-3">
        {announcement.content}
      </p>

      {/* Read More Indicator */}
      {announcement.content.length > 200 && (
        <button className="mt-2 text-xs text-cinematic-blue-400 hover:text-cinematic-blue-300 font-medium">
          Read more
        </button>
      )}
    </div>
  );
}
