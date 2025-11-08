import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, UserPlus, Copy, CheckCircle, AlertCircle, Plus, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";

const bulkInviteSchema = z.object({
  users: z.array(
    z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email address"),
      phone: z.string().optional(),
      roleId: z.number({ required_error: "Role is required" }),
    })
  ).min(1, "At least one user is required"),
  approveImmediately: z.boolean().default(true),
});

type BulkInviteForm = z.infer<typeof bulkInviteSchema>;

interface BulkInviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: BulkInviteForm) => Promise<{
    successful: Array<{
      user: { id: number; name: string; email: string; role: string };
      temporaryPassword: string;
    }>;
    failed: Array<{ email: string; error: string }>;
    totalProcessed: number;
    successCount: number;
    failureCount: number;
  }>;
  isPending: boolean;
}

export function BulkInviteMemberModal({
  isOpen,
  onClose,
  onInvite,
  isPending,
}: BulkInviteMemberModalProps) {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const [inviteResult, setInviteResult] = useState<{
    successful: Array<{
      user: { id: number; name: string; email: string; role: string };
      temporaryPassword: string;
    }>;
    failed: Array<{ email: string; error: string }>;
  } | null>(null);
  const [copiedPasswords, setCopiedPasswords] = useState<Set<string>>(new Set());

  const rolesQuery = useQuery(
    trpc.getRoles.queryOptions({ token: token || "" })
  );

  const roles = rolesQuery.data || [];
  
  // Filter out deprecated system roles
  const allowedSystemRoles = ["Developer", "Admin", "Manager", "Viewer", "Actor", "Crew"];
  const filteredRoles = roles.filter((role: any) => {
    if (role.isSystemRole) {
      return allowedSystemRoles.includes(role.name);
    }
    return true;
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<BulkInviteForm>({
    resolver: zodResolver(bulkInviteSchema),
    defaultValues: {
      users: [{ name: "", email: "", phone: "", roleId: undefined }],
      approveImmediately: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "users",
  });

  const handleClose = () => {
    setInviteResult(null);
    setCopiedPasswords(new Set());
    reset();
    onClose();
  };

  const onSubmit = async (data: BulkInviteForm) => {
    try {
      const result = await onInvite(data);
      setInviteResult(result);
    } catch (error) {
      // Error is handled by the parent component
    }
  };

  const copyToClipboard = async (password: string, email: string) => {
    await navigator.clipboard.writeText(password);
    setCopiedPasswords(new Set([...copiedPasswords, email]));
    toast.success("Password copied to clipboard");
    setTimeout(() => {
      setCopiedPasswords((prev) => {
        const newSet = new Set(prev);
        newSet.delete(email);
        return newSet;
      });
    }, 2000);
  };

  const copyAllCredentials = async () => {
    if (!inviteResult) return;
    
    const credentialsText = inviteResult.successful
      .map(
        (item) =>
          `Name: ${item.user.name}\nEmail: ${item.user.email}\nPassword: ${item.temporaryPassword}\nRole: ${item.user.role}\n`
      )
      .join("\n");
    
    await navigator.clipboard.writeText(credentialsText);
    toast.success("All credentials copied to clipboard");
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
              <Dialog.Panel className="w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {inviteResult ? (
                  // Success State
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500/20 p-2 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-green-400" />
                        </div>
                        <div>
                          <Dialog.Title className="text-xl font-bold text-gray-100">
                            Bulk Invitation Complete
                          </Dialog.Title>
                          <p className="text-sm text-gray-400 mt-1">
                            {inviteResult.successful.length} successful, {inviteResult.failed.length} failed
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {inviteResult.successful.length > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                          <div className="flex items-start gap-2 mb-3">
                            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-400 flex-1">
                              <p className="font-medium mb-1">Important: Save these passwords</p>
                              <p>These temporary passwords will only be shown once. Share them securely with the new members.</p>
                            </div>
                            <button
                              onClick={copyAllCredentials}
                              className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                            >
                              <Copy className="h-3 w-3" />
                              Copy All
                            </button>
                          </div>
                        </div>
                      )}

                      {inviteResult.successful.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Successfully Invited ({inviteResult.successful.length})
                          </h3>
                          <div className="space-y-2">
                            {inviteResult.successful.map((item) => (
                              <div
                                key={item.user.email}
                                className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-100 truncate">
                                      {item.user.name}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">{item.user.email}</p>
                                    <p className="text-xs text-gray-500 mt-1">{item.user.role}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <p className="text-xs text-gray-400 mb-1">Password</p>
                                      <code className="text-sm text-gray-100 font-mono">
                                        {item.temporaryPassword}
                                      </code>
                                    </div>
                                    <button
                                      onClick={() => copyToClipboard(item.temporaryPassword, item.user.email)}
                                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-400 hover:text-gray-300 transition-colors"
                                    >
                                      {copiedPasswords.has(item.user.email) ? (
                                        <CheckCircle className="h-4 w-4 text-green-400" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {inviteResult.failed.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Failed Invitations ({inviteResult.failed.length})
                          </h3>
                          <div className="space-y-2">
                            {inviteResult.failed.map((item) => (
                              <div
                                key={item.email}
                                className="bg-red-500/10 border border-red-500/30 rounded-lg p-3"
                              >
                                <p className="text-sm font-medium text-red-300">{item.email}</p>
                                <p className="text-xs text-red-400 mt-1">{item.error}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleClose}
                        className="w-full bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  // Form State
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-cinematic-gold-500/20 p-2 rounded-lg">
                            <Users className="h-6 w-6 text-cinematic-gold-400" />
                          </div>
                          <Dialog.Title className="text-xl font-bold text-gray-100">
                            Bulk Invite Team Members
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

                      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-300">
                                Member {index + 1}
                              </h4>
                              {fields.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  Full Name *
                                </label>
                                <input
                                  type="text"
                                  {...register(`users.${index}.name`)}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                                  placeholder="John Doe"
                                />
                                {errors.users?.[index]?.name && (
                                  <p className="mt-1 text-xs text-red-400">
                                    {errors.users[index]?.name?.message}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  Email *
                                </label>
                                <input
                                  type="email"
                                  {...register(`users.${index}.email`)}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                                  placeholder="john@example.com"
                                />
                                {errors.users?.[index]?.email && (
                                  <p className="mt-1 text-xs text-red-400">
                                    {errors.users[index]?.email?.message}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  Phone
                                </label>
                                <input
                                  type="tel"
                                  {...register(`users.${index}.phone`)}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                                  placeholder="+1 (555) 123-4567"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  Role *
                                </label>
                                <select
                                  {...register(`users.${index}.roleId`, { valueAsNumber: true })}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                                >
                                  <option value="">Select role</option>
                                  {filteredRoles.map((role: any) => (
                                    <option key={role.id} value={role.id}>
                                      {role.name}
                                    </option>
                                  ))}
                                </select>
                                {errors.users?.[index]?.roleId && (
                                  <p className="mt-1 text-xs text-red-400">
                                    {errors.users[index]?.roleId?.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {errors.users && typeof errors.users.message === 'string' && (
                          <p className="text-sm text-red-400">{errors.users.message}</p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            append({ name: "", email: "", phone: "", roleId: undefined as any })
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors text-sm font-medium"
                        >
                          <Plus className="h-4 w-4" />
                          Add Another Member
                        </button>

                        <div className="flex items-center gap-3">
                          <input
                            id="approveImmediately"
                            type="checkbox"
                            {...register("approveImmediately")}
                            className="w-4 h-4 text-cinematic-gold-500 bg-gray-800 border-gray-700 rounded focus:ring-cinematic-gold-500 focus:ring-2"
                          />
                          <label htmlFor="approveImmediately" className="text-sm text-gray-300">
                            Approve immediately
                          </label>
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
                        className="flex-1 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-950"></div>
                            Inviting...
                          </>
                        ) : (
                          <>
                            <Users className="h-5 w-5" />
                            Invite {fields.length} {fields.length === 1 ? "Member" : "Members"}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
