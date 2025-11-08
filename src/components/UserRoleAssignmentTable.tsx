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
  Clock, 
  Filter,
  ChevronDown,
  Loader2,
  AlertCircle,
  User,
  Edit2
} from "lucide-react";
import toast from "react-hot-toast";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";
import { Menu } from "@headlessui/react";

interface UserRoleAssignmentTableProps {
  onEditUserProfile?: (userId: number) => void;
}

interface UserWithRole {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  roleId: number | null;
  isActive: boolean;
  approvedByAdmin: boolean;
  profileImage?: string | null;
  statusMessage?: string | null;
  createdAt: Date;
  lastLogin?: Date | null;
  lastActiveAt?: Date | string | null;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  userCount: number;
  permissions: Array<{
    id: number;
    name: string;
    displayName: string;
    description: string | null;
    category: string;
  }>;
}

export function UserRoleAssignmentTable({ onEditUserProfile }: UserRoleAssignmentTableProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user: currentUser } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [bulkRoleId, setBulkRoleId] = useState<number | null>(null);

  // Fetch users and roles
  const usersQuery = useQuery(
    trpc.getCompanyUsers.queryOptions({ token: token || "" })
  );

  const rolesQuery = useQuery(
    trpc.getRoles.queryOptions({ token: token || "" })
  );

  const users = usersQuery.data?.users || [];
  const roles = rolesQuery.data || [];

  // Filter system roles to only allowed ones
  const allowedSystemRoles = ["Developer", "Admin", "Manager", "Viewer", "Actor", "Crew"];
  const availableRoles = roles.filter((role: Role) => {
    if (role.isSystemRole) {
      return allowedSystemRoles.includes(role.name);
    }
    return true;
  });

  const updateRoleMutation = useMutation(
    trpc.updateUserRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getCompanyUsers.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.getRoles.queryKey() });
        toast.success("Role updated successfully");
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

  const filteredUsers = useMemo(() => {
    return users.filter((user: UserWithRole) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.phone && user.phone.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Role filter
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "active" && !user.isActive) return false;
      if (statusFilter === "inactive" && user.isActive) return false;
      if (statusFilter === "pending" && user.approvedByAdmin) return false;
      if (statusFilter === "approved" && !user.approvedByAdmin) return false;

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const roleDistribution = new Map<string, number>();
    users.forEach((user: UserWithRole) => {
      const count = roleDistribution.get(user.role) || 0;
      roleDistribution.set(user.role, count + 1);
    });

    return {
      total: users.length,
      active: users.filter((u: UserWithRole) => u.isActive).length,
      pending: users.filter((u: UserWithRole) => !u.approvedByAdmin).length,
      withoutRole: users.filter((u: UserWithRole) => !u.roleId).length,
      roleDistribution,
    };
  }, [users]);

  const handleRoleChange = async (userId: number, roleId: number) => {
    if (userId === currentUser?.id) {
      toast.error("You cannot change your own role");
      return;
    }

    await updateRoleMutation.mutateAsync({
      token: token || "",
      userId,
      roleId,
    });
  };

  const handleBulkRoleChange = async () => {
    if (!bulkRoleId || selectedUsers.size === 0) {
      toast.error("Please select users and a role");
      return;
    }

    const promises = Array.from(selectedUsers).map((userId) => {
      if (userId === currentUser?.id) return Promise.resolve();
      return updateRoleMutation.mutateAsync({
        token: token || "",
        userId,
        roleId: bulkRoleId,
      });
    });

    try {
      await Promise.all(promises);
      setSelectedUsers(new Set());
      setBulkRoleId(null);
      toast.success(`Updated roles for ${promises.length} user(s)`);
    } catch (error) {
      // Individual errors are already handled by the mutation
    }
  };

  const toggleUserSelection = (userId: number) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u: UserWithRole) => u.id)));
    }
  };

  if (usersQuery.isLoading || rolesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cinematic-gold-400" />
      </div>
    );
  }

  if (usersQuery.error || rolesQuery.error) {
    const error = usersQuery.error || rolesQuery.error;
    const errorInfo = getUserFriendlyError(error);
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-1">Error Loading Data</h3>
            <p className="text-sm text-red-300">{errorInfo.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-cinematic-blue-500/20 p-2 rounded-lg">
              <Users className="h-5 w-5 text-cinematic-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total Users</div>
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
            <div className="bg-red-500/20 p-2 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.withoutRole}</div>
              <div className="text-sm text-gray-400">Without Role</div>
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
              placeholder="Search by name, email, or phone..."
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="approved">Approved Only</option>
            <option value="pending">Pending Approval</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="bg-cinematic-gold-500/10 border border-cinematic-gold-500/30 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-cinematic-gold-400" />
              <span className="text-sm font-medium text-cinematic-gold-400">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-3 flex-1">
              <select
                value={bulkRoleId || ""}
                onChange={(e) => setBulkRoleId(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
              >
                <option value="">Select a role...</option>
                {availableRoles.map((role: Role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} {role.isSystemRole ? "(System)" : "(Custom)"}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkRoleChange}
                disabled={!bulkRoleId || updateRoleMutation.isPending}
                className="px-4 py-2 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {updateRoleMutation.isPending ? "Updating..." : "Apply to Selected"}
              </button>
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No Users Found</h3>
            <p className="text-gray-500">
              {searchQuery || roleFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "No users in your company yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-cinematic-gold-500 bg-gray-800 border-gray-600 rounded focus:ring-cinematic-gold-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Current Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Assign Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.map((user: UserWithRole) => (
                  <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        disabled={user.id === currentUser?.id}
                        className="w-4 h-4 text-cinematic-gold-500 bg-gray-800 border-gray-600 rounded focus:ring-cinematic-gold-500 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cinematic-blue-500 to-cinematic-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            {user.name}
                            {user.id === currentUser?.id && (
                              <span className="text-xs text-gray-400">(You)</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border bg-green-500/20 text-green-400 border-green-500/30 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border bg-red-500/20 text-red-400 border-red-500/30 w-fit">
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                        {!user.approvedByAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border bg-yellow-500/20 text-yellow-400 border-yellow-500/30 w-fit">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md border ${getRoleBadgeColor(user.role)}`}>
                        {user.role || "No Role"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={user.roleId || ""}
                        onChange={(e) => {
                          const roleId = Number(e.target.value);
                          if (roleId) handleRoleChange(user.id, roleId);
                        }}
                        disabled={user.id === currentUser?.id || updateRoleMutation.isPending}
                        className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select role...</option>
                        {availableRoles.map((role: Role) => (
                          <option key={role.id} value={role.id}>
                            {role.name} {role.isSystemRole ? "(System)" : "(Custom)"}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      {onEditUserProfile && (
                        <button
                          onClick={() => onEditUserProfile(user.id)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                      )}
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
            <p className="font-medium mb-1">About Role Assignment</p>
            <ul className="space-y-1 list-disc list-inside text-blue-300/80">
              <li>Assign roles to users to control their permissions and access levels</li>
              <li>System roles are built-in, while custom roles are created by your company</li>
              <li>You cannot change your own role for security reasons</li>
              <li>Use bulk actions to assign the same role to multiple users at once</li>
              <li>Inactive users retain their roles but cannot access the system</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
