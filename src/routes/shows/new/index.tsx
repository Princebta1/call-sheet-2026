import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Clapperboard, UserPlus, Copy, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { DashboardLayout } from "~/components/DashboardLayout";
import { usePermissions } from "~/hooks/usePermissions";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";
import { ProductionHouseCombobox } from "~/components/ProductionHouseCombobox";

export const Route = createFileRoute("/shows/new/")({
  component: NewShowPage,
});

const showSchema = z.object({
  title: z.string().min(1, "Title is required"),
  productionHouseId: z.number({
    required_error: "Production house is required",
    invalid_type_error: "Production house is required",
  }),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["Pre-Production", "Shooting", "Wrapped"]).default("Pre-Production"),
  inviteAdmin: z.boolean().default(false),
  adminName: z.string().optional(),
  adminEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  adminPhone: z.string().optional(),
  adminRoleId: z.preprocess(
    (val) => {
      // Convert empty string, null, undefined, or NaN to undefined
      if (val === "" || val === null || val === undefined || (typeof val === "number" && isNaN(val))) {
        return undefined;
      }
      return typeof val === "string" ? Number(val) : val;
    },
    z.number().optional()
  ),
  approveImmediately: z.boolean().default(true),
}).superRefine((data, ctx) => {
  // Only validate admin fields if inviteAdmin is checked
  if (data.inviteAdmin) {
    if (!data.adminName || data.adminName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admin name is required when inviting a production admin",
        path: ["adminName"],
      });
    }
    if (!data.adminEmail || data.adminEmail.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admin email is required when inviting a production admin",
        path: ["adminEmail"],
      });
    }
    if (!data.adminRoleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a role for the admin",
        path: ["adminRoleId"],
      });
    }
  }
});

type ShowForm = z.infer<typeof showSchema>;

function NewShowPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { token, isAuthenticated, clearAuth } = useAuthStore();
  const { canManageShows } = usePermissions();
  const [inviteResult, setInviteResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreatingProductionHouse, setIsCreatingProductionHouse] = useState(false);

  const rolesQuery = useQuery(
    trpc.getRoles.queryOptions({ token: token || "" })
  );

  const roles = rolesQuery.data || [];

  const productionHousesQuery = useQuery(
    trpc.getProductionHouses.queryOptions({ token: token || "" })
  );

  const productionHouses = productionHousesQuery.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control,
  } = useForm<ShowForm>({
    resolver: zodResolver(showSchema),
    defaultValues: {
      status: "Pre-Production",
      inviteAdmin: false,
      approveImmediately: true,
    },
  });

  const inviteAdmin = watch("inviteAdmin");

  const createShowMutation = useMutation(
    trpc.createShow.mutationOptions()
  );

  const inviteUserMutation = useMutation(
    trpc.inviteUser.mutationOptions()
  );

  const assignUserToShowMutation = useMutation(
    trpc.assignUserToShow.mutationOptions()
  );

  const createProductionHouseMutation = useMutation(
    trpc.createProductionHouseSimple.mutationOptions()
  );

  // Monitor query errors for UNAUTHORIZED and redirect to login
  useEffect(() => {
    const checkForUnauthorized = (error: any) => {
      if (!error) return false;
      
      const isUnauthorized = 
        error?.data?.code === "UNAUTHORIZED" ||
        error?.code === "UNAUTHORIZED" ||
        (error?.message && /invalid or expired token/i.test(error.message));
      
      if (isUnauthorized) {
        console.log("[Auth] Detected expired token, clearing auth and redirecting to login");
        clearAuth();
        navigate({ to: "/login" });
        return true;
      }
      return false;
    };

    // Check roles query for UNAUTHORIZED errors
    if (rolesQuery.error && checkForUnauthorized(rolesQuery.error)) {
      return;
    }
  }, [rolesQuery.error, navigate, clearAuth]);

  // Check authentication - redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, navigate]);

  const handleCreateProductionHouse = async (name: string) => {
    try {
      setIsCreatingProductionHouse(true);
      const newHouse = await createProductionHouseMutation.mutateAsync({
        token: token || "",
        name,
      });
      
      // Refetch production houses to include the new one
      await productionHousesQuery.refetch();
      
      // Set the newly created production house as selected
      setValue("productionHouseId", newHouse.id);
      
      toast.success(`Production house "${name}" created successfully!`);
    } catch (error: any) {
      const errorInfo = getUserFriendlyError(error);
      toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
    } finally {
      setIsCreatingProductionHouse(false);
    }
  };

  const onSubmit = async (data: ShowForm) => {
    try {
      // Create the show
      const show = await createShowMutation.mutateAsync({
        token: token || "",
        title: data.title,
        productionHouseId: data.productionHouseId,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
      });

      // If inviting an admin, create the user and assign to show
      if (data.inviteAdmin && data.adminName && data.adminEmail && data.adminRoleId) {
        const inviteResponse = await inviteUserMutation.mutateAsync({
          token: token || "",
          name: data.adminName,
          email: data.adminEmail,
          phone: data.adminPhone,
          roleId: data.adminRoleId,
          approveImmediately: data.approveImmediately,
        });

        // Assign the user to the show
        await assignUserToShowMutation.mutateAsync({
          token: token || "",
          userId: inviteResponse.user.id,
          showId: show.id,
        });

        // Show the temporary password
        setInviteResult({
          email: data.adminEmail,
          password: inviteResponse.temporaryPassword,
        });

        toast.success(`Show created and ${data.adminName} invited!`);
      } else {
        toast.success("Show created successfully!");
        navigate({ to: "/shows" });
      }
    } catch (error: any) {
      const errorInfo = getUserFriendlyError(error);
      toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
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

  const handleDone = () => {
    navigate({ to: "/shows" });
  };

  const isPending = createShowMutation.isPending || inviteUserMutation.isPending || assignUserToShowMutation.isPending || isCreatingProductionHouse;

  // Check permissions after all hooks have been called
  if (!isAuthenticated()) {
    return null; // Will redirect via useEffect
  }

  if (!canManageShows()) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-20">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">You don't have permission to create shows.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (inviteResult) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-2xl mx-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-500/20 p-3 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Show Created!</h1>
                <p className="text-gray-400">Production admin invited successfully</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-400">
                    <p className="font-medium mb-1">Important: Save this password</p>
                    <p>This temporary password will only be shown once. Share it securely with the new production admin.</p>
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
                onClick={handleDone}
                className="w-full bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all mt-6"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <button
          onClick={() => navigate({ to: "/shows" })}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Shows
        </button>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-cinematic-gold-500/20 p-3 rounded-lg">
              <Clapperboard className="h-8 w-8 text-cinematic-gold-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Create New Show</h1>
              <p className="text-gray-400">Set up a new production</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Show Details Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Show Details</h2>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  {...register("title")}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                  placeholder="Enter show title"
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-400">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="productionHouseId" className="block text-sm font-medium text-gray-300 mb-2">
                  Production House <span className="text-red-400">*</span>
                </label>
                <ProductionHouseCombobox
                  control={control}
                  name="productionHouseId"
                  productionHouses={productionHouses}
                  error={errors.productionHouseId}
                  disabled={isPending || isCreatingProductionHouse}
                  onCreateNew={handleCreateProductionHouse}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  {...register("description")}
                  rows={4}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all resize-none"
                  placeholder="Enter show description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    {...register("startDate")}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    {...register("endDate")}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  {...register("status")}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                >
                  <option value="Pre-Production">Pre-Production</option>
                  <option value="Shooting">Shooting</option>
                  <option value="Wrapped">Wrapped</option>
                </select>
              </div>
            </div>

            {/* Invite Production Admin Section */}
            <div className="border-t border-gray-800 pt-6">
              <div className="flex items-center gap-3 mb-4">
                <input
                  id="inviteAdmin"
                  type="checkbox"
                  {...register("inviteAdmin")}
                  className="w-4 h-4 text-cinematic-gold-500 bg-gray-800 border-gray-700 rounded focus:ring-cinematic-gold-500 focus:ring-2"
                />
                <label htmlFor="inviteAdmin" className="text-lg font-semibold text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Invite Production Admin
                </label>
              </div>

              {inviteAdmin && (
                <div className="space-y-4 pl-7">
                  <p className="text-sm text-gray-400 mb-4">
                    Invite a production admin to manage this show
                  </p>

                  <div>
                    <label htmlFor="adminName" className="block text-sm font-medium text-gray-300 mb-2">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="adminName"
                      type="text"
                      {...register("adminName")}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                      placeholder="John Doe"
                    />
                    {errors.adminName && (
                      <p className="mt-2 text-sm text-red-400">{errors.adminName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="adminEmail"
                      type="email"
                      {...register("adminEmail")}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                      placeholder="john@example.com"
                    />
                    {errors.adminEmail && (
                      <p className="mt-2 text-sm text-red-400">{errors.adminEmail.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="adminPhone" className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number (Optional)
                    </label>
                    <input
                      id="adminPhone"
                      type="tel"
                      {...register("adminPhone")}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label htmlFor="adminRoleId" className="block text-sm font-medium text-gray-300 mb-2">
                      Role <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="adminRoleId"
                      {...register("adminRoleId")}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select a role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                          {role.isSystemRole ? " (System)" : " (Custom)"}
                          {role.description ? ` - ${role.description}` : ""}
                        </option>
                      ))}
                    </select>
                    {errors.adminRoleId && (
                      <p className="mt-2 text-sm text-red-400">{errors.adminRoleId.message}</p>
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
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-6 border-t border-gray-800">
              <button
                type="button"
                onClick={() => navigate({ to: "/shows" })}
                className="flex-1 px-6 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-6 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-950"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Clapperboard className="h-5 w-5" />
                    Create Show
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
