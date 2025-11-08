import { Mail, Phone, MoreVertical, Edit2, UserX, CheckCircle, XCircle, Clock, User, Key } from "lucide-react";
import { Menu } from "@headlessui/react";
import { PresenceIndicator } from "~/components/PresenceIndicator";

interface TeamMemberCardProps {
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    role: string;
    isActive: boolean;
    approvedByAdmin: boolean;
    profileImage?: string | null;
    createdAt: Date;
    lastLogin?: Date | null;
    lastActiveAt?: Date | string | null;
    statusMessage?: string | null;
  };
  currentUserId: number;
  canManage: boolean;
  onEditRole: (userId: number) => void;
  onEditProfile: (userId: number) => void;
  onSendTempPassword: (userId: number) => void;
  onToggleStatus: (userId: number, isActive: boolean) => void;
  onToggleApproval: (userId: number, approved: boolean) => void;
  onRemove: (userId: number) => void;
}

export function TeamMemberCard({
  user,
  currentUserId,
  canManage,
  onEditRole,
  onEditProfile,
  onSendTempPassword,
  onToggleStatus,
  onToggleApproval,
  onRemove,
}: TeamMemberCardProps) {
  const isCurrentUser = user.id === currentUserId;
  
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Developer":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "Admin":
        return "bg-cinematic-gold-500/20 text-cinematic-gold-400 border-cinematic-gold-500/30";
      case "Actor":
        return "bg-cinematic-blue-500/20 text-cinematic-blue-400 border-cinematic-blue-500/30";
      case "Crew":
        return "bg-cinematic-emerald-500/20 text-cinematic-emerald-400 border-cinematic-emerald-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all">
      <div className="flex items-start gap-4">
        {/* Avatar with presence indicator */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-cinematic-blue-500 to-cinematic-blue-600 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 bg-gray-800 rounded-full p-0.5">
            <PresenceIndicator lastActiveAt={user.lastActiveAt} size="sm" />
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                {user.name}
                {isCurrentUser && (
                  <span className="text-xs font-normal text-gray-400">(You)</span>
                )}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
                
                {user.isActive ? (
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

                {!user.approvedByAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <Clock className="h-3 w-3" />
                    Pending Approval
                  </span>
                )}
              </div>
            </div>

            {/* Actions Menu */}
            {canManage && !isCurrentUser && (
              <Menu as="div" className="relative">
                <Menu.Button className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors">
                  <MoreVertical className="h-5 w-5" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => onEditRole(user.id)}
                        className={`${
                          active ? "bg-gray-700" : ""
                        } flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300`}
                      >
                        <Edit2 className="h-4 w-4" />
                        Change Role
                      </button>
                    )}
                  </Menu.Item>
                  
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => onEditProfile(user.id)}
                        className={`${
                          active ? "bg-gray-700" : ""
                        } flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300`}
                      >
                        <User className="h-4 w-4" />
                        Edit Profile
                      </button>
                    )}
                  </Menu.Item>
                  
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => onSendTempPassword(user.id)}
                        className={`${
                          active ? "bg-gray-700" : ""
                        } flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300`}
                      >
                        <Key className="h-4 w-4" />
                        Send Temporary Password
                      </button>
                    )}
                  </Menu.Item>
                  
                  {!user.approvedByAdmin && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => onToggleApproval(user.id, true)}
                          className={`${
                            active ? "bg-gray-700" : ""
                          } flex items-center gap-2 w-full px-4 py-2 text-sm text-green-400`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve User
                        </button>
                      )}
                    </Menu.Item>
                  )}

                  {user.approvedByAdmin && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => onToggleApproval(user.id, false)}
                          className={`${
                            active ? "bg-gray-700" : ""
                          } flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-400`}
                        >
                          <Clock className="h-4 w-4" />
                          Revoke Approval
                        </button>
                      )}
                    </Menu.Item>
                  )}

                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => onToggleStatus(user.id, !user.isActive)}
                        className={`${
                          active ? "bg-gray-700" : ""
                        } flex items-center gap-2 w-full px-4 py-2 text-sm ${
                          user.isActive ? "text-yellow-400" : "text-green-400"
                        }`}
                      >
                        {user.isActive ? (
                          <>
                            <XCircle className="h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Activate
                          </>
                        )}
                      </button>
                    )}
                  </Menu.Item>

                  <div className="border-t border-gray-700 my-1" />

                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => onRemove(user.id)}
                        className={`${
                          active ? "bg-gray-700" : ""
                        } flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400`}
                      >
                        <UserX className="h-4 w-4" />
                        Remove from Team
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-1 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>

          {/* Status Message */}
          {user.statusMessage && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-400 italic">
              <span className="text-cinematic-gold-400">"</span>
              {user.statusMessage}
              <span className="text-cinematic-gold-400">"</span>
            </div>
          )}

          {/* Last Login */}
          {user.lastLogin && (
            <div className="mt-3 text-xs text-gray-500">
              Last login: {new Date(user.lastLogin).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
