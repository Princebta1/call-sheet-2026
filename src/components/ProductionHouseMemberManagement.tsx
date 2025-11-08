import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { 
  Users, 
  Search, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  UserPlus,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

interface ProductionHouseMemberManagementProps {
  productionHouseId: number;
  productionHouseName: string;
}

export function ProductionHouseMemberManagement({ 
  productionHouseId,
  productionHouseName 
}: ProductionHouseMemberManagementProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user: currentUser } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  // Fetch members
  const membersQuery = useQuery(
    trpc.getProductionHouseMembers.queryOptions({ 
      token: token || "", 
      productionHouseId 
    })
  );

  // Fetch all company users for adding new members
  const usersQuery = useQuery(
    trpc.getCompanyUsers.queryOptions({ token: token || "" })
  );

  // Fetch available roles
  const rolesQuery = useQuery(
    trpc.getRoles.queryOptions({ token: token || "" })
  );

  const members = membersQuery.data?.members || [];
  const allUsers = usersQuery.data?.users || [];
  const roles = rolesQuery.data || [];

  const updateRoleMutation = useMutation(
    trpc.updateProductionHouseMemberRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ 
          queryKey: trpc.getProductionHouseMembers.queryKey() 
        });
        toast.success("Role updated successfully");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const removeMemberMutation = useMutation(
    trpc.removeProductionHouseMember.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ 
          queryKey: trpc.getProductionHouseMembers.queryKey() 
        });
        toast.success(`${data.removedUser.name} removed from production house`);
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case "Developer":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "Admin":
        return "bg-cinematic-gold-500/20 text-cinematic-gold-400 border-cinematic-gold-500/30";
      case "Manager":
        return "bg-cinematic-blue-500/20 text-cinematic-blue-400 border-cinematic-blue-500/30";
      case "Viewer":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "Actor":
        return "bg-cinematic-blue-500/20 text-cinematic-blue-400 border-cinematic-blue-500/30";
      case "Crew":
        return "bg-cinematic-emerald-500/20 text-cinematic-emerald-400 border-cinematic-emerald-500/30";
      default:
        return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          member.name.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query) ||
          (member.phone && member.phone.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Role filter
      if (roleFilter !== "all" && member.roleName !== roleFilter) {
        return false;
      }

      return true;
    });
  }, [members, searchQuery, roleFilter]);

  const stats = useMemo(() => {
    const roleDistribution = new Map<string, number>();
    members.forEach((member) => {
      const count = roleDistribution.get(member.roleName) || 0;
      roleDistribution.set(member.roleName, count + 1);
    });

    return {
      total: members.length,
      active: members.filter((m) => m.isActive).length,
      roleDistribution,
    };
  }, [members]);

  const handleRoleChange = async (memberId: number, roleId: number) => {
    await updateRoleMutation.mutateAsync({
      token: token || "",
      memberId,
      roleId,
    });
  };

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    if (!confirm(`Remove ${memberName} from ${productionHouseName}?`)) {
      return;
    }

    await removeMemberMutation.mutateAsync({
      token: token || "",
      memberId,
    });
  };

  // Filter system roles to only allowed ones
  const allowedSystemRoles = ["Developer", "Admin", "Manager", "Viewer", "Actor", "Crew"];
  const availableRoles = roles.filter((role: any) => {
    if (role.isSystemRole) {
      return allowedSystemRoles.includes(role.name);
    }
    return true;
  });

  // Get users who are not yet members
  const availableUsers = allUsers.filter(
    (user: any) => !members.some((m) => m.userId === user.id)
  );

  if (membersQuery.isLoading || usersQuery.isLoading || rolesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cinematic-gold-400" />
      </div>
    );
  }

  if (membersQuery.error) {
    const errorInfo = getUserFriendlyError(membersQuery.error);
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-1">Error Loading Members</h3>
            <p className="text-sm text-red-300">{errorInfo.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Team Members</h3>
          <p className="text-sm text-gray-400">
            Manage access and roles for {productionHouseName}
          </p>
        </div>
        <button
          onClick={() => setIsAddMemberModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold"
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="text-sm text-gray-400">Active Members</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
          >
            <option value="all">All Roles</option>
            {Array.from(stats.roleDistribution.keys()).map((role) => (
              <option key={role} value={role}>
                {role} ({stats.roleDistribution.get(role)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              {members.length === 0 ? "No Members Yet" : "No Members Found"}
            </h3>
            <p className="text-gray-500 mb-4">
              {members.length === 0
                ? "Add team members to grant them access to this production house"
                : "Try adjusting your search or filters"}
            </p>
            {members.length === 0 && (
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-medium"
              >
                <UserPlus className="h-4 w-4" />
                Add First Member
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Member</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Assign Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {member.profileImage ? (
                          <img
                            src={member.profileImage}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-cinematic-blue-500 to-cinematic-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-white">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            {member.name}
                            {member.userId === currentUser?.id && (
                              <span className="text-xs text-gray-400">(You)</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {member.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border bg-red-500/20 text-red-400 border-red-500/30">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md border ${getRoleBadgeColor(member.roleName)}`}>
                        {member.roleName}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={member.roleId || ""}
                        onChange={(e) => {
                          const roleId = Number(e.target.value);
                          if (roleId) handleRoleChange(member.id, roleId);
                        }}
                        disabled={member.userId === currentUser?.id || updateRoleMutation.isPending}
                        className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select role...</option>
                        {availableRoles.map((role: any) => (
                          <option key={role.id} value={role.id}>
                            {role.name} {role.isSystemRole ? "(System)" : "(Custom)"}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleRemoveMember(member.id, member.name)}
                        disabled={member.userId === currentUser?.id || removeMemberMutation.isPending}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">About Production House Roles</p>
            <ul className="space-y-1 list-disc list-inside text-blue-300/80">
              <li>Members must first be part of your company before being added to a production house</li>
              <li>Each member can have a different role within this production house</li>
              <li>Roles control what actions members can perform within this production house</li>
              <li>You cannot change your own role or remove yourself for security reasons</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        productionHouseId={productionHouseId}
        productionHouseName={productionHouseName}
        availableUsers={availableUsers}
        availableRoles={availableRoles}
      />
    </div>
  );
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionHouseId: number;
  productionHouseName: string;
  availableUsers: any[];
  availableRoles: any[];
}

function AddMemberModal({
  isOpen,
  onClose,
  productionHouseId,
  productionHouseName,
  availableUsers,
  availableRoles,
}: AddMemberModalProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const addMemberMutation = useMutation(
    trpc.addProductionHouseMember.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ 
          queryKey: trpc.getProductionHouseMembers.queryKey() 
        });
        toast.success(`${data.member.userName} added to ${productionHouseName}`);
        handleClose();
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const handleClose = () => {
    setSelectedUserId(null);
    setSelectedRoleId(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId || !selectedRoleId) {
      toast.error("Please select both a user and a role");
      return;
    }

    await addMemberMutation.mutateAsync({
      token: token || "",
      productionHouseId,
      userId: selectedUserId,
      roleId: selectedRoleId,
    });
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
                <form onSubmit={handleSubmit}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-cinematic-gold-500/20 p-2 rounded-lg">
                          <UserPlus className="h-6 w-6 text-cinematic-gold-400" />
                        </div>
                        <div>
                          <Dialog.Title className="text-xl font-bold text-gray-100">
                            Add Team Member
                          </Dialog.Title>
                          <p className="text-sm text-gray-400 mt-1">
                            Add a member to {productionHouseName}
                          </p>
                        </div>
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
                      {/* User Selection */}
                      <div>
                        <label htmlFor="user" className="block text-sm font-medium text-gray-300 mb-2">
                          Select User
                        </label>
                        <select
                          id="user"
                          value={selectedUserId || ""}
                          onChange={(e) => setSelectedUserId(Number(e.target.value) || null)}
                          required
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                        >
                          <option value="">Choose a user...</option>
                          {availableUsers.map((user: any) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email}) - {user.role}
                            </option>
                          ))}
                        </select>
                        {availableUsers.length === 0 && (
                          <p className="mt-2 text-sm text-amber-400">
                            All company users are already members of this production house
                          </p>
                        )}
                      </div>

                      {/* Role Selection */}
                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
                          Assign Role
                        </label>
                        <select
                          id="role"
                          value={selectedRoleId || ""}
                          onChange={(e) => setSelectedRoleId(Number(e.target.value) || null)}
                          required
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                        >
                          <option value="">Choose a role...</option>
                          {availableRoles.map((role: any) => (
                            <option key={role.id} value={role.id}>
                              {role.name} {role.isSystemRole ? "(System)" : "(Custom)"}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-gray-500">
                          This role will determine the user's permissions within this production house
                        </p>
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
                      disabled={addMemberMutation.isPending || !selectedUserId || !selectedRoleId || availableUsers.length === 0}
                      className="flex-1 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {addMemberMutation.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-5 w-5" />
                          Add Member
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
