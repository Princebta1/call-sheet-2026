import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { X, Send, Loader2, UserCheck, Users, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";

interface SendAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  showId?: number;
  showTitle?: string;
}

interface FormData {
  subject: string;
  content: string;
  type: "production_update" | "call_sheet_update" | "schedule_change" | "general";
  priority: "low" | "normal" | "high" | "urgent";
  sendEmailNotification: boolean;
}

export function SendAnnouncementModal({
  isOpen,
  onClose,
  showId,
  showTitle,
}: SendAnnouncementModalProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      type: "general",
      priority: "normal",
      sendEmailNotification: true,
    },
  });

  const priority = watch("priority");

  // Fetch users
  const usersQuery = useQuery(
    trpc.getCompanyUsers.queryOptions({ token: token || "" })
  );

  // Fetch recipient groups
  const groupsQuery = useQuery(
    trpc.getRecipientGroups.queryOptions({ token: token || "" })
  );

  const users = usersQuery.data?.users || [];
  const groups = groupsQuery.data || [];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        subject: "",
        content: "",
        type: "general",
        priority: "normal",
        sendEmailNotification: true,
      });
      setSelectedUserIds([]);
      setSelectedGroupIds([]);
    }
  }, [isOpen, reset]);

  const createMutation = useMutation(
    trpc.createAnnouncement.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAnnouncements.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getAnnouncementStats.queryKey(),
        });
        toast.success("Announcement sent successfully!");
        handleClose();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send announcement");
      },
    })
  );

  const handleClose = () => {
    if (!createMutation.isPending) {
      reset();
      setSelectedUserIds([]);
      setSelectedGroupIds([]);
      onClose();
    }
  };

  const onSubmit = (data: FormData) => {
    if (selectedUserIds.length === 0 && selectedGroupIds.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    createMutation.mutate({
      token: token || "",
      showId,
      subject: data.subject,
      content: data.content,
      type: data.type,
      priority: data.priority,
      recipientUserIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      recipientGroupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
      sendEmailNotification: data.sendEmailNotification,
    });
  };

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleGroup = (groupId: number) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUserIds(users.map((u) => u.id));
  };

  const deselectAllUsers = () => {
    setSelectedUserIds([]);
  };

  const selectAllGroups = () => {
    setSelectedGroupIds(groups.map((g) => g.id));
  };

  const deselectAllGroups = () => {
    setSelectedGroupIds([]);
  };

  const totalRecipients = selectedUserIds.length + selectedGroupIds.length;

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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/95 border border-gray-800 p-6 shadow-2xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
                      <Send className="h-6 w-6 text-cinematic-blue-400" />
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-bold text-white">
                        Send Announcement
                      </Dialog.Title>
                      {showTitle && (
                        <p className="text-sm text-gray-400">{showTitle}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={createMutation.isPending}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Type and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Type
                      </label>
                      <select
                        {...register("type")}
                        disabled={createMutation.isPending}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                      >
                        <option value="general">General</option>
                        <option value="production_update">Production Update</option>
                        <option value="call_sheet_update">Call Sheet Update</option>
                        <option value="schedule_change">Schedule Change</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Priority
                      </label>
                      <select
                        {...register("priority")}
                        disabled={createMutation.isPending}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  {priority === "urgent" && (
                    <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-400">
                        <p className="font-medium">Urgent Priority Selected</p>
                        <p className="text-red-300 mt-1">
                          This announcement will be marked as urgent and recipients will be notified immediately.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      {...register("subject", { required: "Subject is required" })}
                      disabled={createMutation.isPending}
                      placeholder="e.g., Schedule Change for Tomorrow's Shoot"
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cinematic-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                    />
                    {errors.subject && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors.subject.message}
                      </p>
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message *
                    </label>
                    <textarea
                      {...register("content", { required: "Message is required" })}
                      disabled={createMutation.isPending}
                      placeholder="Enter your announcement message..."
                      rows={6}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cinematic-blue-500 focus:border-transparent transition-all disabled:opacity-50 resize-none"
                    />
                    {errors.content && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors.content.message}
                      </p>
                    )}
                  </div>

                  {/* Recipients */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Recipients ({totalRecipients} selected)
                    </label>

                    <div className="space-y-4">
                      {/* Recipient Groups */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">
                            Recipient Groups ({selectedGroupIds.length})
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={selectAllGroups}
                              disabled={createMutation.isPending || groups.length === 0}
                              className="text-xs px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={deselectAllGroups}
                              disabled={createMutation.isPending}
                              className="text-xs px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        <div className="max-h-40 overflow-y-auto bg-gray-800/50 border border-gray-700 rounded-lg">
                          {groupsQuery.isLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                          ) : groups.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                              No recipient groups found
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-700">
                              {groups.map((group) => (
                                <label
                                  key={group.id}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedGroupIds.includes(group.id)}
                                    onChange={() => toggleGroup(group.id)}
                                    disabled={createMutation.isPending}
                                    className="w-4 h-4 rounded border-gray-600 text-cinematic-blue-500 focus:ring-cinematic-blue-500 focus:ring-offset-gray-900 disabled:opacity-50"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm font-medium text-white truncate">
                                        {group.name}
                                      </span>
                                    </div>
                                    {group.description && (
                                      <p className="text-xs text-gray-400 truncate">
                                        {group.description}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                      {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                  {selectedGroupIds.includes(group.id) && (
                                    <UserCheck className="h-4 w-4 text-cinematic-blue-400 flex-shrink-0" />
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Individual Users */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">
                            Individual Users ({selectedUserIds.length})
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={selectAllUsers}
                              disabled={createMutation.isPending}
                              className="text-xs px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={deselectAllUsers}
                              disabled={createMutation.isPending}
                              className="text-xs px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto bg-gray-800/50 border border-gray-700 rounded-lg">
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
                                    disabled={createMutation.isPending}
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
                    </div>
                  </div>

                  {/* Email Notification Toggle */}
                  <div className="flex items-center gap-3 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <input
                      type="checkbox"
                      {...register("sendEmailNotification")}
                      disabled={createMutation.isPending}
                      className="w-4 h-4 rounded border-gray-600 text-cinematic-blue-500 focus:ring-cinematic-blue-500 focus:ring-offset-gray-900 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-white cursor-pointer">
                        Send email notifications
                      </label>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Recipients will receive an email notification (if enabled in their preferences)
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={createMutation.isPending}
                      className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending || totalRecipients === 0}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cinematic-blue-500 to-cinematic-blue-600 text-white rounded-lg hover:from-cinematic-blue-600 hover:to-cinematic-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Announcement
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
