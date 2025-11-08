import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { AuthLayout } from "~/components/AuthLayout";
import { UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { getUserFriendlyError } from "~/utils/errorMessages";
import { ProductionHouseCombobox } from "~/components/ProductionHouseCombobox";
import { useState } from "react";

export const Route = createFileRoute("/register/")({
  component: RegisterPage,
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  productionHouseId: z.number().optional(),
  productionHouseName: z.string().optional(),
  role: z.enum(["Admin", "Actor", "Crew"], {
    required_error: "Please select your role",
  }),
}).refine(
  (data) => data.productionHouseId !== undefined || (data.productionHouseName && data.productionHouseName.trim().length > 0),
  {
    message: "Please select a production house or enter a new one",
    path: ["productionHouseId"],
  }
);

type RegisterForm = z.infer<typeof registerSchema>;

function RegisterPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProductionHouseName, setNewProductionHouseName] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  // Fetch all production houses for selection
  const productionHousesQuery = useQuery({
    queryKey: ["publicProductionHouses"],
    queryFn: async () => {
      const result = await trpc.getPublicProductionHouses.query({});
      return result;
    },
    retry: false,
  });

  const registerMutation = useMutation(
    trpc.register.mutationOptions({
      onSuccess: (data) => {
        if (!data.needsApproval) {
          setAuth(data.token, data.user);
          navigate({ to: "/dashboard" });
        }
      },
    })
  );

  const onSubmit = (data: RegisterForm) => {
    // When creating new, use the newProductionHouseName state
    // When selecting existing, use the productionHouseId from form
    const submitData = isCreatingNew
      ? {
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          productionHouseName: newProductionHouseName,
          role: data.role,
        }
      : {
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          productionHouseId: data.productionHouseId,
          role: data.role,
        };
    
    registerMutation.mutate(submitData as any);
  };

  if (registerMutation.isSuccess && registerMutation.data.needsApproval) {
    return (
      <AuthLayout title="Registration Pending">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-cinematic-emerald-500/20 p-4 rounded-full">
              <CheckCircle className="h-12 w-12 text-cinematic-emerald-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-100">
              Registration Successful!
            </h3>
            <p className="text-gray-400">
              Your account has been created and is pending approval from your
              company administrator. You'll receive an email once your account
              is activated.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-block text-cinematic-gold-400 hover:text-cinematic-gold-300 font-medium transition-colors"
          >
            Return to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join your production team or start a new company"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {registerMutation.error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-2">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">
                  {getUserFriendlyError(registerMutation.error).message}
                </p>
              </div>
            </div>
            {getUserFriendlyError(registerMutation.error).recoverySuggestions && (
              <div className="ml-8 mt-3">
                <p className="text-xs font-medium text-red-300 mb-2">
                  {getUserFriendlyError(registerMutation.error).recoveryTitle}
                </p>
                <ul className="space-y-1">
                  {getUserFriendlyError(registerMutation.error).recoverySuggestions!.map((suggestion, index) => (
                    <li key={index} className="text-xs text-red-300 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Personal Information
          </h3>
          
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-2 text-sm text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Phone Number (Optional)
            </label>
            <input
              id="phone"
              type="tel"
              {...register("phone")}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        {/* Company Information */}
        <div className="space-y-4 pt-4 border-t border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Company Information
          </h3>

          <div>
            <label
              htmlFor="productionHouse"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Production House <span className="text-red-400">*</span>
            </label>
            {isCreatingNew ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-800/30 rounded-lg px-4 py-2 border border-gray-700">
                  <CheckCircle className="h-4 w-4 text-cinematic-emerald-400" />
                  <span>Creating new production house: <span className="font-medium text-gray-200">{newProductionHouseName}</span></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setNewProductionHouseName("");
                  }}
                  className="text-sm text-cinematic-gold-400 hover:text-cinematic-gold-300 transition-colors"
                >
                  Choose existing instead
                </button>
              </div>
            ) : (
              <ProductionHouseCombobox
                control={control}
                name="productionHouseId"
                productionHouses={productionHousesQuery.data || []}
                error={errors.productionHouseId}
                disabled={registerMutation.isPending || productionHousesQuery.isLoading}
                onCreateNew={(name) => {
                  setIsCreatingNew(true);
                  setNewProductionHouseName(name);
                }}
              />
            )}
          </div>

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Your Role <span className="text-red-400">*</span>
            </label>
            <select
              id="role"
              {...register("role")}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
            >
              <option value="">Select your role</option>
              <option value="Admin">Admin</option>
              <option value="Actor">Actor</option>
              <option value="Crew">Crew</option>
            </select>
            {errors.role && (
              <p className="mt-2 text-sm text-red-400">{errors.role.message}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cinematic-gold-500/20 flex items-center justify-center gap-2"
        >
          {registerMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-950"></div>
              Creating Account...
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5" />
              Create Account
            </>
          )}
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-cinematic-gold-400 hover:text-cinematic-gold-300 font-medium transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
