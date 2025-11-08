import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Edit2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";

const editRoleSchema = z.object({
  roleId: z.number({ required_error: "Role is required" }),
});

type EditRoleForm = z.infer<typeof editRoleSchema>;

interface EditMemberRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: number;
    name: string;
    email: string;
    role: string;
    roleId: number | null;
  } | null;
  onUpdate: (userId: number, roleId: number) => Promise<void>;
  isPending: boolean;
}

export function EditMemberRoleModal({
  isOpen,
  onClose,
  member,
  onUpdate,
  isPending,
}: EditMemberRoleModalProps) {
  const trpc = useTRPC();
  const { token } = useAuthStore();

  const rolesQuery = useQuery(
    trpc.getRoles.queryOptions({ token: token || "" })
  );

  const roles = rolesQuery.data || [];
  
  // Filter out deprecated system roles
  const allowedSystemRoles = ["Developer", "Admin", "Manager", "Viewer", "Actor", "Crew"];
  const filteredRoles = roles.filter((role: any) => {
    // If it's a system role, only include it if it's in the allowed list
    if (role.isSystemRole) {
      return allowedSystemRoles.includes(role.name);
    }
    // Always include custom roles
    return true;
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditRoleForm>({
    resolver: zodResolver(editRoleSchema),
    values: member ? { roleId: member.roleId || 0 } : undefined,
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: EditRoleForm) => {
    if (member) {
      await onUpdate(member.id, data.roleId);
      handleClose();
    }
  };

  if (!member) return null;

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
                        <div className="bg-cinematic-blue-500/20 p-2 rounded-lg">
                          <Edit2 className="h-6 w-6 text-cinematic-blue-400" />
                        </div>
                        <Dialog.Title className="text-xl font-bold text-gray-100">
                          Change Member Role
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
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Member</div>
                        <div className="text-gray-100 font-medium">{member.name}</div>
                        <div className="text-sm text-gray-400">{member.email}</div>
                      </div>

                      <div>
                        <label htmlFor="roleId" className="block text-sm font-medium text-gray-300 mb-2">
                          New Role
                        </label>
                        <select
                          id="roleId"
                          {...register("roleId", { valueAsNumber: true })}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-blue-500 focus:border-transparent transition-all"
                        >
                          {filteredRoles.map((role: any) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                              {role.isSystemRole ? " (System)" : " (Custom)"}
                              {role.description ? ` - ${role.description}` : ""}
                            </option>
                          ))}
                        </select>
                        {errors.roleId && (
                          <p className="mt-2 text-sm text-red-400">{errors.roleId.message}</p>
                        )}
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
                      className="flex-1 bg-gradient-to-r from-cinematic-blue-500 to-cinematic-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-cinematic-blue-600 hover:to-cinematic-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Edit2 className="h-5 w-5" />
                          Update Role
                        </>
                      )}
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
