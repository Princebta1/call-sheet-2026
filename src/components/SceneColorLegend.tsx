import { useState } from "react";
import { Info, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

export function SceneColorLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  const legendItems = [
    {
      label: "Conflict",
      colorClass: "bg-red-500/20 border-red-500/50",
      description: "Scene has scheduling conflicts",
      icon: "alert",
    },
    {
      label: "Complete",
      colorClass: "bg-cinematic-emerald-500/20 border-cinematic-emerald-500/50",
      description: "Scene has been shot and completed",
    },
    {
      label: "In Progress",
      colorClass: "bg-orange-500/20 border-orange-500/50",
      description: "Scene is currently being filmed",
    },
    {
      label: "Reshoot",
      colorClass: "bg-amber-500/20 border-amber-500/50",
      description: "Scene requires reshooting",
    },
    {
      label: "VFX Required",
      colorClass: "bg-purple-500/20 border-purple-500/50",
      description: "Scene requires visual effects",
    },
    {
      label: "Unshot",
      colorClass: "bg-gray-800 border-gray-700",
      description: "Scene has not been filmed yet",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-cinematic-blue-400" />
          <h3 className="text-lg font-bold text-white">Scene Color Guide</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {legendItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3"
            >
              <div
                className={`w-12 h-8 rounded-lg border ${item.colorClass} flex-shrink-0 flex items-center justify-center`}
              >
                {item.icon === "alert" && (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{item.label}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Scene priority is determined by status, with special markers (R for Reshoot, VFX) displayed on cards.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
