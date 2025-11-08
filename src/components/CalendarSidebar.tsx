import { Calendar, Users, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { CrewAvatar } from "~/components/CrewAvatar";
import { ShootingDayBadge } from "~/components/ShootingDayBadge";

interface Scene {
  id: number;
  sceneNumber: string;
  title: string;
  scheduledTime: string | null;
  shootingDayNumber: number | null;
  assignedActors?: string | null;
  assignedCrew?: string | null;
  hasConflicts?: boolean;
  conflicts?: any[];
}

interface User {
  id: number;
  name: string;
  profileImage?: string | null;
  role?: string;
}

interface CalendarSidebarProps {
  scenes: Scene[];
  users: User[];
  currentMonth: Date;
}

export function CalendarSidebar({ scenes, users, currentMonth }: CalendarSidebarProps) {
  const [isShootingDaysExpanded, setIsShootingDaysExpanded] = useState(true);
  const [isCrewExpanded, setIsCrewExpanded] = useState(true);
  const [isConflictsExpanded, setIsConflictsExpanded] = useState(true);

  // Calculate conflict summary
  const conflictSummary = useMemo(() => {
    const scenesWithConflicts = scenes.filter(scene => {
      if (!scene.scheduledTime || !scene.hasConflicts) return false;
      
      const sceneDate = new Date(scene.scheduledTime);
      return (
        sceneDate.getMonth() === currentMonth.getMonth() &&
        sceneDate.getFullYear() === currentMonth.getFullYear()
      );
    });

    const totalConflicts = scenesWithConflicts.reduce(
      (sum, scene) => sum + (scene.conflicts?.length || 0),
      0
    );

    return {
      scenesWithConflicts,
      totalConflicts,
    };
  }, [scenes, currentMonth]);

  // Group scenes by shooting day
  const shootingDays = useMemo(() => {
    const grouped: Record<number, Scene[]> = {};
    
    scenes.forEach((scene) => {
      if (scene.shootingDayNumber && scene.scheduledTime) {
        const sceneDate = new Date(scene.scheduledTime);
        // Only include scenes from the current month
        if (
          sceneDate.getMonth() === currentMonth.getMonth() &&
          sceneDate.getFullYear() === currentMonth.getFullYear()
        ) {
          if (!grouped[scene.shootingDayNumber]) {
            grouped[scene.shootingDayNumber] = [];
          }
          grouped[scene.shootingDayNumber].push(scene);
        }
      }
    });

    // Sort scenes within each day by scheduled time
    Object.keys(grouped).forEach((dayNum) => {
      grouped[parseInt(dayNum)].sort(
        (a, b) =>
          new Date(a.scheduledTime!).getTime() -
          new Date(b.scheduledTime!).getTime()
      );
    });

    return grouped;
  }, [scenes, currentMonth]);

  // Calculate crew availability for the month
  const crewAvailability = useMemo(() => {
    const availability: Record<number, { user: User; daysWorking: number }> = {};

    scenes.forEach((scene) => {
      if (!scene.scheduledTime) return;

      const sceneDate = new Date(scene.scheduledTime);
      if (
        sceneDate.getMonth() !== currentMonth.getMonth() ||
        sceneDate.getFullYear() !== currentMonth.getFullYear()
      ) {
        return;
      }

      const assignedUserIds = new Set<number>();

      // Parse assigned actors
      if (scene.assignedActors) {
        try {
          const actors = JSON.parse(scene.assignedActors);
          if (Array.isArray(actors)) {
            actors.forEach((id) => assignedUserIds.add(id));
          }
        } catch {}
      }

      // Parse assigned crew
      if (scene.assignedCrew) {
        try {
          const crew = JSON.parse(scene.assignedCrew);
          if (Array.isArray(crew)) {
            crew.forEach((id) => assignedUserIds.add(id));
          }
        } catch {}
      }

      // Count unique days per user
      assignedUserIds.forEach((userId) => {
        const user = users.find((u) => u.id === userId);
        if (user) {
          if (!availability[userId]) {
            availability[userId] = { user, daysWorking: 0 };
          }
          availability[userId].daysWorking++;
        }
      });
    });

    return Object.values(availability).sort((a, b) => b.daysWorking - a.daysWorking);
  }, [scenes, users, currentMonth]);

  const sortedShootingDayNumbers = Object.keys(shootingDays)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* Conflicts Summary */}
      {conflictSummary.totalConflicts > 0 && (
        <div className="bg-gradient-to-br from-red-900/20 to-red-900/5 border border-red-500/30 rounded-xl overflow-hidden">
          <button
            onClick={() => setIsConflictsExpanded(!isConflictsExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <h3 className="text-lg font-bold text-white">Conflicts</h3>
              <span className="text-sm text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30">
                {conflictSummary.totalConflicts}
              </span>
            </div>
            {isConflictsExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {isConflictsExpanded && (
            <div className="p-4 pt-0 space-y-2">
              <p className="text-xs text-gray-400 mb-3">
                {conflictSummary.scenesWithConflicts.length} scene(s) with scheduling conflicts this month
              </p>
              {conflictSummary.scenesWithConflicts.map((scene) => (
                <div
                  key={scene.id}
                  className="bg-gray-800/50 border border-red-500/30 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-mono text-cinematic-gold-400">
                      Scene {scene.sceneNumber}
                    </span>
                    <span className="text-xs text-red-400">
                      {scene.conflicts?.length || 0} conflict(s)
                    </span>
                  </div>
                  <div className="text-sm text-white font-medium mb-1">
                    {scene.title}
                  </div>
                  {scene.scheduledTime && (
                    <div className="text-xs text-gray-500">
                      {new Date(scene.scheduledTime).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shooting Days Schedule */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setIsShootingDaysExpanded(!isShootingDaysExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cinematic-gold-400" />
            <h3 className="text-lg font-bold text-white">Shooting Days</h3>
            <span className="text-sm text-gray-400">
              ({sortedShootingDayNumbers.length})
            </span>
          </div>
          {isShootingDaysExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {isShootingDaysExpanded && (
          <div className="p-4 pt-0 space-y-3">
            {sortedShootingDayNumbers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No shooting days scheduled this month
              </p>
            ) : (
              sortedShootingDayNumbers.map((dayNum) => {
                const dayScenes = shootingDays[dayNum];
                const firstScene = dayScenes[0];
                const date = firstScene.scheduledTime
                  ? new Date(firstScene.scheduledTime)
                  : null;

                return (
                  <div
                    key={dayNum}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <ShootingDayBadge dayNumber={dayNum} size="md" />
                      {date && (
                        <span className="text-xs text-gray-400">
                          {date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayScenes.map((scene) => (
                        <div
                          key={scene.id}
                          className="text-xs text-gray-300 flex items-start gap-2"
                        >
                          <span className="text-cinematic-gold-400 font-mono">
                            {scene.sceneNumber}
                          </span>
                          <span className="truncate">{scene.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Crew Availability */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setIsCrewExpanded(!isCrewExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cinematic-blue-400" />
            <h3 className="text-lg font-bold text-white">Crew Availability</h3>
            <span className="text-sm text-gray-400">
              ({crewAvailability.length})
            </span>
          </div>
          {isCrewExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {isCrewExpanded && (
          <div className="p-4 pt-0 space-y-2">
            {crewAvailability.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No crew assigned this month
              </p>
            ) : (
              crewAvailability.map(({ user, daysWorking }) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg p-2"
                >
                  <div className="flex items-center gap-2">
                    <CrewAvatar
                      name={user.name}
                      profileImage={user.profileImage}
                      size="sm"
                      showTooltip={false}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm text-white font-medium">
                        {user.name}
                      </span>
                      {user.role && (
                        <span className="text-xs text-gray-500">{user.role}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {daysWorking} {daysWorking === 1 ? "scene" : "scenes"}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
