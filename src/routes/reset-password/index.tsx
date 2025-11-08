import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { AuthLayout } from "~/components/AuthLayout";
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";

export const Route = createFileRoute("/reset-password/")({
  component: ResetPasswordPage,
  validateSearch: z.object({
    token: z.string().optional(),
  }),
});

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const search = useSearch({ from: "/reset-password/" });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const resetPasswordMutation = useMutation(
    trpc.resetPassword.mutationOptions({
      onSuccess: () => {
        setIsSuccess(true);
      },
    })
  );

  const onSubmit = (data: ResetPasswordForm) => {
    if (!search.token) {
      return;
    }
    resetPasswordMutation.mutate({
      token: search.token,
      newPassword: data.newPassword,
    });
  };

  // Check if token is present
  if (!search.token) {
    return (
      <AuthLayout title="Reset Password" subtitle="Set your new password">
        <div className="space-y-6">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400 mb-1">
                  Invalid Reset Link
                </p>
                <p className="text-sm text-red-300">
                  This password reset link is invalid or missing. Please request a new password reset.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate({ to: "/forgot-password" })}
            className="w-full bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all shadow-lg shadow-cinematic-gold-500/20"
          >
            Request New Reset Link
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Set your new password">
      {isSuccess ? (
        <div className="space-y-6">
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-400 mb-1">
                  Password Reset Successfully
                </p>
                <p className="text-sm text-green-300">
                  Your password has been reset. You can now log in with your new password.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate({ to: "/login" })}
            className="w-full bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all shadow-lg shadow-cinematic-gold-500/20 flex items-center justify-center gap-2"
          >
            <Lock className="h-5 w-5" />
            Go to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {resetPasswordMutation.error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400">
                    {getUserFriendlyError(resetPasswordMutation.error).message}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                {...register("newPassword")}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 pr-10 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                placeholder="Enter your new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showNewPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-2 text-sm text-red-400">
                {errors.newPassword.message}
              </p>
            )}
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p>Password must contain:</p>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
                <li>One special character (@$!%*?&)</li>
              </ul>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                {...register("confirmPassword")}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 pr-10 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-400">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={resetPasswordMutation.isPending}
            className="w-full bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cinematic-gold-500/20 flex items-center justify-center gap-2"
          >
            {resetPasswordMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-950"></div>
                Resetting Password...
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                Reset Password
              </>
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
