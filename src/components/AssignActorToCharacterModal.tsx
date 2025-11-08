import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, UserPlus } from "lucide-react";

const assignActorSchema = z.object({
  userId: z.number({ required_error: "Please select an actor" }),
  notes: z.string().optional(),
});

type AssignActorForm = z.infer<typeof assignActorSchema>;

interface AssignActorToCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (data: AssignActorForm) => Promise<void>;
  isPending: boolean;
  characterRole: {
    id: number;
    name: string;
  } | null;
  availableActors: Array<{
    id: number;
    name: string;
    email: string;
  }>;
}

export function AssignActorToCharacterModal({
  isOpen,
  onClose,
  onAssign,
  isPending,
  characterRole,
  availableActors,
}: AssignActorToCharacterModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AssignActorForm>({
    resolver: zodResolver(assignActorSchema),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: AssignActorForm) => {
    await onAssign(data);
    handleClose();
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
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
              <Dialog.Panel className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl">
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-cinematic-gold-500/20 p-2 rounded-lg">
                          <UserPlus className="h-6 w-6 text-cinematic-gold-400" />
                        </div>
                        <div>
                          <Dialog.Title className="text-xl font-bold text-gray-100">
                            Assign Actor
                          </Dialog.Title>
                          {characterRole && (
                            <p className="text-sm text-gray-400 mt-1">
                              to {characterRole.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="userId" className="block text-sm font-medium text-gray-300 mb-2">
                          Select Actor
                        </label>
                        <select
                          id="userId"
                          {...register("userId", { valueAsNumber: true })}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                        >
                          <option value="">Choose an actor...</option>
                          {availableActors.map((actor) => (
                            <option key={actor.id} value={actor.id}>
                              {actor.name} ({actor.email})
                            </option>
                          ))}
                        </select>
                        {errors.userId && (
                          <p className="mt-2 text-sm text-red-400">{errors.userId.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
                          Notes (Optional)
                        </label>
                        <textarea
                          id="notes"
                          {...register("notes")}
                          rows={3}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all resize-none"
                          placeholder="Any special notes about this casting..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-800 p-6 flex gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isPending ? "Assigning..." : "Assign Actor"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
