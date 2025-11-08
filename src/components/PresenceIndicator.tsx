import { Circle } from "lucide-react";

interface PresenceIndicatorProps {
  lastActiveAt?: Date | string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
  statusMessage?: string | null;
}

export function PresenceIndicator({
  lastActiveAt,
  size = "md",
  showLabel = false,
  className = "",
  statusMessage,
}: PresenceIndicatorProps) {
  // Consider user online if active within last 5 minutes
  const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

  const isOnline = lastActiveAt
    ? new Date().getTime() - new Date(lastActiveAt).getTime() <
      ONLINE_THRESHOLD_MS
    : false;

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Circle
        className={`${sizeClasses[size]} ${
          isOnline
            ? "fill-green-500 text-green-500"
            : "fill-gray-500 text-gray-500"
        }`}
      />
      {showLabel && (
        <span
          className={`text-xs font-medium ${
            isOnline ? "text-green-500" : "text-gray-500"
          }`}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
      {statusMessage && (
        <span className="text-xs text-gray-400 italic">
          {statusMessage}
        </span>
      )}
    </div>
  );
}
