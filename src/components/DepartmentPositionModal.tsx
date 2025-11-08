import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Briefcase } from "lucide-react";

const departmentPositionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type DepartmentPositionForm = z.infer<typeof departmentPositionSchema>;

interface DepartmentPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DepartmentPositionForm) => Promise<void>;
  isPending: boolean;
  type: "department" | "position";
  item?: {
    id: number;
    name: string;
    description?: string | null;
  } | null;
}

export function DepartmentPositionModal({
  isOpen,
  onClose,
  onSave,
  isPending,
  type,
  item,
}: DepartmentPositionModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DepartmentPositionForm>({
    resolver: zodResolver(departmentPositionSchema),
    defaultValues: item
      ? {
          name: item.name,
          description: item.description || "",
        }
      : undefined,
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: DepartmentPositionForm) => {
    await onSave(data);
    handleClose();
  };

  const title = item
    ? `Edit ${type === "department" ? "Department" : "Position"}`
    : `Create ${type === "department" ? "Department" : "Position"}`;

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
                        <div className="bg-cinematic-emerald-500/20 p-2 rounded-lg">
                          <Briefcase className="h-6 w-6 text-cinematic-emerald-400" />
                        </div>
                        <Dialog.Title className="text-xl font-bold text-gray-100">
                          {title}
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
                          {type === "department" ? "Department" : "Position"} Name
                        </label>
                        <input
                          id="name"
                          type="text"
                          {...register("name")}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-emerald-500 focus:border-transparent transition-all"
                          placeholder={
                            type === "department"
                              ? "e.g., Lighting, Sound, Costumes"
                              : "e.g., Gaffer, Sound Mixer"
                          }
                        />
                        {errors.name && (
                          <p className="mt-2 text-sm text-red-400">{errors.name.message}</p>
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
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-emerald-500 focus:border-transparent transition-all resize-none"
                          placeholder="Brief description..."
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
                      className="flex-1 bg-gradient-to-r from-cinematic-emerald-500 to-cinematic-emerald-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-emerald-600 hover:to-cinematic-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isPending ? "Saving..." : item ? "Update" : "Create"}
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
