import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { TeamMemberCard } from "~/components/TeamMemberCard";
import { InviteMemberModal } from "~/components/InviteMemberModal";
import { EditMemberRoleModal } from "~/components/EditMemberRoleModal";
import { DepartmentPositionModal } from "~/components/DepartmentPositionModal";
import { AssignCrewModal } from "~/components/AssignCrewModal";
import { usePermissions } from "~/hooks/usePermissions";
import { Users, UserPlus, AlertCircle, Shield, Clock, CheckCircle, Briefcase, Plus, Edit2, Trash2, UserMinus, Building2 } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/shows/$showId/crew/")({
  component: ProductionCrewPage,
});

function ProductionCrewPage() {
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
    roleId: number | null;
  } | null>(null);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [isAssignCrewModalOpen, setIsAssignCrewModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<{
    id: number;
    name: string;
    description?: string | null;
  } | null>(null);
  const [editingPosition, setEditingPosition] = useState<{
    id: number;
    departmentId: number;
    name: string;
    description?: string | null;
  } | null>(null);
  const [selectedDepartmentForPosition, setSelectedDepartmentForPosition] = useState<number | null>(null);

  const canManage = permissions.canManageTeam();

  const usersQuery = useQuery(
    trpc.getCompanyUsers.queryOptions({
      token: token || "",
      showId: showId,
    })
  );

  const departmentsQuery = useQuery(
    trpc.getDepartments.queryOptions({
      token: token || "",
    })
  );

  const crewAssignmentsQuery = useQuery(
    trpc.getCrewAssignments.queryOptions({
      token: token || "",
      showId: parseInt(showId),
    })
  );

  const inviteUserMutation = useMutation(
    trpc.inviteUser.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        toast.success("Crew member invited successfully");
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
        toast.success("User removed from team");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const createDepartmentMutation = useMutation(
    trpc.createDepartment.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getDepartments.queryKey() });
        toast.success("Department created successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateDepartmentMutation = useMutation(
    trpc.updateDepartment.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getDepartments.queryKey() });
        toast.success("Department updated successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteDepartmentMutation = useMutation(
    trpc.deleteDepartment.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getDepartments.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getCrewAssignments.queryKey() });
        toast.success("Department deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const createPositionMutation = useMutation(
    trpc.createPosition.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getDepartments.queryKey() });
        toast.success("Position created successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updatePositionMutation = useMutation(
    trpc.updatePosition.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getDepartments.queryKey() });
        toast.success("Position updated successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deletePositionMutation = useMutation(
    trpc.deletePosition.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getDepartments.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getCrewAssignments.queryKey() });
        toast.success("Position deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const assignCrewToPositionMutation = useMutation(
    trpc.assignCrewToPosition.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCrewAssignments.queryKey() });
        toast.success("Crew member assigned successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const removeCrewAssignmentMutation = useMutation(
    trpc.removeCrewAssignment.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCrewAssignments.queryKey() });
        toast.success("Crew assignment removed");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const crew = usersQuery.data?.users.filter((u) => u.role !== "Actor") || [];
  const departments = departmentsQuery.data?.departments || [];
  const crewAssignments = crewAssignmentsQuery.data?.assignments || [];

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

  const handleCreateDepartment = async (data: { name: string; description?: string }) => {
    await createDepartmentMutation.mutateAsync({
      token: token || "",
      ...data,
    });
  };

  const handleUpdateDepartment = async (data: { name: string; description?: string }) => {
    if (!editingDepartment) return;
    await updateDepartmentMutation.mutateAsync({
      token: token || "",
      departmentId: editingDepartment.id,
      ...data,
    });
  };

  const handleDeleteDepartment = async (departmentId: number) => {
    if (window.confirm("Are you sure you want to delete this department? This will remove all positions and crew assignments.")) {
      await deleteDepartmentMutation.mutateAsync({
        token: token || "",
        departmentId,
      });
    }
  };

  const handleCreatePosition = async (data: { name: string; description?: string }) => {
    if (!selectedDepartmentForPosition) return;
    await createPositionMutation.mutateAsync({
      token: token || "",
      departmentId: selectedDepartmentForPosition,
      ...data,
    });
  };

  const handleUpdatePosition = async (data: { name: string; description?: string }) => {
    if (!editingPosition) return;
    await updatePositionMutation.mutateAsync({
      token: token || "",
      positionId: editingPosition.id,
      ...data,
    });
  };

  const handleDeletePosition = async (positionId: number) => {
    if (window.confirm("Are you sure you want to delete this position? This will remove all crew assignments.")) {
      await deletePositionMutation.mutateAsync({
        token: token || "",
        positionId,
      });
    }
  };

  const handleAssignCrew = async (data: { userId: number; departmentId: number; positionId: number; notes?: string }) => {
    await assignCrewToPositionMutation.mutateAsync({
      token: token || "",
      showId: parseInt(showId),
      ...data,
    });
  };

  const handleRemoveCrewAssignment = async (assignmentId: number) => {
    if (window.confirm("Are you sure you want to remove this crew assignment?")) {
      await removeCrewAssignmentMutation.mutateAsync({
        token: token || "",
        assignmentId,
      });
    }
  };

  const stats = {
    total: crew.length,
    active: crew.filter((u) => u.isActive).length,
    pending: crew.filter((u) => !u.approvedByAdmin).length,
    admins: crew.filter((u) => u.role === "Admin" || u.role === "Developer").length,
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-cinematic-emerald-500/20 p-3 rounded-xl">
                <Users className="h-8 w-8 text-cinematic-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Crew</h1>
                <p className="text-gray-400 mt-1">
                  Manage production crew and assign roles
                </p>
              </div>
            </div>
            {canManage && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all shadow-lg shadow-cinematic-gold-500/20"
              >
                <UserPlus className="h-5 w-5" />
                Invite Member
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="bg-cinematic-blue-500/20 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-cinematic-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-gray-400">Total Crew</div>
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
        </div>

        {/* Departments & Positions Section */}
        {canManage && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-cinematic-emerald-400" />
                <h2 className="text-2xl font-bold text-white">Departments & Positions</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingDepartment(null);
                    setIsDepartmentModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-cinematic-emerald-500/20 text-cinematic-emerald-400 border border-cinematic-emerald-500/30 rounded-lg hover:bg-cinematic-emerald-500/30 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add Department
                </button>
                <button
                  onClick={() => setIsAssignCrewModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-cinematic-gold-500/20 text-cinematic-gold-400 border border-cinematic-gold-500/30 rounded-lg hover:bg-cinematic-gold-500/30 transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  Assign Crew
                </button>
              </div>
            </div>

            {departmentsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cinematic-emerald-500"></div>
              </div>
            ) : departments.length === 0 ? (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
                <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No departments defined yet</p>
                <p className="text-sm text-gray-500 mt-1">Create departments to organize your crew</p>
              </div>
            ) : (
              <div className="space-y-4">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-100 mb-1">{dept.name}</h3>
                        {dept.description && (
                          <p className="text-sm text-gray-400">{dept.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedDepartmentForPosition(dept.id);
                            setEditingPosition(null);
                            setIsPositionModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-cinematic-emerald-400 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Add Position"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDepartment(dept);
                            setIsDepartmentModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(dept.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {dept.positions.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No positions defined</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {dept.positions.map((pos) => (
                          <div
                            key={pos.id}
                            className="flex items-center justify-between bg-gray-900/50 rounded-lg p-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-200 truncate">{pos.name}</p>
                              {pos.description && (
                                <p className="text-xs text-gray-500 truncate">{pos.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => {
                                  setEditingPosition({ ...pos, departmentId: dept.id });
                                  setSelectedDepartmentForPosition(dept.id);
                                  setIsPositionModalOpen(true);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeletePosition(pos.id)}
                                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Crew Assignments Section */}
        {canManage && crewAssignments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Production Assignments</h2>
            <div className="space-y-3">
              {crewAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-cinematic-emerald-500 to-cinematic-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-base font-bold text-white">
                        {assignment.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-100">{assignment.user.name}</p>
                      <p className="text-sm text-gray-400">
                        {assignment.department.name} • {assignment.position.name}
                      </p>
                      {assignment.notes && (
                        <p className="text-xs text-gray-500 mt-1">{assignment.notes}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCrewAssignment(assignment.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
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
              <h3 className="text-lg font-semibold text-red-400 mb-1">Error Loading Crew</h3>
              <p className="text-sm text-red-300">{usersQuery.error.message}</p>
            </div>
          </div>
        ) : crew.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-800 rounded-2xl mb-6">
              <Users className="h-10 w-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Crew Members</h3>
            <p className="text-gray-500 mb-6">
              Get started by inviting your first crew member
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
            {crew.map((member) => (
              <TeamMemberCard
                key={member.id}
                user={member}
                currentUserId={user?.id || 0}
                canManage={canManage}
                onEditRole={handleEditRole}
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

      <DepartmentPositionModal
        isOpen={isDepartmentModalOpen}
        onClose={() => {
          setIsDepartmentModalOpen(false);
          setEditingDepartment(null);
        }}
        onSave={editingDepartment ? handleUpdateDepartment : handleCreateDepartment}
        isPending={createDepartmentMutation.isPending || updateDepartmentMutation.isPending}
        type="department"
        item={editingDepartment}
      />

      <DepartmentPositionModal
        isOpen={isPositionModalOpen}
        onClose={() => {
          setIsPositionModalOpen(false);
          setEditingPosition(null);
          setSelectedDepartmentForPosition(null);
        }}
        onSave={editingPosition ? handleUpdatePosition : handleCreatePosition}
        isPending={createPositionMutation.isPending || updatePositionMutation.isPending}
        type="position"
        item={editingPosition}
      />

      <AssignCrewModal
        isOpen={isAssignCrewModalOpen}
        onClose={() => setIsAssignCrewModalOpen(false)}
        onAssign={handleAssignCrew}
        isPending={assignCrewToPositionMutation.isPending}
        availableCrew={crew.map((c) => ({ id: c.id, name: c.name, email: c.email }))}
        departments={departments}
      />
    </div>
  );
}
