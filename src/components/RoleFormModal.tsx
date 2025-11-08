import { Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Shield, Check } from "lucide-react";

const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissionIds: z.array(z.number()).min(1, "At least one permission is required"),
});

type RoleFormData = z.infer<typeof roleFormSchema>;

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
  permissionIds: number[];
}

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit: Role | null;
  permissions: Permission[];
  groupedPermissions: Record<string, Permission[]>;
  onSubmit: (data: RoleFormData) => Promise<void>;
  isPending: boolean;
  templateData?: {
    name: string;
    description: string;
    permissionIds: number[];
  };
}

export function RoleFormModal({
  isOpen,
  onClose,
  roleToEdit,
  permissions,
  groupedPermissions,
  onSubmit,
  isPending,
  templateData,
}: RoleFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      permissionIds: [],
    },
  });

  const selectedPermissions = watch("permissionIds");

  // Reset form when modal opens/closes or role changes
  useEffect(() => {
    if (isOpen && roleToEdit) {
      reset({
        name: roleToEdit.name,
        description: roleToEdit.description || "",
        permissionIds: roleToEdit.permissionIds,
      });
    } else if (isOpen && templateData) {
      reset({
        name: templateData.name,
        description: templateData.description || "",
        permissionIds: templateData.permissionIds,
      });
    } else if (isOpen && !roleToEdit && !templateData) {
      reset({
        name: "",
        description: "",
        permissionIds: [],
      });
    }
  }, [isOpen, roleToEdit, templateData, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const togglePermission = (permissionId: number) => {
    const current = selectedPermissions || [];
    if (current.includes(permissionId)) {
      setValue(
        "permissionIds",
        current.filter((id) => id !== permissionId),
        { shouldValidate: true }
      );
    } else {
      setValue("permissionIds", [...current, permissionId], {
        shouldValidate: true,
      });
    }
  };

  const toggleCategory = (category: string) => {
    const categoryPermissions = groupedPermissions[category] || [];
    const categoryPermissionIds = categoryPermissions.map((p) => p.id);
    const current = selectedPermissions || [];
    
    // Check if all permissions in this category are selected
    const allSelected = categoryPermissionIds.every((id) => current.includes(id));
    
    if (allSelected) {
      // Deselect all in category
      setValue(
        "permissionIds",
        current.filter((id) => !categoryPermissionIds.includes(id)),
        { shouldValidate: true }
      );
    } else {
      // Select all in category
      const newIds = [...new Set([...current, ...categoryPermissionIds])];
      setValue("permissionIds", newIds, { shouldValidate: true });
    }
  };

  const isCategoryFullySelected = (category: string) => {
    const categoryPermissions = groupedPermissions[category] || [];
    const categoryPermissionIds = categoryPermissions.map((p) => p.id);
    const current = selectedPermissions || [];
    return categoryPermissionIds.every((id) => current.includes(id));
  };

  const isCategoryPartiallySelected = (category: string) => {
    const categoryPermissions = groupedPermissions[category] || [];
    const categoryPermissionIds = categoryPermissions.map((p) => p.id);
    const current = selectedPermissions || [];
    const someSelected = categoryPermissionIds.some((id) => current.includes(id));
    const allSelected = categoryPermissionIds.every((id) => current.includes(id));
    return someSelected && !allSelected;
  };

  const isSystemRole = roleToEdit?.isSystemRole || false;

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
              <Dialog.Panel className="w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-xl shadow-2xl">
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-cinematic-gold-500/20 p-2 rounded-lg">
                          <Shield className="h-6 w-6 text-cinematic-gold-400" />
                        </div>
                        <div>
                          <Dialog.Title className="text-xl font-bold text-gray-100">
                            {roleToEdit ? "View Role" : templateData ? `Create Role from Template: ${templateData.name}` : "Create Custom Role"}
                          </Dialog.Title>
                          {isSystemRole && (
                            <p className="text-sm text-gray-400 mt-1">
                              System roles cannot be modified
                            </p>
                          )}
                          {templateData && !roleToEdit && (
                            <p className="text-sm text-gray-400 mt-1">
                              Starting with recommended permissions - customize as needed
                            </p>
                          )}
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

                    <div className="space-y-6">
                      {/* Role Name */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                          Role Name
                        </label>
                        <input
                          id="name"
                          type="text"
                          {...register("name")}
                          disabled={isSystemRole}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="e.g., Production Coordinator"
                        />
                        {errors.name && (
                          <p className="mt-2 text-sm text-red-400">{errors.name.message}</p>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                          Description (Optional)
                        </label>
                        <textarea
                          id="description"
                          {...register("description")}
                          disabled={isSystemRole}
                          rows={2}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Describe the responsibilities of this role..."
                        />
                      </div>

                      {/* Permissions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          Permissions
                        </label>
                        {errors.permissionIds && (
                          <p className="mb-3 text-sm text-red-400">{errors.permissionIds.message}</p>
                        )}
                        
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                          {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                            <div key={category} className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <button
                                  type="button"
                                  onClick={() => !isSystemRole && toggleCategory(category)}
                                  disabled={isSystemRole}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isCategoryFullySelected(category)
                                      ? "bg-cinematic-gold-500 border-cinematic-gold-500"
                                      : isCategoryPartiallySelected(category)
                                      ? "bg-cinematic-gold-500/50 border-cinematic-gold-500"
                                      : "border-gray-600 hover:border-gray-500"
                                  }`}
                                >
                                  {isCategoryFullySelected(category) && (
                                    <Check className="h-3 w-3 text-gray-950" />
                                  )}
                                  {isCategoryPartiallySelected(category) && (
                                    <div className="w-2 h-0.5 bg-gray-950" />
                                  )}
                                </button>
                                <h4 className="text-sm font-semibold text-gray-200">{category}</h4>
                              </div>
                              
                              <div className="space-y-2 ml-8">
                                {categoryPermissions.map((permission) => (
                                  <label
                                    key={permission.id}
                                    className={`flex items-start gap-3 ${
                                      isSystemRole ? "cursor-not-allowed" : "cursor-pointer"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedPermissions?.includes(permission.id) || false}
                                      onChange={() => !isSystemRole && togglePermission(permission.id)}
                                      disabled={isSystemRole}
                                      className="mt-1 w-4 h-4 text-cinematic-gold-500 bg-gray-800 border-gray-600 rounded focus:ring-cinematic-gold-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <div className="flex-1">
                                      <div className="text-sm text-gray-300">{permission.displayName}</div>
                                      {permission.description && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {permission.description}
                                        </div>
                                      )}
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!isSystemRole && (
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
                            {roleToEdit ? "Updating..." : "Creating..."}
                          </>
                        ) : (
                          <>
                            <Shield className="h-5 w-5" />
                            {roleToEdit ? "Update Role" : "Create Role"}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
