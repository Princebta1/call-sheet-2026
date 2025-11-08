import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { AuthLayout } from "~/components/AuthLayout";
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";

export const Route = createFileRoute("/forgot-password/")({
  component: ForgotPasswordPage,
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const requestResetMutation = useMutation(
    trpc.requestPasswordReset.mutationOptions({
      onSuccess: () => {
        setIsSuccess(true);
      },
    })
  );

  const onSubmit = (data: ForgotPasswordForm) => {
    requestResetMutation.mutate(data);
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email to receive a password reset link"
    >
      {isSuccess ? (
        <div className="space-y-6">
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-400 mb-1">
                  Check Your Email
                </p>
                <p className="text-sm text-green-300">
                  If an account with that email exists, we've sent you a password reset link. Please check your inbox and follow the instructions.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-400">
              <strong>Note:</strong> The reset link will expire in 1 hour. If you don't receive an email within a few minutes, please check your spam folder.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate({ to: "/login" })}
              className="w-full bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all shadow-lg shadow-cinematic-gold-500/20 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Login
            </button>
            
            <button
              onClick={() => setIsSuccess(false)}
              className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              Didn't receive the email? Try again
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {requestResetMutation.error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400">
                    {getUserFriendlyError(requestResetMutation.error).message}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-400">
                  Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>
              </div>
            </div>
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
              autoComplete="email"
              {...register("email")}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={requestResetMutation.isPending}
            className="w-full bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cinematic-gold-500/20 flex items-center justify-center gap-2"
          >
            {requestResetMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-950"></div>
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-5 w-5" />
                Send Reset Link
              </>
            )}
          </button>

          <div className="text-center space-y-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-cinematic-gold-400 hover:text-cinematic-gold-300 font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
