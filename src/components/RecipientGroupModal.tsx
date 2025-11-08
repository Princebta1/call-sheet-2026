import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { X, Users, Loader2, UserCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";

interface RecipientGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit?: {
    id: number;
    name: string;
    description: string | null;
    members: Array<{ id: number; name: string; email: string; role: string }>;
  } | null;
}

interface FormData {
  name: string;
  description: string;
}

export function RecipientGroupModal({
  isOpen,
  onClose,
  groupToEdit,
}: RecipientGroupModalProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>();

  // Fetch all company users
  const usersQuery = useQuery(
    trpc.getCompanyUsers.queryOptions({ token: token || "" })
  );

  const users = usersQuery.data?.users || [];

  // Initialize form when editing
  useEffect(() => {
    if (isOpen && groupToEdit) {
      reset({
        name: groupToEdit.name,
        description: groupToEdit.description || "",
      });
      setSelectedUserIds(groupToEdit.members.map((m) => m.id));
    } else if (isOpen) {
      reset({ name: "", description: "" });
      setSelectedUserIds([]);
    }
  }, [isOpen, groupToEdit, reset]);

  const createMutation = useMutation(
    trpc.createRecipientGroup.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getRecipientGroups.queryKey(),
        });
        toast.success("Recipient group created successfully!");
        handleClose();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create recipient group");
      },
    })
  );

  const updateMutation = useMutation(
    trpc.updateRecipientGroup.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getRecipientGroups.queryKey(),
        });
        toast.success("Recipient group updated successfully!");
        handleClose();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update recipient group");
      },
    })
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleClose = () => {
    if (!isPending) {
      reset();
      setSelectedUserIds([]);
      onClose();
    }
  };

  const onSubmit = (data: FormData) => {
    if (groupToEdit) {
      updateMutation.mutate({
        token: token || "",
        groupId: groupToEdit.id,
        name: data.name,
        description: data.description || undefined,
        userIds: selectedUserIds,
      });
    } else {
      createMutation.mutate({
        token: token || "",
        name: data.name,
        description: data.description || undefined,
        userIds: selectedUserIds,
      });
    }
  };

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    setSelectedUserIds(users.map((u) => u.id));
  };

  const deselectAll = () => {
    setSelectedUserIds([]);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/95 border border-gray-800 p-6 shadow-2xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
                      <Users className="h-6 w-6 text-cinematic-blue-400" />
                    </div>
                    <Dialog.Title className="text-xl font-bold text-white">
                      {groupToEdit ? "Edit" : "Create"} Recipient Group
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={isPending}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Group Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Group Name *
                    </label>
                    <input
                      type="text"
                      {...register("name", { required: "Name is required" })}
                      disabled={isPending}
                      placeholder="e.g., Producers, Directors, Studio Executives"
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cinematic-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      {...register("description")}
                      disabled={isPending}
                      placeholder="Optional description for this group"
                      rows={2}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cinematic-blue-500 focus:border-transparent transition-all disabled:opacity-50 resize-none"
                    />
                  </div>

                  {/* Members Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-300">
                        Group Members ({selectedUserIds.length} selected)
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAll}
                          disabled={isPending}
                          className="text-xs px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={deselectAll}
                          disabled={isPending}
                          className="text-xs px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto bg-gray-800/50 border border-gray-700 rounded-lg">
                      {usersQuery.isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      ) : users.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          No users found
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-700">
                          {users.map((user) => (
                            <label
                              key={user.id}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedUserIds.includes(user.id)}
                                onChange={() => toggleUser(user.id)}
                                disabled={isPending}
                                className="w-4 h-4 rounded border-gray-600 text-cinematic-blue-500 focus:ring-cinematic-blue-500 focus:ring-offset-gray-900 disabled:opacity-50"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-white truncate">
                                    {user.name}
                                  </span>
                                  {user.status !== "Active" && (
                                    <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
                                      {user.status}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>{user.email}</span>
                                  <span>•</span>
                                  <span>{user.role}</span>
                                </div>
                              </div>
                              {selectedUserIds.includes(user.id) && (
                                <UserCheck className="h-4 w-4 text-cinematic-blue-400 flex-shrink-0" />
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info Message */}
                  <div className="p-4 bg-cinematic-blue-500/10 border border-cinematic-blue-500/30 rounded-lg">
                    <p className="text-cinematic-blue-400 text-xs">
                      When you generate a report and select this group, all
                      members will receive the report email.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isPending}
                      className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cinematic-blue-500 to-cinematic-blue-600 text-white rounded-lg hover:from-cinematic-blue-600 hover:to-cinematic-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {groupToEdit ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>{groupToEdit ? "Update Group" : "Create Group"}</>
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
