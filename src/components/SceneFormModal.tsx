import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { X, Film, Calendar, MapPin, Users, FileText } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";
import { ConflictWarningDialog } from "~/components/ConflictWarningDialog";

interface SceneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene?: any;
  showId?: number;
  selectedDate?: Date | null;
}

interface SceneFormData {
  showId: string;
  sceneNumber: string;
  title: string;
  description: string;
  location: string;
  scheduledTime: string;
  notes: string;
  shootingDayNumber: string;
  expectedDurationMinutes: string;
  scriptPageStart: string;
  scriptPageEnd: string;
  isReshoot: boolean;
  equipmentNeeded: string;
  specialInstructions: string;
  cameraSetup: string;
  lightingSetup: string;
  soundRequirements: string;
  props: string;
  costumes: string;
  makeup: string;
  vfxRequired: boolean;
  vfxNotes: string;
}

export function SceneFormModal({
  isOpen,
  onClose,
  scene,
  showId,
  selectedDate,
}: SceneFormModalProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  const isEditing = !!scene;

  const [conflictWarningOpen, setConflictWarningOpen] = useState(false);
  const [detectedConflicts, setDetectedConflicts] = useState<any>(null);
  const [sceneTitle, setSceneTitle] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SceneFormData>();

  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );

  const createSceneMutation = useMutation(
    trpc.createScene.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.getScenes.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getAllScenes.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getScenesWithConflicts.queryKey(),
        });
        
        // Check if there are conflicts
        if (data.conflicts && data.conflicts.hasConflicts) {
          setDetectedConflicts(data.conflicts);
          setConflictWarningOpen(true);
          // Don't close the modal or reset yet
        } else {
          toast.success("Scene created successfully!");
          reset();
          onClose();
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create scene");
      },
    })
  );

  const updateSceneMutation = useMutation(
    trpc.updateScene.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.getScenes.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getAllScenes.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getScenesWithConflicts.queryKey(),
        });
        
        // Check if there are conflicts
        if (data.conflicts && data.conflicts.hasConflicts) {
          setDetectedConflicts(data.conflicts);
          setConflictWarningOpen(true);
          // Don't close the modal yet
        } else {
          toast.success("Scene updated successfully!");
          onClose();
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update scene");
      },
    })
  );

  // Reset form when scene or selectedDate changes
  useEffect(() => {
    const formatDateForInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const getDefaultScheduledTime = () => {
      if (scene?.scheduledTime) {
        return new Date(scene.scheduledTime).toISOString().slice(0, 16);
      }
      if (selectedDate) {
        // Set to 9 AM on the selected date
        const date = new Date(selectedDate);
        date.setHours(9, 0, 0, 0);
        return formatDateForInput(date);
      }
      return "";
    };

    const parseJsonArray = (jsonString: string | null | undefined): string => {
      if (!jsonString) return "";
      try {
        const arr = JSON.parse(jsonString);
        return Array.isArray(arr) ? arr.join(", ") : "";
      } catch {
        return "";
      }
    };

    if (scene) {
      reset({
        showId: scene.showId?.toString() || "",
        sceneNumber: scene.sceneNumber || "",
        title: scene.title || "",
        description: scene.description || "",
        location: scene.location || "",
        scheduledTime: scene.scheduledTime
          ? new Date(scene.scheduledTime).toISOString().slice(0, 16)
          : "",
        notes: scene.notes || "",
        shootingDayNumber: scene.shootingDayNumber?.toString() || "",
        expectedDurationMinutes: scene.expectedDurationMinutes?.toString() || "",
        scriptPageStart: scene.scriptPageStart || "",
        scriptPageEnd: scene.scriptPageEnd || "",
        isReshoot: scene.isReshoot || false,
        equipmentNeeded: parseJsonArray(scene.equipmentNeeded),
        specialInstructions: scene.specialInstructions || "",
        cameraSetup: scene.cameraSetup || "",
        lightingSetup: scene.lightingSetup || "",
        soundRequirements: scene.soundRequirements || "",
        props: parseJsonArray(scene.props),
        costumes: parseJsonArray(scene.costumes),
        makeup: scene.makeup || "",
        vfxRequired: scene.vfxRequired || false,
        vfxNotes: scene.vfxNotes || "",
      });
    } else {
      reset({
        showId: showId?.toString() || "",
        sceneNumber: "",
        title: "",
        description: "",
        location: "",
        scheduledTime: getDefaultScheduledTime(),
        notes: "",
        shootingDayNumber: "",
        expectedDurationMinutes: "",
        scriptPageStart: "",
        scriptPageEnd: "",
        isReshoot: false,
        equipmentNeeded: "",
        specialInstructions: "",
        cameraSetup: "",
        lightingSetup: "",
        soundRequirements: "",
        props: "",
        costumes: "",
        makeup: "",
        vfxRequired: false,
        vfxNotes: "",
      });
    }
  }, [scene, showId, selectedDate, reset]);

  const onSubmit = (data: SceneFormData) => {
    setSceneTitle(data.title); // Store for conflict dialog
    
    const parseCommaSeparated = (str: string): string[] => {
      if (!str.trim()) return [];
      return str.split(',').map(item => item.trim()).filter(item => item.length > 0);
    };

    const sceneData = {
      token: token || "",
      showId: parseInt(data.showId),
      sceneNumber: data.sceneNumber,
      title: data.title,
      description: data.description || undefined,
      location: data.location || undefined,
      scheduledTime: data.scheduledTime
        ? new Date(data.scheduledTime).toISOString()
        : undefined,
      notes: data.notes || undefined,
      shootingDayNumber: data.shootingDayNumber ? parseInt(data.shootingDayNumber) : undefined,
      expectedDurationMinutes: data.expectedDurationMinutes ? parseInt(data.expectedDurationMinutes) : undefined,
      scriptPageStart: data.scriptPageStart || undefined,
      scriptPageEnd: data.scriptPageEnd || undefined,
      isReshoot: data.isReshoot,
      equipmentNeeded: parseCommaSeparated(data.equipmentNeeded),
      specialInstructions: data.specialInstructions || undefined,
      cameraSetup: data.cameraSetup || undefined,
      lightingSetup: data.lightingSetup || undefined,
      soundRequirements: data.soundRequirements || undefined,
      props: parseCommaSeparated(data.props),
      costumes: parseCommaSeparated(data.costumes),
      makeup: data.makeup || undefined,
      vfxRequired: data.vfxRequired,
      vfxNotes: data.vfxNotes || undefined,
    };

    if (isEditing) {
      updateSceneMutation.mutate({
        ...sceneData,
        sceneId: scene.id,
      });
    } else {
      createSceneMutation.mutate(sceneData);
    }
  };

  const isPending = createSceneMutation.isPending || updateSceneMutation.isPending;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/95 border border-gray-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
                      <Film className="h-6 w-6 text-cinematic-gold-400" />
                    </div>
                    {isEditing ? "Edit Scene" : "Create New Scene"}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Show Selection */}
                  <div>
                    <label
                      htmlFor="showId"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Show *
                    </label>
                    <select
                      id="showId"
                      {...register("showId", { required: "Show is required" })}
                      disabled={!!showId || isEditing}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a show</option>
                      {showsQuery.data?.map((show) => (
                        <option key={show.id} value={show.id}>
                          {show.title}
                        </option>
                      ))}
                    </select>
                    {errors.showId && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors.showId.message}
                      </p>
                    )}
                  </div>

                  {/* Scene Number and Title */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="sceneNumber"
                        className="block text-sm font-medium text-gray-300 mb-2"
                      >
                        Scene Number *
                      </label>
                      <input
                        id="sceneNumber"
                        type="text"
                        {...register("sceneNumber", {
                          required: "Scene number is required",
                        })}
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                        placeholder="e.g., 1A"
                      />
                      {errors.sceneNumber && (
                        <p className="mt-1 text-sm text-red-400">
                          {errors.sceneNumber.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-gray-300 mb-2"
                      >
                        Title *
                      </label>
                      <input
                        id="title"
                        type="text"
                        {...register("title", {
                          required: "Title is required",
                        })}
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                        placeholder="Scene title"
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-400">
                          {errors.title.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      {...register("description")}
                      rows={3}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 resize-none"
                      placeholder="Brief description of the scene"
                    />
                  </div>

                  {/* Location and Scheduled Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="location"
                        className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        Location
                      </label>
                      <input
                        id="location"
                        type="text"
                        {...register("location")}
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                        placeholder="Filming location"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="scheduledTime"
                        className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        Scheduled Time
                      </label>
                      <input
                        id="scheduledTime"
                        type="datetime-local"
                        {...register("scheduledTime")}
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      {...register("notes")}
                      rows={3}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 resize-none"
                      placeholder="Additional notes or instructions"
                    />
                  </div>

                  {/* Production Details Section */}
                  <div className="pt-4 border-t border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Production Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label
                          htmlFor="shootingDayNumber"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Shooting Day #
                        </label>
                        <input
                          id="shootingDayNumber"
                          type="number"
                          {...register("shootingDayNumber")}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                          placeholder="e.g., 1"
                          min="1"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="expectedDurationMinutes"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Expected Duration (min)
                        </label>
                        <input
                          id="expectedDurationMinutes"
                          type="number"
                          {...register("expectedDurationMinutes")}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                          placeholder="e.g., 45"
                          min="1"
                        />
                      </div>

                      <div className="flex items-center pt-8">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register("isReshoot")}
                            className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-cinematic-gold-500 focus:ring-2 focus:ring-cinematic-gold-500"
                          />
                          <span className="text-sm font-medium text-gray-300">
                            This is a reshoot
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label
                          htmlFor="scriptPageStart"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Script Page Start
                        </label>
                        <input
                          id="scriptPageStart"
                          type="text"
                          {...register("scriptPageStart")}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                          placeholder="e.g., 12"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="scriptPageEnd"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Script Page End
                        </label>
                        <input
                          id="scriptPageEnd"
                          type="text"
                          {...register("scriptPageEnd")}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                          placeholder="e.g., 15"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="specialInstructions"
                        className="block text-sm font-medium text-gray-300 mb-2"
                      >
                        Special Instructions
                      </label>
                      <textarea
                        id="specialInstructions"
                        {...register("specialInstructions")}
                        rows={2}
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 resize-none"
                        placeholder="Any critical details or special requirements"
                      />
                    </div>
                  </div>

                  {/* Technical Requirements Section */}
                  <div className="pt-4 border-t border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Technical Requirements</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="cameraSetup"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Camera Setup
                        </label>
                        <input
                          id="cameraSetup"
                          type="text"
                          {...register("cameraSetup")}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                          placeholder="e.g., 2-camera setup, dolly track"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="lightingSetup"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Lighting Setup
                        </label>
                        <input
                          id="lightingSetup"
                          type="text"
                          {...register("lightingSetup")}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                          placeholder="e.g., Natural light, soft box"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="soundRequirements"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Sound Requirements
                        </label>
                        <input
                          id="soundRequirements"
                          type="text"
                          {...register("soundRequirements")}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                          placeholder="e.g., Boom mic, wireless lavs"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="equipmentNeeded"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Equipment Needed
                        </label>
                        <input
                          id="equipmentNeeded"
                          type="text"
                          {...register("equipmentNeeded")}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                          placeholder="Comma-separated: Steadicam, fog machine, etc."
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Separate items with commas
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Art Department Section */}
                  <div className="pt-4 border-t border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Art Department</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="props"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Props
                        </label>
                        <input
                          id="props"
                          type="text"
                          {...register("props")}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                          placeholder="Comma-separated: Wine glass, newspaper, etc."
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Separate items with commas
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="costumes"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Costumes
                        </label>
                        <input
                          id="costumes"
                          type="text"
                          {...register("costumes")}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                          placeholder="Comma-separated: Suit, evening gown, etc."
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Separate items with commas
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="makeup"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Makeup Requirements
                        </label>
                        <input
                          id="makeup"
                          type="text"
                          {...register("makeup")}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                          placeholder="e.g., Bruise makeup, aging"
                        />
                      </div>
                    </div>
                  </div>

                  {/* VFX Section */}
                  <div className="pt-4 border-t border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Visual Effects</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register("vfxRequired")}
                            className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-cinematic-gold-500 focus:ring-2 focus:ring-cinematic-gold-500"
                          />
                          <span className="text-sm font-medium text-gray-300">
                            VFX Required
                          </span>
                        </label>
                      </div>

                      <div>
                        <label
                          htmlFor="vfxNotes"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          VFX Notes
                        </label>
                        <textarea
                          id="vfxNotes"
                          {...register("vfxNotes")}
                          rows={2}
                          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 resize-none"
                          placeholder="Describe VFX requirements"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 text-gray-300 hover:text-white transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-6 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold shadow-lg shadow-cinematic-gold-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending
                        ? isEditing
                          ? "Updating..."
                          : "Creating..."
                        : isEditing
                        ? "Update Scene"
                        : "Create Scene"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
      
      {/* Conflict Warning Dialog */}
      {conflictWarningOpen && detectedConflicts && (
        <ConflictWarningDialog
          isOpen={conflictWarningOpen}
          onClose={() => {
            setConflictWarningOpen(false);
            setDetectedConflicts(null);
          }}
          onProceed={() => {
            setConflictWarningOpen(false);
            setDetectedConflicts(null);
            toast.success(isEditing ? "Scene updated successfully!" : "Scene created successfully!");
            reset();
            onClose();
          }}
          conflicts={detectedConflicts.conflicts}
          sceneTitle={sceneTitle}
        />
      )}
    </Transition>
  );
}
