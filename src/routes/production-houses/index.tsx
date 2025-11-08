import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { DashboardLayout } from "~/components/DashboardLayout";
import { Building2, Plus, Film, Mail, Phone, Globe, MapPin, Edit, Trash2, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";
import { ProductionHouseCombobox } from "~/components/ProductionHouseCombobox";
import { useForm, Controller } from "react-hook-form";

export const Route = createFileRoute("/production-houses/")({
  component: ProductionHousesPage,
});

function ProductionHousesPage() {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const permissions = usePermissions();
  const [editingHouse, setEditingHouse] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const productionHousesQuery = useQuery(
    trpc.getProductionHouses.queryOptions({ token: token || "" })
  );

  const deleteProductionHouseMutation = useMutation(
    trpc.deleteProductionHouse.mutationOptions()
  );

  const productionHouses = productionHousesQuery.data || [];

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteProductionHouseMutation.mutateAsync({
        token: token || "",
        id,
      });
      toast.success("Production house deleted successfully");
      productionHousesQuery.refetch();
    } catch (error: any) {
      const errorInfo = getUserFriendlyError(error);
      toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
    } finally {
      setDeletingId(null);
    }
  };

  if (!permissions.isDeveloper()) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-20">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">Only developers can access production houses.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Production Houses</h1>
            <p className="text-gray-400">
              Manage production companies and their show portfolios
            </p>
          </div>
          {permissions.canManageProductionHouses() && (
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold shadow-lg shadow-cinematic-gold-500/20"
            >
              <Plus className="h-5 w-5" />
              New Production House
            </button>
          )}
        </div>

        {/* Production Houses Grid */}
        {productionHousesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinematic-gold-500"></div>
          </div>
        ) : productionHouses.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">
              No production houses yet. Create your first one!
            </p>
            {permissions.canManageProductionHouses() && (
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-semibold"
              >
                <Plus className="h-5 w-5" />
                Create Production House
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productionHouses.map((house) => (
              <ProductionHouseCard
                key={house.id}
                house={house}
                onEdit={() => setEditingHouse(house)}
                onDelete={() => handleDelete(house.id, house.name)}
                canManage={permissions.canManageProductionHouses()}
                isDeleting={deletingId === house.id}
              />
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {(isCreating || editingHouse) && (
          <ProductionHouseFormModal
            house={editingHouse}
            onClose={() => {
              setIsCreating(false);
              setEditingHouse(null);
            }}
            onSuccess={() => {
              setIsCreating(false);
              setEditingHouse(null);
              productionHousesQuery.refetch();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

interface ProductionHouseCardProps {
  house: {
    id: number;
    name: string;
    description: string | null;
    logoURL: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    website: string | null;
    address: string | null;
    showCount: number;
    createdAt: Date;
    admin?: {
      id: number;
      name: string;
      email: string;
    };
    parentProductionHouse?: {
      id: number;
      name: string;
    };
  };
  onEdit: () => void;
  onDelete: () => void;
  canManage: boolean;
  isDeleting: boolean;
}

function ProductionHouseCard({ house, onEdit, onDelete, canManage, isDeleting }: ProductionHouseCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl hover:border-cinematic-gold-500/50 transition-all h-full flex flex-col">
      <Link
        to="/production-houses/$productionHouseId/shows"
        params={{ productionHouseId: house.id.toString() }}
        className="p-6 flex-1 flex flex-col"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {house.logoURL ? (
              <img
                src={house.logoURL}
                alt={house.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="p-3 bg-cinematic-gold-500/20 rounded-xl">
                <Building2 className="h-6 w-6 text-cinematic-gold-400" />
              </div>
            )}
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 hover:text-cinematic-gold-400 transition-colors">
          {house.name}
        </h3>

        {house.description && (
          <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">
            {house.description}
          </p>
        )}

        {house.admin && (
          <div className="flex items-center gap-2 text-sm text-gray-400 pb-2">
            <div className="w-6 h-6 bg-gradient-to-br from-cinematic-blue-500 to-cinematic-blue-600 rounded-full flex items-center justify-center text-xs font-semibold text-white">
              {house.admin.name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">Admin: {house.admin.name}</span>
          </div>
        )}

        {house.parentProductionHouse && (
          <div className="flex items-center gap-2 text-sm text-gray-400 pb-2">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Part of: {house.parentProductionHouse.name}</span>
          </div>
        )}

        <div className="space-y-2 text-sm">
          {house.contactEmail && (
            <div className="flex items-center gap-2 text-gray-400">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{house.contactEmail}</span>
            </div>
          )}
          {house.contactPhone && (
            <div className="flex items-center gap-2 text-gray-400">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{house.contactPhone}</span>
            </div>
          )}
          {house.website && (
            <div className="flex items-center gap-2 text-gray-400">
              <Globe className="h-4 w-4 flex-shrink-0" />
              <span className="truncate hover:text-cinematic-gold-400 transition-colors">
                {house.website.replace(/^https?:\/\//, "")}
              </span>
            </div>
          )}
          {house.address && (
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{house.address}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 pt-4 mt-4 border-t border-gray-800">
          <Film className="h-4 w-4" />
          <span>{house.showCount} {house.showCount === 1 ? "show" : "shows"}</span>
        </div>
      </Link>

      {canManage && (
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="flex-1 p-2 text-gray-400 hover:text-cinematic-gold-400 hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center gap-2"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
            <span className="text-sm font-medium">Edit</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            className="flex-1 p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            title="Delete"
          >
            {isDeleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span className="text-sm font-medium">Delete</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

interface ProductionHouseFormModalProps {
  house: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ProductionHouseFormModal({ house, onClose, onSuccess }: ProductionHouseFormModalProps) {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const usersQuery = useQuery(
    trpc.getCompanyUsers.queryOptions({ token: token || "" })
  );

  const users = usersQuery.data?.users || [];

  const allProductionHousesQuery = useQuery(
    trpc.getProductionHouses.queryOptions({ token: token || "" })
  );

  const allProductionHouses = allProductionHousesQuery.data || [];

  // Filter out the current house from the parent options to prevent circular references
  const availableParentHouses = allProductionHouses.filter(
    (ph) => !house || ph.id !== house.id
  );

  const [formData, setFormData] = useState({
    name: house?.name || "",
    adminId: house?.adminId || 0,
    parentProductionHouseId: house?.parentProductionHouseId || undefined,
    description: house?.description || "",
    logoURL: house?.logoURL || "",
    contactEmail: house?.contactEmail || "",
    contactPhone: house?.contactPhone || "",
    website: house?.website || "",
    address: house?.address || "",
  });

  const {
    control,
    handleSubmit: handleFormSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      parentProductionHouseId: house?.parentProductionHouseId || undefined,
    },
  });

  const selectedParentId = watch("parentProductionHouseId");

  const createMutation = useMutation(
    trpc.createProductionHouse.mutationOptions()
  );

  const updateMutation = useMutation(
    trpc.updateProductionHouse.mutationOptions()
  );

  const generateLogoUploadUrlMutation = useMutation(
    trpc.generateProductionHouseLogoUploadUrl.mutationOptions()
  );

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPG, PNG, GIF, SVG, or WebP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploadingLogo(true);

    try {
      // Get file extension
      const extension = file.name.substring(file.name.lastIndexOf("."));
      
      // Generate presigned URL
      const { presignedUrl, publicUrl } = await generateLogoUploadUrlMutation.mutateAsync({
        token: token || "",
        fileExtension: extension,
      });

      // Upload file to MinIO
      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      // Update form data with new logo URL
      setFormData({ ...formData, logoURL: publicUrl });
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (house) {
        await updateMutation.mutateAsync({
          token: token || "",
          id: house.id,
          ...formData,
          parentProductionHouseId: selectedParentId,
        });
        toast.success("Production house updated successfully");
      } else {
        await createMutation.mutateAsync({
          token: token || "",
          ...formData,
          parentProductionHouseId: selectedParentId,
        });
        toast.success("Production house created successfully");
      }
      onSuccess();
    } catch (error: any) {
      const errorInfo = getUserFriendlyError(error);
      toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">
            {house ? "Edit Production House" : "New Production House"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
              placeholder="Enter production house name"
            />
          </div>

          <div>
            <label htmlFor="adminId" className="block text-sm font-medium text-gray-300 mb-2">
              Admin <span className="text-red-400">*</span>
            </label>
            <select
              id="adminId"
              value={formData.adminId}
              onChange={(e) => setFormData({ ...formData, adminId: Number(e.target.value) })}
              required
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
            >
              <option value={0}>Select an admin</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email}) - {user.role}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Select a user to manage this production house
            </p>
          </div>

          <div>
            <label htmlFor="parentProductionHouseId" className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Parent Production House (Optional)
            </label>
            <ProductionHouseCombobox
              control={control}
              name="parentProductionHouseId"
              productionHouses={availableParentHouses.map((ph) => ({
                id: ph.id,
                name: ph.name,
              }))}
              disabled={isPending || allProductionHousesQuery.isLoading}
            />
            <p className="text-xs text-gray-500 mt-2">
              Organize production houses hierarchically by selecting a parent
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all resize-none"
              placeholder="Enter description"
            />
          </div>

          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-300 mb-2">
              Contact Email
            </label>
            <input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
              placeholder="contact@example.com"
            />
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-300 mb-2">
              Contact Phone
            </label>
            <input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-2">
              Website
            </label>
            <input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">
              Address
            </label>
            <input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
              placeholder="123 Main St, City, State"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Logo
            </label>
            
            {formData.logoURL && (
              <div className="mb-3 flex items-center gap-3">
                <img
                  src={formData.logoURL}
                  alt="Logo preview"
                  className="w-16 h-16 rounded-lg object-cover border border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoURL: "" })}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
              onChange={handleLogoSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLogo || isPending}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 hover:border-cinematic-gold-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploadingLogo ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cinematic-gold-500"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {formData.logoURL ? "Change Logo" : "Upload Logo"}
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              JPG, PNG, GIF, SVG or WebP. Max size 5MB.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-6 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? "Saving..." : house ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
