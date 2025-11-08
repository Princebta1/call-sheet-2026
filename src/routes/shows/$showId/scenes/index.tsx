import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import {
  Film,
  Play,
  Square,
  CheckCircle,
  Clock,
  MapPin,
  Plus,
  FileText,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { SceneFormModal } from "~/components/SceneFormModal";

export const Route = createFileRoute("/shows/$showId/scenes/")({
  component: ProductionScenesPage,
});

function ProductionScenesPage() {
  const { showId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const permissions = usePermissions();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const scenesQuery = useQuery(
    trpc.getScenes.queryOptions({
      token: token || "",
      showId: parseInt(showId),
    })
  );

  const startTimerMutation = useMutation(
    trpc.startSceneTimer.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getScenes.queryKey(),
        });
      },
    })
  );

  const stopTimerMutation = useMutation(
    trpc.stopSceneTimer.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getScenes.queryKey(),
        });
      },
    })
  );

  const markCompleteMutation = useMutation(
    trpc.markSceneComplete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getScenes.queryKey(),
        });
      },
    })
  );

  const scenes = scenesQuery.data || [];

  const canManageTimers = permissions.canManageTimers();
  const canMarkComplete = permissions.canMarkSceneComplete();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Scenes</h1>
          <p className="text-gray-400">Manage and track scene progress</p>
        </div>
        <button 
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold shadow-lg shadow-cinematic-gold-500/20"
        >
          <Plus className="h-5 w-5" />
          Add Scene
        </button>
      </div>

      {/* Scenes List */}
      {scenesQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinematic-gold-500"></div>
        </div>
      ) : scenes.length === 0 ? (
        <div className="text-center py-20">
          <Film className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-6">
            No scenes yet. Add your first scene to get started!
          </p>
          <button 
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-semibold"
          >
            <Plus className="h-5 w-5" />
            Add First Scene
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              canManageTimers={canManageTimers}
              canMarkComplete={canMarkComplete}
              onStartTimer={() =>
                startTimerMutation.mutate({
                  token: token || "",
                  sceneId: scene.id,
                })
              }
              onStopTimer={() =>
                stopTimerMutation.mutate({
                  token: token || "",
                  sceneId: scene.id,
                })
              }
              onMarkComplete={() =>
                markCompleteMutation.mutate({
                  token: token || "",
                  sceneId: scene.id,
                })
              }
            />
          ))}
        </div>
      )}

      <SceneFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        showId={parseInt(showId)}
      />
    </div>
  );
}

interface SceneCardProps {
  scene: any;
  canManageTimers: boolean;
  canMarkComplete: boolean;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onMarkComplete: () => void;
}

function SceneCard({
  scene,
  canManageTimers,
  canMarkComplete,
  onStartTimer,
  onStopTimer,
  onMarkComplete,
}: SceneCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (scene.status === "In Progress" && scene.timerStart) {
      const interval = setInterval(() => {
        const start = new Date(scene.timerStart).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [scene.status, scene.timerStart]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const parseJsonArray = (jsonString: string | null | undefined): string[] => {
    if (!jsonString) return [];
    try {
      const arr = JSON.parse(jsonString);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const statusColor =
    scene.status === "Complete"
      ? "bg-cinematic-emerald-500/20 text-cinematic-emerald-400 border-cinematic-emerald-500/30"
      : scene.status === "In Progress"
      ? "bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse"
      : "bg-gray-700/50 text-gray-400 border-gray-600";

  const equipment = parseJsonArray(scene.equipmentNeeded);
  const props = parseJsonArray(scene.props);
  const costumes = parseJsonArray(scene.costumes);

  return (
    <div
      className={`bg-gradient-to-br from-gray-900 to-gray-900/50 border rounded-2xl p-6 ${
        scene.status === "In Progress"
          ? "border-orange-500/50"
          : "border-gray-800"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="text-sm font-mono text-cinematic-gold-400 bg-cinematic-gold-500/10 px-2 py-1 rounded">
              Scene {scene.sceneNumber}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}
            >
              {scene.status}
            </span>
            {scene.isReshoot && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Reshoot
              </span>
            )}
            {scene.vfxRequired && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                VFX
              </span>
            )}
            {scene.shootingDayNumber && (
              <span className="text-xs text-gray-500">
                Day {scene.shootingDayNumber}
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{scene.title}</h3>
          {scene.description && (
            <p className="text-sm text-gray-400 mb-3">{scene.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {scene.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {scene.location}
              </span>
            )}
            {scene.scheduledTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {new Date(scene.scheduledTime).toLocaleString()}
              </span>
            )}
            {scene.durationMinutes && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {scene.durationMinutes} min
                {scene.expectedDurationMinutes && (
                  <span className={`ml-1 text-xs ${
                    scene.durationMinutes > scene.expectedDurationMinutes
                      ? 'text-orange-400'
                      : 'text-cinematic-emerald-400'
                  }`}>
                    (exp: {scene.expectedDurationMinutes})
                  </span>
                )}
              </span>
            )}
            {scene.scriptPageStart && scene.scriptPageEnd && (
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                pp. {scene.scriptPageStart}-{scene.scriptPageEnd}
              </span>
            )}
          </div>
        </div>

        {/* Timer Display */}
        {scene.status === "In Progress" && (
          <div className="ml-4 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <div className="text-3xl font-mono font-bold text-orange-400 text-center">
              {formatTime(elapsedTime)}
            </div>
            <div className="text-xs text-orange-400/70 text-center mt-1">
              Recording
            </div>
          </div>
        )}
      </div>

      {/* Show/Hide Details Button */}
      {(scene.specialInstructions || equipment.length > 0 || scene.cameraSetup || 
        scene.lightingSetup || scene.soundRequirements || props.length > 0 || 
        costumes.length > 0 || scene.makeup || scene.vfxNotes) && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-cinematic-gold-400 hover:text-cinematic-gold-300 mb-3 flex items-center gap-1"
        >
          {showDetails ? 'Hide' : 'Show'} Details
          <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="space-y-3 mb-4 pt-3 border-t border-gray-800">
          {scene.specialInstructions && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Special Instructions</h4>
              <p className="text-sm text-gray-300">{scene.specialInstructions}</p>
            </div>
          )}

          {(scene.cameraSetup || scene.lightingSetup || scene.soundRequirements) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Technical Requirements</h4>
              <div className="space-y-1 text-sm">
                {scene.cameraSetup && (
                  <div className="flex gap-2">
                    <span className="text-gray-500">Camera:</span>
                    <span className="text-gray-300">{scene.cameraSetup}</span>
                  </div>
                )}
                {scene.lightingSetup && (
                  <div className="flex gap-2">
                    <span className="text-gray-500">Lighting:</span>
                    <span className="text-gray-300">{scene.lightingSetup}</span>
                  </div>
                )}
                {scene.soundRequirements && (
                  <div className="flex gap-2">
                    <span className="text-gray-500">Sound:</span>
                    <span className="text-gray-300">{scene.soundRequirements}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {equipment.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Equipment Needed</h4>
              <div className="flex flex-wrap gap-2">
                {equipment.map((item, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(props.length > 0 || costumes.length > 0 || scene.makeup) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Art Department</h4>
              <div className="space-y-2">
                {props.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500">Props:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {props.map((item, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {costumes.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500">Costumes:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {costumes.map((item, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {scene.makeup && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-500">Makeup:</span>
                    <span className="text-gray-300">{scene.makeup}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {scene.vfxNotes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">VFX Notes</h4>
              <p className="text-sm text-gray-300">{scene.vfxNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
        {canManageTimers && scene.status !== "Complete" && (
          <>
            {scene.status === "In Progress" ? (
              <button
                onClick={onStopTimer}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-all font-medium"
              >
                <Square className="h-4 w-4" />
                Stop Timer
              </button>
            ) : (
              <button
                onClick={onStartTimer}
                className="flex items-center gap-2 px-4 py-2 bg-cinematic-emerald-500/20 text-cinematic-emerald-400 border border-cinematic-emerald-500/30 rounded-lg hover:bg-cinematic-emerald-500/30 transition-all font-medium"
              >
                <Play className="h-4 w-4" />
                Start Timer
              </button>
            )}
          </>
        )}

        {canMarkComplete && scene.status !== "Complete" && (
          <button
            onClick={onMarkComplete}
            className="flex items-center gap-2 px-4 py-2 bg-cinematic-blue-500/20 text-cinematic-blue-400 border border-cinematic-blue-500/30 rounded-lg hover:bg-cinematic-blue-500/30 transition-all font-medium"
          >
            <CheckCircle className="h-4 w-4" />
            Mark Complete
          </button>
        )}

        {scene.status === "Complete" && (
          <div className="flex items-center gap-2 text-cinematic-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Scene Complete</span>
          </div>
        )}
      </div>
    </div>
  );
}
