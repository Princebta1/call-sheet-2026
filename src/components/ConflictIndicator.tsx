import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface ConflictInfo {
  sceneId: number;
  sceneNumber: string;
  sceneTitle: string;
  conflictType: "time" | "resource";
  conflictingSceneId: number;
  conflictingSceneNumber: string;
  conflictingSceneTitle: string;
  conflictingResources?: number[];
}

interface ConflictIndicatorProps {
  conflicts: ConflictInfo[];
  size?: "sm" | "md";
}

export function ConflictIndicator({ conflicts, size = "md" }: ConflictIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!conflicts || conflicts.length === 0) return null;

  const resourceConflicts = conflicts.filter(c => c.conflictType === "resource");
  const timeConflicts = conflicts.filter(c => c.conflictType === "time");

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const badgeSize = size === "sm" ? "text-[10px] px-1 py-0.5" : "text-xs px-1.5 py-0.5";

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`inline-flex items-center gap-1 ${badgeSize} bg-red-500/20 text-red-400 border border-red-500/50 rounded font-medium`}
      >
        <AlertTriangle className={iconSize} />
        {conflicts.length}
      </span>

      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 border border-red-500/50 rounded-lg shadow-xl">
          <div className="text-xs font-semibold text-red-400 mb-2">
            Scheduling Conflicts ({conflicts.length})
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {resourceConflicts.length > 0 && (
              <div>
                <div className="text-xs font-medium text-white mb-1">
                  Resource Conflicts:
                </div>
                {resourceConflicts.map((conflict, idx) => (
                  <div key={idx} className="text-xs text-gray-300 ml-2">
                    • Scene {conflict.conflictingSceneNumber}: {conflict.conflictingSceneTitle}
                    {conflict.conflictingResources && conflict.conflictingResources.length > 0 && (
                      <span className="text-gray-500">
                        {" "}({conflict.conflictingResources.length} shared)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {timeConflicts.length > 0 && (
              <div>
                <div className="text-xs font-medium text-white mb-1">
                  Time Overlaps:
                </div>
                {timeConflicts.map((conflict, idx) => (
                  <div key={idx} className="text-xs text-gray-300 ml-2">
                    • Scene {conflict.conflictingSceneNumber}: {conflict.conflictingSceneTitle}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
