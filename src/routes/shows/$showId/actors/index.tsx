import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { TeamMemberCard } from "~/components/TeamMemberCard";
import { InviteMemberModal } from "~/components/InviteMemberModal";
import { EditMemberRoleModal } from "~/components/EditMemberRoleModal";
import { EditActorProfileModal } from "~/components/EditActorProfileModal";
import { CharacterRoleModal } from "~/components/CharacterRoleModal";
import { AssignActorToCharacterModal } from "~/components/AssignActorToCharacterModal";
import { Users, UserPlus, AlertCircle, CheckCircle, Clock, Star, Theater, Plus, Edit2, Trash2, UserMinus } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/shows/$showId/actors/")({
  component: ProductionActorsPage,
});

function ProductionActorsPage() {
  const { showId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const permissions = usePermissions();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<{
    id: number;
    name: string;
    email: string;
    role: string;
  } | null>(null);
  const [editingActorProfile, setEditingActorProfile] = useState<{
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    role: string;
  } | null>(null);
  const [isCharacterRoleModalOpen, setIsCharacterRoleModalOpen] = useState(false);
  const [editingCharacterRole, setEditingCharacterRole] = useState<{
    id: number;
    name: string;
    description?: string | null;
    type: string;
  } | null>(null);
  const [assigningToCharacter, setAssigningToCharacter] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const canManage = permissions.canManageTeam();

  const usersQuery = useQuery(
    trpc.getCompanyUsers.queryOptions({
      token: token || "",
      showId: showId,
    })
  );

  const characterRolesQuery = useQuery(
    trpc.getCharacterRoles.queryOptions({
      token: token || "",
      showId: parseInt(showId),
    })
  );

  const inviteUserMutation = useMutation(
    trpc.inviteUser.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("Actor invited successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateRoleMutation = useMutation(
    trpc.updateUserRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("Role updated successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateActorProfileMutation = useMutation(
    trpc.updateActorProfile.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("Actor profile updated successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateStatusMutation = useMutation(
    trpc.updateUserStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("Status updated successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const removeUserMutation = useMutation(
    trpc.removeUser.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("Actor removed from team");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const createCharacterRoleMutation = useMutation(
    trpc.createCharacterRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCharacterRoles.queryKey() });
        toast.success("Character role created successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateCharacterRoleMutation = useMutation(
    trpc.updateCharacterRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCharacterRoles.queryKey() });
        toast.success("Character role updated successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteCharacterRoleMutation = useMutation(
    trpc.deleteCharacterRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCharacterRoles.queryKey() });
        toast.success("Character role deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const assignActorToCharacterMutation = useMutation(
    trpc.assignActorToCharacter.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCharacterRoles.queryKey() });
        toast.success("Actor assigned to character successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const removeActorFromCharacterMutation = useMutation(
    trpc.removeActorFromCharacter.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCharacterRoles.queryKey() });
        toast.success("Actor removed from character");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const actors = usersQuery.data?.users.filter((u) => u.role === "Actor") || [];
  const characterRoles = characterRolesQuery.data?.characterRoles || [];

  const handleInvite = async (data: {
    name: string;
    email: string;
    phone?: string;
    role: "Admin" | "1st AD" | "2nd AD" | "Director" | "Crew" | "Actor";
    approveImmediately: boolean;
  }) => {
    const result = await inviteUserMutation.mutateAsync({
      token: token || "",
      ...data,
    });
    return { temporaryPassword: result.temporaryPassword };
  };

  const handleEditRole = (userId: number) => {
    const member = actors.find((u) => u.id === userId);
    if (member) {
      setEditingMember({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
      });
    }
  };

  const handleEditProfile = (userId: number) => {
    const member = actors.find((u) => u.id === userId);
    if (member) {
      setEditingActorProfile({
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
      });
    }
  };

  const handleUpdateRole = async (userId: number, role: string) => {
    await updateRoleMutation.mutateAsync({
      token: token || "",
      userId,
      role: role as any,
    });
  };

  const handleUpdateProfile = async (userId: number, data: { name: string; email: string; phone?: string }) => {
    await updateActorProfileMutation.mutateAsync({
      token: token || "",
      userId,
      ...data,
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
    if (window.confirm("Are you sure you want to remove this actor from the team?")) {
      await removeUserMutation.mutateAsync({
        token: token || "",
        userId,
      });
    }
  };

  const handleCreateCharacterRole = async (data: { name: string; description?: string; type: string }) => {
    await createCharacterRoleMutation.mutateAsync({
      token: token || "",
      showId: parseInt(showId),
      ...data,
    });
  };

  const handleUpdateCharacterRole = async (data: { name: string; description?: string; type: string }) => {
    if (!editingCharacterRole) return;
    await updateCharacterRoleMutation.mutateAsync({
      token: token || "",
      characterRoleId: editingCharacterRole.id,
      ...data,
    });
  };

  const handleDeleteCharacterRole = async (characterRoleId: number) => {
    if (window.confirm("Are you sure you want to delete this character role? This will remove all actor assignments.")) {
      await deleteCharacterRoleMutation.mutateAsync({
        token: token || "",
        characterRoleId,
      });
    }
  };

  const handleAssignActorToCharacter = async (data: { userId: number; notes?: string }) => {
    if (!assigningToCharacter) return;
    await assignActorToCharacterMutation.mutateAsync({
      token: token || "",
      userId: data.userId,
      characterRoleId: assigningToCharacter.id,
      showId: parseInt(showId),
      notes: data.notes,
    });
  };

  const handleRemoveActorFromCharacter = async (actorCharacterId: number) => {
    if (window.confirm("Are you sure you want to remove this actor from this character role?")) {
      await removeActorFromCharacterMutation.mutateAsync({
        token: token || "",
        actorCharacterId,
      });
    }
  };

  const getCharacterTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Main":
        return "bg-cinematic-gold-500/20 text-cinematic-gold-400 border-cinematic-gold-500/30";
      case "Supporting":
        return "bg-cinematic-blue-500/20 text-cinematic-blue-400 border-cinematic-blue-500/30";
      case "Minor":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "Extra":
        return "bg-gray-600/20 text-gray-500 border-gray-600/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const stats = {
    total: actors.length,
    active: actors.filter((u) => u.isActive).length,
    pending: actors.filter((u) => !u.approvedByAdmin).length,
    approved: actors.filter((u) => u.approvedByAdmin && u.isActive).length,
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-cinematic-gold-500/20 p-3 rounded-xl">
                <Star className="h-8 w-8 text-cinematic-gold-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Actors</h1>
                <p className="text-gray-400 mt-1">
                  Manage cast members for this production
                </p>
              </div>
            </div>
            {canManage && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all shadow-lg shadow-cinematic-gold-500/20"
              >
                <UserPlus className="h-5 w-5" />
                Invite Actor
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="bg-cinematic-gold-500/20 p-2 rounded-lg">
                  <Star className="h-5 w-5 text-cinematic-gold-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-gray-400">Total Actors</div>
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
                  <div className="text-sm text-gray-400">Active</div>
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
                <div className="bg-cinematic-blue-500/20 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-cinematic-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.approved}</div>
                  <div className="text-sm text-gray-400">Approved & Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Character Roles Section */}
        {canManage && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Theater className="h-6 w-6 text-cinematic-gold-400" />
                <h2 className="text-2xl font-bold text-white">Character Roles</h2>
              </div>
              <button
                onClick={() => {
                  setEditingCharacterRole(null);
                  setIsCharacterRoleModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-cinematic-gold-500/20 text-cinematic-gold-400 border border-cinematic-gold-500/30 rounded-lg hover:bg-cinematic-gold-500/30 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Character
              </button>
            </div>

            {characterRolesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cinematic-gold-500"></div>
              </div>
            ) : characterRoles.length === 0 ? (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
                <Theater className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No character roles defined yet</p>
                <p className="text-sm text-gray-500 mt-1">Create character roles to assign actors</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characterRoles.map((role) => (
                  <div
                    key={role.id}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-100">{role.name}</h3>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md border ${getCharacterTypeBadgeColor(role.type)}`}>
                            {role.type}
                          </span>
                        </div>
                        {role.description && (
                          <p className="text-sm text-gray-400 mb-3">{role.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCharacterRole(role);
                            setIsCharacterRoleModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCharacterRole(role.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-300">Assigned Actors</span>
                        <button
                          onClick={() => setAssigningToCharacter({ id: role.id, name: role.name })}
                          className="text-xs text-cinematic-gold-400 hover:text-cinematic-gold-300 transition-colors"
                        >
                          + Assign
                        </button>
                      </div>
                      {role.actors.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No actors assigned</p>
                      ) : (
                        <div className="space-y-2">
                          {role.actors.map((actor) => (
                            <div
                              key={actor.id}
                              className="flex items-center justify-between bg-gray-900/50 rounded-lg p-2"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-cinematic-blue-500 to-cinematic-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-bold text-white">
                                    {actor.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-200">{actor.name}</p>
                                  {actor.notes && (
                                    <p className="text-xs text-gray-500">{actor.notes}</p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveActorFromCharacter(actor.id)}
                                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {usersQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinematic-gold-500"></div>
          </div>
        ) : usersQuery.error ? (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-1">Error Loading Actors</h3>
              <p className="text-sm text-red-300">{usersQuery.error.message}</p>
            </div>
          </div>
        ) : actors.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-800 rounded-2xl mb-6">
              <Star className="h-10 w-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Actors Yet</h3>
            <p className="text-gray-500 mb-6">
              Get started by inviting your first actor to the production
            </p>
            {canManage && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all"
              >
                <UserPlus className="h-5 w-5" />
                Invite Actor
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {actors.map((actor) => (
              <TeamMemberCard
                key={actor.id}
                user={actor}
                currentUserId={user?.id || 0}
                canManage={canManage}
                onEditRole={handleEditRole}
                onEditProfile={handleEditProfile}
                onToggleStatus={handleToggleStatus}
                onToggleApproval={handleToggleApproval}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInvite}
        isPending={inviteUserMutation.isPending}
      />

      <EditMemberRoleModal
        isOpen={editingMember !== null}
        onClose={() => setEditingMember(null)}
        member={editingMember}
        onUpdate={handleUpdateRole}
        isPending={updateRoleMutation.isPending}
      />

      <EditActorProfileModal
        isOpen={editingActorProfile !== null}
        onClose={() => setEditingActorProfile(null)}
        actor={editingActorProfile}
        onUpdate={handleUpdateProfile}
        isPending={updateActorProfileMutation.isPending}
      />

      <CharacterRoleModal
        isOpen={isCharacterRoleModalOpen}
        onClose={() => {
          setIsCharacterRoleModalOpen(false);
          setEditingCharacterRole(null);
        }}
        onSave={editingCharacterRole ? handleUpdateCharacterRole : handleCreateCharacterRole}
        isPending={createCharacterRoleMutation.isPending || updateCharacterRoleMutation.isPending}
        characterRole={editingCharacterRole}
      />

      <AssignActorToCharacterModal
        isOpen={assigningToCharacter !== null}
        onClose={() => setAssigningToCharacter(null)}
        onAssign={handleAssignActorToCharacter}
        isPending={assignActorToCharacterMutation.isPending}
        characterRole={assigningToCharacter}
        availableActors={actors.map((a) => ({ id: a.id, name: a.name, email: a.email }))}
      />
    </div>
  );
}
