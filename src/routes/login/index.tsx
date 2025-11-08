import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { AuthLayout } from "~/components/AuthLayout";
import { LogIn, AlertCircle } from "lucide-react";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";

export const Route = createFileRoute("/login/")({
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation(
    trpc.login.mutationOptions({
      onSuccess: (data) => {
        setAuth(data.token, data.user);
        navigate({ to: "/dashboard" });
      },
    })
  );

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <AuthLayout
      title="Call Sheet"
      subtitle="Professional production management for film and video teams"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {loginMutation.error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-2">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">
                  {getUserFriendlyError(loginMutation.error).message}
                </p>
              </div>
            </div>
            {getUserFriendlyError(loginMutation.error).recoverySuggestions && (
              <div className="ml-8 mt-3">
                <p className="text-xs font-medium text-red-300 mb-2">
                  {getUserFriendlyError(loginMutation.error).recoveryTitle}
                </p>
                <ul className="space-y-1">
                  {getUserFriendlyError(loginMutation.error).recoverySuggestions!.map((suggestion, index) => (
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
            autoComplete="email"
            {...register("email")}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
            placeholder="your@email.com"
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
            autoComplete="current-password"
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

        <div className="flex items-center justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-cinematic-gold-400 hover:text-cinematic-gold-300 font-medium transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cinematic-gold-500/20 flex items-center justify-center gap-2"
        >
          {loginMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-950"></div>
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              Sign In
            </>
          )}
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-cinematic-gold-400 hover:text-cinematic-gold-300 font-medium transition-colors"
            >
              Register here
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
