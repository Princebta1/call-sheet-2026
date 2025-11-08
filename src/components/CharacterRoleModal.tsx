import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Theater } from "lucide-react";

const characterRoleSchema = z.object({
  name: z.string().min(1, "Character name is required"),
  description: z.string().optional(),
  type: z.enum(["Main", "Supporting", "Minor", "Extra"]),
});

type CharacterRoleForm = z.infer<typeof characterRoleSchema>;

interface CharacterRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CharacterRoleForm) => Promise<void>;
  isPending: boolean;
  characterRole?: {
    id: number;
    name: string;
    description?: string | null;
    type: string;
  } | null;
}

export function CharacterRoleModal({
  isOpen,
  onClose,
  onSave,
  isPending,
  characterRole,
}: CharacterRoleModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CharacterRoleForm>({
    resolver: zodResolver(characterRoleSchema),
    defaultValues: characterRole
      ? {
          name: characterRole.name,
          description: characterRole.description || "",
          type: characterRole.type as any,
        }
      : {
          type: "Supporting",
        },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: CharacterRoleForm) => {
    await onSave(data);
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
                          <Theater className="h-6 w-6 text-cinematic-gold-400" />
                        </div>
                        <Dialog.Title className="text-xl font-bold text-gray-100">
                          {characterRole ? "Edit Character Role" : "Create Character Role"}
                        </Dialog.Title>
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
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                          Character Name
                        </label>
                        <input
                          id="name"
                          type="text"
                          {...register("name")}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                          placeholder="e.g., Protagonist, Villain"
                        />
                        {errors.name && (
                          <p className="mt-2 text-sm text-red-400">{errors.name.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-2">
                          Character Type
                        </label>
                        <select
                          id="type"
                          {...register("type")}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                        >
                          <option value="Main">Main Character</option>
                          <option value="Supporting">Supporting Character</option>
                          <option value="Minor">Minor Character</option>
                          <option value="Extra">Extra</option>
                        </select>
                        {errors.type && (
                          <p className="mt-2 text-sm text-red-400">{errors.type.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                          Description (Optional)
                        </label>
                        <textarea
                          id="description"
                          {...register("description")}
                          rows={3}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all resize-none"
                          placeholder="Brief description of the character..."
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
                      {isPending ? "Saving..." : characterRole ? "Update" : "Create"}
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
