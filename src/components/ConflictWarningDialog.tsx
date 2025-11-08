import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { AlertTriangle, X, Users, Clock } from "lucide-react";

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

interface ConflictWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  conflicts: ConflictInfo[];
  sceneTitle: string;
}

export function ConflictWarningDialog({
  isOpen,
  onClose,
  onProceed,
  conflicts,
  sceneTitle,
}: ConflictWarningDialogProps) {
  const resourceConflicts = conflicts.filter(c => c.conflictType === "resource");
  const timeConflicts = conflicts.filter(c => c.conflictType === "time");

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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/95 border border-red-500/50 p-6 shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <Dialog.Title className="text-xl font-bold text-white">
                      Scheduling Conflicts Detected
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    The scene "<span className="font-semibold text-white">{sceneTitle}</span>" has{" "}
                    {conflicts.length} scheduling {conflicts.length === 1 ? "conflict" : "conflicts"}.
                  </p>

                  {/* Resource Conflicts */}
                  {resourceConflicts.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-400 font-semibold mb-3">
                        <Users className="h-4 w-4" />
                        Resource Conflicts ({resourceConflicts.length})
                      </div>
                      <div className="space-y-2">
                        {resourceConflicts.map((conflict, idx) => (
                          <div key={idx} className="text-sm text-gray-300">
                            <div className="font-medium">
                              Scene {conflict.conflictingSceneNumber}: {conflict.conflictingSceneTitle}
                            </div>
                            {conflict.conflictingResources && conflict.conflictingResources.length > 0 && (
                              <div className="text-xs text-gray-500 ml-4">
                                {conflict.conflictingResources.length} cast/crew member(s) assigned to both scenes
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-gray-400">
                        The same people are scheduled for multiple scenes at the same time.
                      </div>
                    </div>
                  )}

                  {/* Time Conflicts */}
                  {timeConflicts.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold mb-3">
                        <Clock className="h-4 w-4" />
                        Time Overlaps ({timeConflicts.length})
                      </div>
                      <div className="space-y-2">
                        {timeConflicts.map((conflict, idx) => (
                          <div key={idx} className="text-sm text-gray-300">
                            Scene {conflict.conflictingSceneNumber}: {conflict.conflictingSceneTitle}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-gray-400">
                        These scenes are scheduled at overlapping times.
                      </div>
                    </div>
                  )}

                  {/* Warning Message */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                    <p className="text-sm text-gray-300">
                      You can still save this scene, but you may want to adjust the schedule or reassign cast/crew to avoid conflicts.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 text-gray-300 hover:text-white transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onProceed}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-semibold shadow-lg shadow-red-500/20"
                  >
                    Save Anyway
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
