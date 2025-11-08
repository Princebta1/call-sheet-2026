import { Calendar } from "lucide-react";

interface ShootingDayBadgeProps {
  dayNumber: number;
  size?: "sm" | "md";
}

export function ShootingDayBadge({ dayNumber, size = "sm" }: ShootingDayBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
  };

  return (
    <div
      className={`inline-flex items-center gap-1 bg-cinematic-emerald-500/20 text-cinematic-emerald-400 rounded ${sizeClasses[size]} font-semibold border border-cinematic-emerald-500/30`}
    >
      <Calendar className="h-3 w-3" />
      Day {dayNumber}
    </div>
  );
}
