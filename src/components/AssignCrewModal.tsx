import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, UserPlus } from "lucide-react";

const assignCrewSchema = z.object({
  userId: z.number({ required_error: "Please select a crew member" }),
  departmentId: z.number({ required_error: "Please select a department" }),
  positionId: z.number({ required_error: "Please select a position" }),
  notes: z.string().optional(),
});

type AssignCrewForm = z.infer<typeof assignCrewSchema>;

interface AssignCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (data: AssignCrewForm) => Promise<void>;
  isPending: boolean;
  availableCrew: Array<{
    id: number;
    name: string;
    email: string;
  }>;
  departments: Array<{
    id: number;
    name: string;
    positions: Array<{
      id: number;
      name: string;
    }>;
  }>;
}

export function AssignCrewModal({
  isOpen,
  onClose,
  onAssign,
  isPending,
  availableCrew,
  departments,
}: AssignCrewModalProps) {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<AssignCrewForm>({
    resolver: zodResolver(assignCrewSchema),
  });

  const departmentId = watch("departmentId");

  const handleClose = () => {
    reset();
    setSelectedDepartmentId(null);
    onClose();
  };

  const onSubmit = async (data: AssignCrewForm) => {
    await onAssign(data);
    handleClose();
  };

  const selectedDepartment = departments.find((d) => d.id === Number(departmentId));

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
                          <UserPlus className="h-6 w-6 text-cinematic-emerald-400" />
                        </div>
                        <Dialog.Title className="text-xl font-bold text-gray-100">
                          Assign Crew Member
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
                        <label htmlFor="userId" className="block text-sm font-medium text-gray-300 mb-2">
                          Crew Member
                        </label>
                        <select
                          id="userId"
                          {...register("userId", { valueAsNumber: true })}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-emerald-500 focus:border-transparent transition-all"
                        >
                          <option value="">Choose a crew member...</option>
                          {availableCrew.map((crew) => (
                            <option key={crew.id} value={crew.id}>
                              {crew.name} ({crew.email})
                            </option>
                          ))}
                        </select>
                        {errors.userId && (
                          <p className="mt-2 text-sm text-red-400">{errors.userId.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="departmentId" className="block text-sm font-medium text-gray-300 mb-2">
                          Department
                        </label>
                        <select
                          id="departmentId"
                          {...register("departmentId", { valueAsNumber: true })}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-emerald-500 focus:border-transparent transition-all"
                        >
                          <option value="">Choose a department...</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                        {errors.departmentId && (
                          <p className="mt-2 text-sm text-red-400">{errors.departmentId.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="positionId" className="block text-sm font-medium text-gray-300 mb-2">
                          Position
                        </label>
                        <select
                          id="positionId"
                          {...register("positionId", { valueAsNumber: true })}
                          disabled={!selectedDepartment}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {selectedDepartment
                              ? "Choose a position..."
                              : "Select a department first"}
                          </option>
                          {selectedDepartment?.positions.map((pos) => (
                            <option key={pos.id} value={pos.id}>
                              {pos.name}
                            </option>
                          ))}
                        </select>
                        {errors.positionId && (
                          <p className="mt-2 text-sm text-red-400">{errors.positionId.message}</p>
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
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-emerald-500 focus:border-transparent transition-all resize-none"
                          placeholder="Any special notes about this assignment..."
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
                      {isPending ? "Assigning..." : "Assign"}
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
