import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, UserPlus, Copy, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";

const inviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  roleId: z.number({ required_error: "Role is required" }),
  approveImmediately: z.boolean().default(true),
});

type InviteForm = z.infer<typeof inviteSchema>;

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: InviteForm) => Promise<{ temporaryPassword: string }>;
  isPending: boolean;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  onInvite,
  isPending,
}: InviteMemberModalProps) {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const [inviteResult, setInviteResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      approveImmediately: true,
    },
  });

  const handleClose = () => {
    setInviteResult(null);
    setCopied(false);
    reset();
    onClose();
  };

  const onSubmit = async (data: InviteForm) => {
    try {
      const result = await onInvite(data);
      setInviteResult({
        email: data.email,
        password: result.temporaryPassword,
      });
    } catch (error) {
      // Error is handled by the parent component
    }
  };

  const copyToClipboard = async () => {
    if (inviteResult) {
      await navigator.clipboard.writeText(inviteResult.password);
      setCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
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
                {inviteResult ? (
                  // Success State
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500/20 p-2 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-green-400" />
                        </div>
                        <Dialog.Title className="text-xl font-bold text-gray-100">
                          Member Invited!
                        </Dialog.Title>
                      </div>
                      <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-400">
                            <p className="font-medium mb-1">Important: Save this password</p>
                            <p>This temporary password will only be shown once. Share it securely with the new member.</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email
                        </label>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-300">
                          {inviteResult.email}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Temporary Password
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 font-mono">
                            {inviteResult.password}
                          </div>
                          <button
                            onClick={copyToClipboard}
                            className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                          >
                            {copied ? (
                              <CheckCircle className="h-5 w-5 text-green-400" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

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
                            <UserPlus className="h-6 w-6 text-cinematic-gold-400" />
                          </div>
                          <Dialog.Title className="text-xl font-bold text-gray-100">
                            Invite Team Member
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
                            Full Name
                          </label>
                          <input
                            id="name"
                            type="text"
                            {...register("name")}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                            placeholder="John Doe"
                          />
                          {errors.name && (
                            <p className="mt-2 text-sm text-red-400">{errors.name.message}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                            Email Address
                          </label>
                          <input
                            id="email"
                            type="email"
                            {...register("email")}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                            placeholder="john@example.com"
                          />
                          {errors.email && (
                            <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                            Phone Number (Optional)
                          </label>
                          <input
                            id="phone"
                            type="tel"
                            {...register("phone")}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>

                        <div>
                          <label htmlFor="roleId" className="block text-sm font-medium text-gray-300 mb-2">
                            Role
                          </label>
                          <select
                            id="roleId"
                            {...register("roleId", { valueAsNumber: true })}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                          >
                            <option value="">Select a role</option>
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

                        <div className="flex items-center gap-3">
                          <input
                            id="approveImmediately"
                            type="checkbox"
                            {...register("approveImmediately")}
                            className="w-4 h-4 text-cinematic-gold-500 bg-gray-800 border-gray-700 rounded focus:ring-cinematic-gold-500 focus:ring-2"
                          />
                          <label htmlFor="approveImmediately" className="text-sm text-gray-300">
                            Approve and activate immediately
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
                            <UserPlus className="h-5 w-5" />
                            Invite Member
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
