import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { DashboardLayout } from "~/components/DashboardLayout";
import { SceneFormModal } from "~/components/SceneFormModal";
import { GenerateCallSheetModal } from "~/components/GenerateCallSheetModal";
import { CalendarSidebar } from "~/components/CalendarSidebar";
import { CalendarFilters } from "~/components/CalendarFilters";
import { CrewAvatar } from "~/components/CrewAvatar";
import { ShootingDayBadge } from "~/components/ShootingDayBadge";
import { SceneColorLegend } from "~/components/SceneColorLegend";
import { ConflictIndicator } from "~/components/ConflictIndicator";
import { ConflictWarningDialog } from "~/components/ConflictWarningDialog";
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Edit,
  Trash2,
  Film,
  FileText,
  Users,
} from "lucide-react";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

const calendarSearchSchema = z.object({
  showIds: fallback(z.array(z.number()), []).default([]),
  location: fallback(z.string(), "").default(""),
  actorIds: fallback(z.array(z.number()), []).default([]),
  showConflictsOnly: fallback(z.boolean(), false).default(false),
});

export const Route = createFileRoute("/calendar/")({
  component: CalendarPage,
  validateSearch: zodValidator(calendarSearchSchema),
});

function CalendarPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const permissions = usePermissions();
  const navigate = useNavigate({ from: "/calendar" });
  const searchParams = Route.useSearch();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedScene, setSelectedScene] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCallSheetModalOpen, setIsCallSheetModalOpen] = useState(false);
  const [callSheetDate, setCallSheetDate] = useState<Date | null>(null);
  const [draggedScene, setDraggedScene] = useState<any>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [conflictWarningOpen, setConflictWarningOpen] = useState(false);
  const [pendingSceneData, setPendingSceneData] = useState<any>(null);
  const [detectedConflicts, setDetectedConflicts] = useState<any>(null);

  const scenesQuery = useQuery(
    trpc.getScenesWithConflicts.queryOptions({
      token: token || "",
      showIds: searchParams.showIds.length > 0 ? searchParams.showIds : undefined,
      // We'll filter by location and actors on the frontend since getScenesWithConflicts doesn't support those filters
    })
  );

  const usersQuery = useQuery(
    trpc.getCompanyUsers.queryOptions({ token: token || "" })
  );

  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );

  const deleteSceneMutation = useMutation(
    trpc.deleteScene.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllScenes.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getScenes.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getScenesWithConflicts.queryKey(),
        });
        toast.success("Scene deleted successfully!");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const updateSceneMutation = useMutation(
    trpc.updateScene.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllScenes.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getScenes.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getScenesWithConflicts.queryKey(),
        });
        toast.success("Scene rescheduled successfully!");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const scenes = useMemo(() => {
    let filtered = scenesQuery.data || [];
    
    // Apply location filter
    if (searchParams.location.trim() !== "") {
      filtered = filtered.filter(scene => 
        scene.location?.toLowerCase().includes(searchParams.location.toLowerCase())
      );
    }
    
    // Apply actor filter
    if (searchParams.actorIds.length > 0) {
      filtered = filtered.filter(scene => {
        if (!scene.assignedActors) return false;
        try {
          const actors = JSON.parse(scene.assignedActors);
          return Array.isArray(actors) && searchParams.actorIds.some(id => actors.includes(id));
        } catch {
          return false;
        }
      });
    }
    
    // Apply conflicts-only filter
    if (searchParams.showConflictsOnly) {
      filtered = filtered.filter(scene => scene.hasConflicts);
    }
    
    return filtered;
  }, [scenesQuery.data, searchParams.location, searchParams.actorIds, searchParams.showConflictsOnly]);

  const users = usersQuery.data?.users || [];
  const shows = showsQuery.data || [];
  const canManageScenes = permissions.canManageScenes();

  // Create a lookup map for users by ID
  const usersById = useMemo(() => {
    const map: Record<number, any> = {};
    users.forEach((user) => {
      map[user.id] = user;
    });
    return map;
  }, [users]);

  // Group scenes by date
  const scenesByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    scenes.forEach((scene) => {
      if (scene.scheduledTime) {
        const date = new Date(scene.scheduledTime);
        const dateKey = date.toISOString().split("T")[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(scene);
      }
    });
    // Sort scenes within each date by time
    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort(
        (a, b) =>
          new Date(a.scheduledTime).getTime() -
          new Date(b.scheduledTime).getTime()
      );
    });
    return grouped;
  }, [scenes]);

  // Get dates for current month
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add days from previous month to fill the week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add days from next month to fill the week
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentDate]);

  // Get unique crew members assigned to scenes on a specific date
  const getCrewForDate = (dateKey: string) => {
    const dayScenes = scenesByDate[dateKey] || [];
    const crewIds = new Set<number>();

    dayScenes.forEach((scene) => {
      // Parse assigned actors
      if (scene.assignedActors) {
        try {
          const actors = JSON.parse(scene.assignedActors);
          if (Array.isArray(actors)) {
            actors.forEach((id: number) => crewIds.add(id));
          }
        } catch {}
      }

      // Parse assigned crew
      if (scene.assignedCrew) {
        try {
          const crew = JSON.parse(scene.assignedCrew);
          if (Array.isArray(crew)) {
            crew.forEach((id: number) => crewIds.add(id));
          }
        } catch {}
      }
    });

    return Array.from(crewIds)
      .map((id) => usersById[id])
      .filter(Boolean)
      .slice(0, 5); // Limit to 5 for display
  };

  // Get the shooting day number for a specific date (if scenes share one)
  const getShootingDayForDate = (dateKey: string) => {
    const dayScenes = scenesByDate[dateKey] || [];
    if (dayScenes.length === 0) return null;

    // If all scenes on this date share the same shooting day number, return it
    const shootingDayNumbers = dayScenes
      .map((s) => s.shootingDayNumber)
      .filter((n) => n !== null);

    if (shootingDayNumbers.length === 0) return null;

    const firstDay = shootingDayNumbers[0];
    const allSame = shootingDayNumbers.every((n) => n === firstDay);

    return allSame ? firstDay : null;
  };

  const handlePreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEdit = (scene: any) => {
    setSelectedScene(scene);
    setIsModalOpen(true);
  };

  const handleCreate = (date?: Date) => {
    setSelectedScene(null);
    setSelectedDate(date || null);
    setIsModalOpen(true);
  };

  const handleDelete = (sceneId: number) => {
    if (confirm("Are you sure you want to delete this scene?")) {
      deleteSceneMutation.mutate({
        token: token || "",
        sceneId,
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedScene(null);
    setSelectedDate(null);
  };

  const handleGenerateCallSheet = (date?: Date) => {
    setCallSheetDate(date || new Date());
    setIsCallSheetModalOpen(true);
  };

  const handleCloseCallSheetModal = () => {
    setIsCallSheetModalOpen(false);
    setCallSheetDate(null);
  };

  const handleDragStart = (scene: any, e: React.DragEvent) => {
    if (!canManageScenes) return;
    setDraggedScene(scene);
    e.dataTransfer.effectAllowed = "move";
    // Make the drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedScene(null);
    setDragOverDate(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (dateKey: string, e: React.DragEvent) => {
    if (!canManageScenes || !draggedScene) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateKey);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (date: Date, e: React.DragEvent) => {
    e.preventDefault();
    if (!canManageScenes || !draggedScene) return;

    const dateKey = getDateKey(date);
    
    // Check if the scene is already on this date
    const currentDateKey = draggedScene.scheduledTime 
      ? getDateKey(new Date(draggedScene.scheduledTime))
      : null;
    
    if (currentDateKey === dateKey) {
      setDraggedScene(null);
      setDragOverDate(null);
      return;
    }

    // Preserve the time portion if the scene has a scheduled time, otherwise use 9:00 AM
    let newDateTime: Date;
    if (draggedScene.scheduledTime) {
      const existingTime = new Date(draggedScene.scheduledTime);
      newDateTime = new Date(date);
      newDateTime.setHours(existingTime.getHours(), existingTime.getMinutes(), 0, 0);
    } else {
      newDateTime = new Date(date);
      newDateTime.setHours(9, 0, 0, 0);
    }

    // Update the scene with the new scheduled time
    updateSceneMutation.mutate({
      token: token || "",
      sceneId: draggedScene.id,
      scheduledTime: newDateTime.toISOString(),
    });

    setDraggedScene(null);
    setDragOverDate(null);
  };

  const handleShowIdsChange = (showIds: number[]) => {
    navigate({
      search: (prev) => ({ ...prev, showIds }),
    });
  };

  const handleLocationChange = (location: string) => {
    navigate({
      search: (prev) => ({ ...prev, location }),
    });
  };

  const handleActorIdsChange = (actorIds: number[]) => {
    navigate({
      search: (prev) => ({ ...prev, actorIds }),
    });
  };

  const handleShowConflictsOnlyChange = (showConflictsOnly: boolean) => {
    navigate({
      search: (prev) => ({ ...prev, showConflictsOnly }),
    });
  };

  const handleClearAllFilters = () => {
    navigate({
      search: { showIds: [], location: "", actorIds: [], showConflictsOnly: false },
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getDateKey = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Production Calendar
            </h1>
            <p className="text-gray-400">
              Schedule and manage scenes across all productions
            </p>
          </div>
          {canManageScenes && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleGenerateCallSheet()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cinematic-blue-500 to-cinematic-blue-600 text-white rounded-lg hover:from-cinematic-blue-600 hover:to-cinematic-blue-700 transition-all font-semibold shadow-lg shadow-cinematic-blue-500/20"
              >
                <FileText className="h-5 w-5" />
                Generate Call Sheet
              </button>
              <button
                onClick={() => handleCreate()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold shadow-lg shadow-cinematic-gold-500/20"
              >
                <Plus className="h-5 w-5" />
                Add Scene
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <CalendarFilters
          shows={shows}
          users={users}
          selectedShowIds={searchParams.showIds}
          selectedLocation={searchParams.location}
          selectedActorIds={searchParams.actorIds}
          onShowIdsChange={handleShowIdsChange}
          onLocationChange={handleLocationChange}
          onActorIdsChange={handleActorIdsChange}
          onClearAll={handleClearAllFilters}
        />

        {/* Conflicts Filter Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={searchParams.showConflictsOnly}
              onChange={(e) => handleShowConflictsOnlyChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-red-500 focus:ring-2 focus:ring-red-500"
            />
            <span className="text-sm font-medium text-gray-300">
              Show only scenes with conflicts
            </span>
          </label>
          {searchParams.showConflictsOnly && (
            <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/30">
              {scenes.filter(s => s.hasConflicts).length} conflicted scene(s)
            </span>
          )}
        </div>

        {/* Calendar Controls */}
        <div className="flex items-center justify-between bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl p-4">
          <button
            onClick={handlePreviousMonth}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">
              {currentDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm text-cinematic-gold-400 hover:bg-cinematic-gold-500/10 rounded-lg transition-colors font-medium"
            >
              Today
            </button>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content with Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar - takes up 3 columns */}
          <div className="lg:col-span-3">
            {scenesQuery.isLoading || usersQuery.isLoading || showsQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinematic-gold-500"></div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-gray-800">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div
                      key={day}
                      className="p-3 text-center text-sm font-semibold text-gray-400 border-r border-gray-800 last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                  {daysInMonth.map((date, index) => {
                    const dateKey = getDateKey(date);
                    const dayScenes = scenesByDate[dateKey] || [];
                    const isCurrentMonthDay = isCurrentMonth(date);
                    const isTodayDay = isToday(date);
                    const shootingDay = getShootingDayForDate(dateKey);
                    const dayCrew = getCrewForDate(dateKey);

                    return (
                      <div
                        key={index}
                        className={`min-h-[140px] p-2 border-r border-b border-gray-800 last:border-r-0 ${
                          !isCurrentMonthDay ? "bg-gray-900/50" : ""
                        } ${isTodayDay ? "bg-cinematic-gold-500/5" : ""} ${
                          dragOverDate === dateKey && canManageScenes
                            ? "bg-cinematic-gold-500/10 border-cinematic-gold-500"
                            : ""
                        }`}
                        onDragOver={(e) => handleDragOver(dateKey, e)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(date, e)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isTodayDay
                                  ? "bg-cinematic-gold-500 text-gray-950 px-2 py-0.5 rounded-full"
                                  : isCurrentMonthDay
                                  ? "text-white"
                                  : "text-gray-600"
                              }`}
                            >
                              {date.getDate()}
                            </span>
                            {shootingDay && isCurrentMonthDay && (
                              <ShootingDayBadge dayNumber={shootingDay} />
                            )}
                          </div>
                          {canManageScenes && isCurrentMonthDay && (
                            <button
                              onClick={() => handleCreate(date)}
                              className="p-1 text-gray-500 hover:text-cinematic-gold-400 hover:bg-gray-800 rounded transition-colors"
                              title="Add scene"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* Crew Avatars */}
                        {dayCrew.length > 0 && isCurrentMonthDay && (
                          <div className="flex items-center gap-1 mb-2 flex-wrap">
                            {dayCrew.map((crew) => (
                              <CrewAvatar
                                key={crew.id}
                                name={crew.name}
                                profileImage={crew.profileImage}
                                size="sm"
                              />
                            ))}
                            {getCrewForDate(dateKey).length > 5 && (
                              <div className="h-6 w-6 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center border-2 border-gray-700">
                                +{getCrewForDate(dateKey).length - 5}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Scenes */}
                        <div className="space-y-1">
                          {dayScenes.slice(0, 2).map((scene) => (
                            <CalendarSceneCard
                              key={scene.id}
                              scene={scene}
                              canManage={canManageScenes}
                              onEdit={() => handleEdit(scene)}
                              onDelete={() => handleDelete(scene.id)}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              conflicts={scene.conflicts || []}
                            />
                          ))}
                          {dayScenes.length > 2 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{dayScenes.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Unscheduled Scenes */}
            {scenes.filter((s) => !s.scheduledTime).length > 0 && (
              <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl p-6 mt-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-gray-400" />
                  Unscheduled Scenes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scenes
                    .filter((s) => !s.scheduledTime)
                    .map((scene) => (
                      <UnscheduledSceneCard
                        key={scene.id}
                        scene={scene}
                        canManage={canManageScenes}
                        onEdit={() => handleEdit(scene)}
                        onDelete={() => handleDelete(scene.id)}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        conflicts={scene.conflicts || []}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - takes up 1 column */}
          <div className="lg:col-span-1 space-y-4">
            <SceneColorLegend />
            <CalendarSidebar
              scenes={scenes}
              users={users}
              currentMonth={currentDate}
            />
          </div>
        </div>
      </div>

      {/* Scene Form Modal */}
      <SceneFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        scene={selectedScene}
        selectedDate={selectedDate}
      />

      {/* Generate Call Sheet Modal */}
      <GenerateCallSheetModal
        isOpen={isCallSheetModalOpen}
        onClose={handleCloseCallSheetModal}
        selectedDate={callSheetDate}
      />

      {/* Conflict Warning Dialog */}
      {conflictWarningOpen && detectedConflicts && (
        <ConflictWarningDialog
          isOpen={conflictWarningOpen}
          onClose={() => {
            setConflictWarningOpen(false);
            setPendingSceneData(null);
            setDetectedConflicts(null);
          }}
          onProceed={() => {
            setConflictWarningOpen(false);
            // The scene was already created/updated, just clear the state
            setPendingSceneData(null);
            setDetectedConflicts(null);
          }}
          conflicts={detectedConflicts.conflicts}
          sceneTitle={pendingSceneData?.title || ""}
        />
      )}
    </DashboardLayout>
  );
}

interface CalendarSceneCardProps {
  scene: any;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart?: (scene: any, e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  conflicts?: any[];
}

function CalendarSceneCard({
  scene,
  canManage,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  conflicts = [],
}: CalendarSceneCardProps) {
  const time = new Date(scene.scheduledTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Determine color scheme based on scene properties
  let colorScheme = "";
  
  // Conflicts take priority in visual hierarchy
  if (conflicts.length > 0) {
    colorScheme = "bg-red-500/20 border-red-500/50";
  } else if (scene.status === "Complete") {
    colorScheme = "bg-cinematic-emerald-500/20 border-cinematic-emerald-500/50";
  } else if (scene.status === "In Progress") {
    colorScheme = "bg-orange-500/20 border-orange-500/50";
  } else if (scene.isReshoot) {
    colorScheme = "bg-amber-500/20 border-amber-500/50";
  } else if (scene.vfxRequired) {
    colorScheme = "bg-purple-500/20 border-purple-500/50";
  } else {
    colorScheme = "bg-gray-800 border-gray-700";
  }

  return (
    <div
      draggable={canManage}
      onDragStart={(e) => onDragStart && onDragStart(scene, e)}
      onDragEnd={(e) => onDragEnd && onDragEnd(e)}
      className={`group relative p-2 rounded-lg border ${colorScheme} hover:border-cinematic-gold-500/50 transition-all ${
        canManage ? "cursor-move" : "cursor-pointer"
      }`}
      onClick={onEdit}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1">
          <div className="text-xs text-gray-400">{time}</div>
          {scene.isReshoot && (
            <span className="text-[10px] px-1 py-0.5 bg-amber-500/30 text-amber-300 rounded">R</span>
          )}
          {scene.vfxRequired && (
            <span className="text-[10px] px-1 py-0.5 bg-purple-500/30 text-purple-300 rounded">VFX</span>
          )}
        </div>
        {conflicts.length > 0 && (
          <ConflictIndicator conflicts={conflicts} size="sm" />
        )}
      </div>
      <div className="text-xs font-medium text-white truncate">
        {scene.sceneNumber}: {scene.title}
      </div>
      {canManage && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-0.5 bg-gray-900 text-cinematic-blue-400 rounded hover:bg-gray-800"
          >
            <Edit className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-0.5 bg-gray-900 text-red-400 rounded hover:bg-gray-800"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

interface UnscheduledSceneCardProps {
  scene: any;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart?: (scene: any, e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  conflicts?: any[];
}

function UnscheduledSceneCard({
  scene,
  canManage,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  conflicts = [],
}: UnscheduledSceneCardProps) {
  // Determine color scheme based on scene properties
  let borderColor = "";
  
  // Conflicts take priority
  if (conflicts.length > 0) {
    borderColor = "border-red-500/30";
  } else if (scene.status === "Complete") {
    borderColor = "border-cinematic-emerald-500/30";
  } else if (scene.status === "In Progress") {
    borderColor = "border-orange-500/30";
  } else if (scene.isReshoot) {
    borderColor = "border-amber-500/30";
  } else if (scene.vfxRequired) {
    borderColor = "border-purple-500/30";
  } else {
    borderColor = "border-gray-700";
  }

  return (
    <div
      draggable={canManage}
      onDragStart={(e) => onDragStart && onDragStart(scene, e)}
      onDragEnd={(e) => onDragEnd && onDragEnd(e)}
      className={`bg-gray-800/50 border ${borderColor} rounded-lg p-3 hover:border-cinematic-gold-500/50 transition-all ${
        canManage ? "cursor-move" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <div className="text-xs font-mono text-cinematic-gold-400">
              Scene {scene.sceneNumber}
            </div>
            {conflicts.length > 0 && (
              <ConflictIndicator conflicts={conflicts} size="sm" />
            )}
            {scene.isReshoot && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                Reshoot
              </span>
            )}
            {scene.vfxRequired && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded">
                VFX
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-white truncate">
            {scene.title}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={onEdit}
              className="p-1 text-cinematic-blue-400 hover:bg-cinematic-blue-500/10 rounded transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {scene.location && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          {scene.location}
        </div>
      )}
    </div>
  );
}
