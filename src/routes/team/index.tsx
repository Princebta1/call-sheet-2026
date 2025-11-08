import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { DashboardLayout } from "~/components/DashboardLayout";
import { TeamMemberCard } from "~/components/TeamMemberCard";
import { InviteMemberModal } from "~/components/InviteMemberModal";
import { BulkInviteMemberModal } from "~/components/BulkInviteMemberModal";
import { EditMemberRoleModal } from "~/components/EditMemberRoleModal";
import { EditUserProfileModal } from "~/components/EditUserProfileModal";
import { SendTemporaryPasswordModal } from "~/components/SendTemporaryPasswordModal";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { usePermissions } from "~/hooks/usePermissions";
import { Users, UserPlus, AlertCircle, Shield, Clock, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";

export const Route = createFileRoute("/team/")({
  component: TeamPage,
});

function TeamPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const permissions = usePermissions();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isBulkInviteModalOpen, setIsBulkInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<{
    id: number;
    name: string;
    email: string;
    role: string;
    roleId: number | null;
  } | null>(null);
  const [editingUserProfile, setEditingUserProfile] = useState<{
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    statusMessage?: string | null;
    role: string;
  } | null>(null);
  const [sendingPasswordTo, setSendingPasswordTo] = useState<{
    id: number;
    name: string;
    email: string;
  } | null>(null);

  // Check if current user can manage team
  const canManage = permissions.canManageTeam();

  // Fetch company users
  const usersQuery = useQuery(
    trpc.getCompanyUsers.queryOptions({
      token: token || "",
    })
  );

  // Invite user mutation
  const inviteUserMutation = useMutation(
    trpc.inviteUser.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("Team member invited successfully");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  // Bulk invite users mutation
  const inviteBulkUsersMutation = useMutation(
    trpc.inviteBulkUsers.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("Bulk invitation completed");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  // Update user role mutation
  const updateRoleMutation = useMutation(
    trpc.updateUserRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("Role updated successfully");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  // Update user status mutation
  const updateStatusMutation = useMutation(
    trpc.updateUserStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("Status updated successfully");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  // Remove user mutation
  const removeUserMutation = useMutation(
    trpc.removeUser.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("User removed from team");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  // Update user profile mutation (for editing another user's profile)
  const updateUserProfileMutation = useMutation(
    trpc.updateUserProfile.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("User profile updated successfully");
        setEditingUserProfile(null);
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  // Send temporary reset password mutation
  const sendTempPasswordMutation = useMutation(
    trpc.sendTemporaryResetPassword.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        // Success is handled in the modal
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const handleInvite = async (data: {
    name: string;
    email: string;
    phone?: string;
    roleId: number;
    approveImmediately: boolean;
  }) => {
    const result = await inviteUserMutation.mutateAsync({
      token: token || "",
      ...data,
    });
    return { temporaryPassword: result.temporaryPassword };
  };

  const handleBulkInvite = async (data: {
    users: Array<{
      name: string;
      email: string;
      phone?: string;
      roleId: number;
    }>;
    approveImmediately: boolean;
  }) => {
    const result = await inviteBulkUsersMutation.mutateAsync({
      token: token || "",
      ...data,
    });
    return result;
  };

  const handleEditRole = (userId: number) => {
    const member = usersQuery.data?.users.find((u) => u.id === userId);
    if (member) {
      setEditingMember({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        roleId: member.roleId,
      });
    }
  };

  const handleUpdateRole = async (userId: number, roleId: number) => {
    await updateRoleMutation.mutateAsync({
      token: token || "",
      userId,
      roleId,
    });
  };

  const handleToggleStatus = async (userId: number, isActive: boolean) => {
    await updateStatusMutation.mutateAsync({
      token: token || "",
      userId,
      isActive,
    });
  };

  const handleToggleApproval = async (userId: number, approved: boolean) => {
    await updateStatusMutation.mutateAsync({
      token: token || "",
      userId,
      approvedByAdmin: approved,
    });
  };

  const handleRemove = async (userId: number) => {
    if (window.confirm("Are you sure you want to remove this user from the team?")) {
      await removeUserMutation.mutateAsync({
        token: token || "",
        userId,
      });
    }
  };

  const handleEditProfile = (userId: number) => {
    const member = usersQuery.data?.users.find((u) => u.id === userId);
    if (member) {
      setEditingUserProfile({
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        statusMessage: member.statusMessage,
        role: member.role,
      });
    }
  };

  const handleUpdateUserProfile = async (
    userId: number,
    data: { name: string; email: string; phone?: string; statusMessage?: string }
  ) => {
    await updateUserProfileMutation.mutateAsync({
      token: token || "",
      ...data,
    });
  };

  const handleSendTempPassword = (userId: number) => {
    const member = usersQuery.data?.users.find((u) => u.id === userId);
    if (member) {
      setSendingPasswordTo({
        id: member.id,
        name: member.name,
        email: member.email,
      });
    }
  };

  const handleSendTempPasswordConfirm = async (userId: number) => {
    const result = await sendTempPasswordMutation.mutateAsync({
      token: token || "",
      userId,
    });
    return { temporaryPassword: result.temporaryPassword };
  };

  // Calculate statistics
  const stats = usersQuery.data
    ? {
        total: usersQuery.data.users.length,
        active: usersQuery.data.users.filter((u) => u.isActive).length,
        pending: usersQuery.data.users.filter((u) => !u.approvedByAdmin).length,
        admins: usersQuery.data.users.filter((u) => u.role === "Admin" || u.role === "Developer").length,
      }
    : null;

  return (
    <ProtectedRoute
      requirePermission={(p) => p.canViewTeamPage()}
      accessDeniedMessage="Only administrators can access the team management page."
    >
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-cinematic-emerald-500/20 p-3 rounded-xl">
                    <Users className="h-8 w-8 text-cinematic-emerald-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Team Management</h1>
                    <p className="text-gray-400 mt-1">
                      Manage your production crew, assign roles, and control access
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsBulkInviteModalOpen(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-800 border border-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-all"
                    >
                      <Users className="h-5 w-5" />
                      Bulk Invite
                    </button>
                    <button
                      onClick={() => setIsInviteModalOpen(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all shadow-lg shadow-cinematic-gold-500/20"
                    >
                      <UserPlus className="h-5 w-5" />
                      Invite Member
                    </button>
                  </div>
                )}
              </div>

              {/* Statistics */}
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-cinematic-blue-500/20 p-2 rounded-lg">
                        <Users className="h-5 w-5 text-cinematic-blue-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                        <div className="text-sm text-gray-400">Total Members</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500/20 p-2 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.active}</div>
                        <div className="text-sm text-gray-400">Active Users</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-500/20 p-2 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.pending}</div>
                        <div className="text-sm text-gray-400">Pending Approval</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-cinematic-gold-500/20 p-2 rounded-lg">
                        <Shield className="h-5 w-5 text-cinematic-gold-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.admins}</div>
                        <div className="text-sm text-gray-400">Administrators</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            {usersQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinematic-gold-500"></div>
              </div>
            ) : usersQuery.error ? (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-3">
                  <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-400 mb-1">Error Loading Team</h3>
                    <p className="text-sm text-red-300">{getUserFriendlyError(usersQuery.error).message}</p>
                  </div>
                </div>
                {getUserFriendlyError(usersQuery.error).recoverySuggestions && (
                  <div className="ml-10">
                    <p className="text-xs font-medium text-red-300 mb-2">
                      {getUserFriendlyError(usersQuery.error).recoveryTitle}
                    </p>
                    <ul className="space-y-1">
                      {getUserFriendlyError(usersQuery.error).recoverySuggestions!.map((suggestion, index) => (
                        <li key={index} className="text-xs text-red-300 flex items-start gap-2">
                          <span className="text-red-400 mt-0.5">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : usersQuery.data?.users.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-800 rounded-2xl mb-6">
                  <Users className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Team Members</h3>
                <p className="text-gray-500 mb-6">
                  Get started by inviting your first team member
                </p>
                {canManage && (
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all"
                  >
                    <UserPlus className="h-5 w-5" />
                    Invite Member
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {usersQuery.data?.users.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    user={member}
                    currentUserId={user?.id || 0}
                    canManage={canManage}
                    onEditRole={handleEditRole}
                    onEditProfile={handleEditProfile}
                    onSendTempPassword={handleSendTempPassword}
                    onToggleStatus={handleToggleStatus}
                    onToggleApproval={handleToggleApproval}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <InviteMemberModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onInvite={handleInvite}
          isPending={inviteUserMutation.isPending}
        />

        <BulkInviteMemberModal
          isOpen={isBulkInviteModalOpen}
          onClose={() => setIsBulkInviteModalOpen(false)}
          onInvite={handleBulkInvite}
          isPending={inviteBulkUsersMutation.isPending}
        />

        <EditMemberRoleModal
          isOpen={editingMember !== null}
          onClose={() => setEditingMember(null)}
          member={editingMember}
          onUpdate={handleUpdateRole}
          isPending={updateRoleMutation.isPending}
        />

        <EditUserProfileModal
          isOpen={editingUserProfile !== null}
          onClose={() => setEditingUserProfile(null)}
          user={editingUserProfile}
          onUpdate={handleUpdateUserProfile}
          isPending={updateUserProfileMutation.isPending}
        />

        <SendTemporaryPasswordModal
          isOpen={sendingPasswordTo !== null}
          onClose={() => setSendingPasswordTo(null)}
          user={sendingPasswordTo}
          onSend={handleSendTempPasswordConfirm}
          isPending={sendTempPasswordMutation.isPending}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
