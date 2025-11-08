import React from "react";
import { Check, X, Shield, Info, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuthStore } from "~/stores/authStore";

interface Permission {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  category: string;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  userCount: number;
  permissions: Permission[];
  permissionIds: number[];
}

interface PermissionMatrixViewProps {
  roles: Role[];
  permissions: Permission[];
  groupedPermissions: Record<string, Permission[]>;
}

export function PermissionMatrixView({
  roles,
  permissions,
  groupedPermissions,
}: PermissionMatrixViewProps) {
  const { user } = useAuthStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(groupedPermissions))
  );
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const hasPermission = (role: Role, permissionId: number): boolean => {
    return role.permissionIds.includes(permissionId);
  };

  const getRoleColumnClass = (role: Role): string => {
    if (role.name === user?.role) {
      return "bg-cinematic-gold-500/10 border-l-2 border-r-2 border-cinematic-gold-500/50";
    }
    return "";
  };

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

  const categories = Object.keys(groupedPermissions).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Permission Matrix Overview</p>
            <p className="text-blue-300/80">
              This matrix shows all permissions across all roles in your system. 
              Your current role ({user?.role}) is highlighted in gold. 
              System roles are built-in and cannot be modified, while custom roles are created by your company.
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500/20 border border-green-500/30 rounded flex items-center justify-center">
              <Check className="h-4 w-4 text-green-400" />
            </div>
            <span className="text-sm text-gray-400">Has Permission</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-800 border border-gray-700 rounded flex items-center justify-center">
              <X className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-sm text-gray-400">No Permission</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-6 bg-cinematic-gold-500/10 border-l-2 border-r-2 border-cinematic-gold-500/50 rounded"></div>
            <span className="text-sm text-gray-400">Your Current Role</span>
          </div>
        </div>
      </div>

      {/* Matrix */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300 min-w-[250px] sticky left-0 bg-gray-900/50 border-r border-gray-700">
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className={`px-4 py-4 text-center text-sm font-semibold min-w-[120px] ${getRoleColumnClass(role)}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md border ${getRoleBadgeColor(role.name)}`}
                      >
                        {role.isSystemRole && <Shield className="h-3 w-3" />}
                        {role.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {role.permissions.length} perms
                      </span>
                      {role.name === user?.role && (
                        <span className="text-xs text-cinematic-gold-400 font-medium">
                          (You)
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {categories.map((category) => {
                const categoryPermissions = groupedPermissions[category];
                const isExpanded = expandedCategories.has(category);

                return (
                  <React.Fragment key={category}>
                    {/* Category Header Row */}
                    <tr className="bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                      <td
                        colSpan={roles.length + 1}
                        className="px-4 py-3 sticky left-0 bg-gray-800/30"
                      >
                        <button
                          onClick={() => toggleCategory(category)}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-200 hover:text-white transition-colors w-full"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {category}
                          <span className="text-xs text-gray-500 ml-2">
                            ({categoryPermissions.length} permissions)
                          </span>
                        </button>
                      </td>
                    </tr>

                    {/* Permission Rows */}
                    {isExpanded &&
                      categoryPermissions.map((permission) => (
                        <tr
                          key={permission.id}
                          className="hover:bg-gray-800/20 transition-colors"
                        >
                          <td className="px-4 py-3 sticky left-0 bg-gray-900/50 border-r border-gray-700">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-300">
                                {permission.displayName}
                              </span>
                              {permission.description && (
                                <span className="text-xs text-gray-500 mt-0.5">
                                  {permission.description}
                                </span>
                              )}
                            </div>
                          </td>
                          {roles.map((role) => (
                            <td
                              key={role.id}
                              className={`px-4 py-3 text-center ${getRoleColumnClass(role)}`}
                            >
                              {hasPermission(role, permission.id) ? (
                                <div className="flex items-center justify-center">
                                  <div className="w-6 h-6 bg-green-500/20 border border-green-500/30 rounded flex items-center justify-center">
                                    <Check className="h-4 w-4 text-green-400" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <div className="w-6 h-6 bg-gray-800 border border-gray-700 rounded flex items-center justify-center">
                                    <X className="h-4 w-4 text-gray-600" />
                                  </div>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-cinematic-blue-500/20 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-cinematic-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{roles.length}</div>
              <div className="text-sm text-gray-400">Total Roles</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-cinematic-gold-500/20 p-2 rounded-lg">
              <Check className="h-5 w-5 text-cinematic-gold-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{permissions.length}</div>
              <div className="text-sm text-gray-400">Total Permissions</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <Info className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{categories.length}</div>
              <div className="text-sm text-gray-400">Permission Categories</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
