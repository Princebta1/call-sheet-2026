import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { DashboardLayout } from "~/components/DashboardLayout";
import { SceneFormModal } from "~/components/SceneFormModal";
import {
  Film,
  Plus,
  Calendar,
  MapPin,
  Clock,
  Edit,
  Trash2,
  Clapperboard,
  ChevronDown,
  FileText,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";

export const Route = createFileRoute("/scenes/")({
  component: ScenesPage,
});

function ScenesPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const permissions = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedScene, setSelectedScene] = useState<any>(null);

  const scenesQuery = useQuery(
    trpc.getAllScenes.queryOptions({ token: token || "" })
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
        toast.success("Scene deleted successfully!");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const scenes = scenesQuery.data || [];
  const canManageScenes = permissions.canManageScenes();

  const handleEdit = (scene: any) => {
    setSelectedScene(scene);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedScene(null);
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
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">All Scenes</h1>
            <p className="text-gray-400">
              View and manage scenes across all productions
            </p>
          </div>
          {canManageScenes && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold shadow-lg shadow-cinematic-gold-500/20"
            >
              <Plus className="h-5 w-5" />
              Add Scene
            </button>
          )}
        </div>

        {/* Scenes List */}
        {scenesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinematic-gold-500"></div>
          </div>
        ) : scenes.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-cinematic-gold-500/20 rounded-2xl mb-6">
              <Film className="h-10 w-10 text-cinematic-gold-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Scenes Yet</h2>
            <p className="text-gray-400 mb-6">
              {canManageScenes
                ? "Get started by creating your first scene."
                : "No scenes have been created yet."}
            </p>
            {canManageScenes && (
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-semibold"
              >
                <Plus className="h-5 w-5" />
                Create First Scene
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                canManage={canManageScenes}
                onEdit={() => handleEdit(scene)}
                onDelete={() => handleDelete(scene.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scene Form Modal */}
      <SceneFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        scene={selectedScene}
      />
    </DashboardLayout>
  );
}

interface SceneCardProps {
  scene: any;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function SceneCard({ scene, canManage, onEdit, onDelete }: SceneCardProps) {
  const [showDetails, setShowDetails] = useState(false);

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
      ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
      : "bg-gray-700/50 text-gray-400 border-gray-600";

  const equipment = parseJsonArray(scene.equipmentNeeded);
  const props = parseJsonArray(scene.props);
  const costumes = parseJsonArray(scene.costumes);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all">
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
            {scene.show && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clapperboard className="h-3 w-3" />
                {scene.show.title}
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
                <Calendar className="h-4 w-4" />
                {new Date(scene.scheduledTime).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
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

        {canManage && (
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={onEdit}
              className="p-2 text-cinematic-blue-400 hover:bg-cinematic-blue-500/10 rounded-lg transition-colors"
              title="Edit scene"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete scene"
            >
              <Trash2 className="h-5 w-5" />
            </button>
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

      {scene.notes && (
        <div className="pt-4 border-t border-gray-800">
          <p className="text-sm text-gray-400">
            <span className="font-medium text-gray-300">Notes:</span>{" "}
            {scene.notes}
          </p>
        </div>
      )}
    </div>
  );
}
