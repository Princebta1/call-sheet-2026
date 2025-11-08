import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "~/components/DashboardLayout";
import { Settings, Building2, User, Save, Loader2, Mail, Send, Users, Shield, Lock, Eye, EyeOff, Upload, Camera, Bell, MessageSquare, Copy } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Switch } from "@headlessui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";
import { RecipientGroupModal } from "~/components/RecipientGroupModal";
import { RoleFormModal } from "~/components/RoleFormModal";
import { RoleTemplateSelector } from "~/components/RoleTemplateSelector";
import { UserRoleAssignmentTable } from "~/components/UserRoleAssignmentTable";
import { PermissionMatrixView } from "~/components/PermissionMatrixView";
import { usePermissions } from "~/hooks/usePermissions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
});

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
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

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

function SettingsPage() {
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<"company" | "profile" | "recipient-groups" | "user-roles" | "custom-roles" | "permission-matrix">(
    permissions.isDeveloper() ? "company" : "profile"
  );

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
                <Settings className="h-6 w-6 text-cinematic-gold-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Settings</h1>
            </div>
            <p className="text-gray-400">
              Manage your company and profile settings
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-800">
            {permissions.isDeveloper() && (
              <button
                onClick={() => setActiveTab("company")}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                  activeTab === "company"
                    ? "text-cinematic-gold-400 border-b-2 border-cinematic-gold-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                <Building2 className="h-4 w-4" />
                Company Settings
              </button>
            )}
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                activeTab === "profile"
                  ? "text-cinematic-gold-400 border-b-2 border-cinematic-gold-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <User className="h-4 w-4" />
              User Profile
            </button>
            <button
              onClick={() => setActiveTab("recipient-groups")}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                activeTab === "recipient-groups"
                  ? "text-cinematic-gold-400 border-b-2 border-cinematic-gold-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <Mail className="h-4 w-4" />
              Recipient Groups
            </button>
            <button
              onClick={() => setActiveTab("user-roles")}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                activeTab === "user-roles"
                  ? "text-cinematic-gold-400 border-b-2 border-cinematic-gold-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <Users className="h-4 w-4" />
              User Roles
            </button>
            <button
              onClick={() => setActiveTab("custom-roles")}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                activeTab === "custom-roles"
                  ? "text-cinematic-gold-400 border-b-2 border-cinematic-gold-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <Shield className="h-4 w-4" />
              Custom Roles
            </button>
            <button
              onClick={() => setActiveTab("permission-matrix")}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                activeTab === "permission-matrix"
                  ? "text-cinematic-gold-400 border-b-2 border-cinematic-gold-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <Shield className="h-4 w-4" />
              Permission Matrix
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "company" && permissions.isDeveloper() ? (
            <CompanySettings />
          ) : activeTab === "profile" ? (
            <ProfileSettings />
          ) : activeTab === "recipient-groups" ? (
            <RecipientGroupsSettings />
          ) : activeTab === "user-roles" ? (
            <UserRolesSettings />
          ) : activeTab === "permission-matrix" ? (
            <PermissionMatrixSettings />
          ) : (
            <CustomRolesSettings />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function TestEmailButton({ fromEmail, setFromEmail }: { fromEmail: string | null; setFromEmail: (email: string) => void }) {
  const trpc = useTRPC();
  const { token, user } = useAuthStore();

  const sendTestEmailMutation = useMutation(
    trpc.sendTestReportEmail.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          setFromEmail(data.fromEmail);
          toast.success(
            <div>
              <div className="font-semibold">Test email sent!</div>
              <div className="text-sm">Check {data.recipient} for the email</div>
            </div>,
            { duration: 5000 }
          );
        } else {
          toast.error(data.message);
        }
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const handleSendTest = () => {
    if (!token) {
      toast.error("You must be logged in to send a test email");
      return;
    }
    sendTestEmailMutation.mutate({ token });
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800/30 border border-gray-700 rounded-lg">
      <div>
        <p className="text-sm font-medium text-gray-300 mb-1">
          Send Test Report Email
        </p>
        <p className="text-xs text-gray-500">
          A sample production report will be sent to {user?.email}
        </p>
      </div>
      <button
        onClick={handleSendTest}
        disabled={sendTestEmailMutation.isPending}
        className="inline-flex items-center gap-2 px-4 py-2 bg-cinematic-blue-500 text-white rounded-lg hover:bg-cinematic-blue-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sendTestEmailMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send Test
          </>
        )}
      </button>
    </div>
  );
}

function CompanySettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user, setUser } = useAuthStore();
  const permissions = usePermissions();

  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [companyEmail, setCompanyEmail] = useState(user?.companyEmail || "");
  const [fromEmail, setFromEmail] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<"Basic" | "Pro" | "Enterprise">(
    (user?.subscriptionTier as "Basic" | "Pro" | "Enterprise") || "Basic"
  );

  useEffect(() => {
    if (user) {
      setCompanyName(user.companyName || "");
      setCompanyEmail(user.companyEmail || "");
      setSubscriptionTier((user.subscriptionTier as "Basic" | "Pro" | "Enterprise") || "Basic");
    }
  }, [user?.companyName, user?.companyEmail, user?.subscriptionTier]);

  const updateCompanyMutation = useMutation(
    trpc.updateCompanySettings.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.getCurrentUser.queryKey(),
        });
        // Update the user in the auth store
        if (user) {
          setUser({
            ...user,
            companyName: data.name,
            companyEmail: data.email,
            subscriptionTier: data.subscriptionTier,
          });
        }
        toast.success("Company settings updated successfully!");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyMutation.mutate({
      token: token || "",
      name: companyName,
      email: companyEmail,
      subscriptionTier: subscriptionTier,
    });
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Company Name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            disabled={updateCompanyMutation.isPending}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Company Email
          </label>
          <input
            type="email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            required
            disabled={updateCompanyMutation.isPending}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>

        {permissions.canManageCompany() ? (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subscription Tier
            </label>
            <select
              value={subscriptionTier}
              onChange={(e) => setSubscriptionTier(e.target.value as "Basic" | "Pro" | "Enterprise")}
              disabled={updateCompanyMutation.isPending}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
            >
              <option value="Basic">Basic</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Select the subscription tier for this company
            </p>
          </div>
        ) : (
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">
                Subscription Tier
              </span>
              <span className="px-3 py-1 bg-cinematic-gold-500/20 text-cinematic-gold-400 rounded-full text-xs font-medium">
                {user?.subscriptionTier || "Basic"}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Contact support to upgrade your subscription
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateCompanyMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateCompanyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Email Configuration Section */}
      <div className="mt-6 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
            <Mail className="h-5 w-5 text-cinematic-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Email Configuration
            </h3>
            <p className="text-sm text-gray-400">
              Test your production report email integration
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-300 block mb-1">
                  Sender Email Address
                </span>
                <span className="text-xs text-gray-500">
                  Configured in environment variables
                </span>
              </div>
              <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm font-mono">
                {fromEmail || "Not yet tested"}
              </span>
            </div>
          </div>

          <TestEmailButton fromEmail={fromEmail} setFromEmail={setFromEmail} />
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.profileImage || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(user?.receiveEmailNotifications ?? true);
  const [smsNotifications, setSmsNotifications] = useState(user?.receiveSmsNotifications ?? false);
  
  // Password change form state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const updateProfileMutation = useMutation(
    trpc.updateUserProfile.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.getCurrentUser.queryKey(),
        });
        // Update the user in the auth store
        if (user) {
          setUser({
            ...user,
            name: data.name,
            email: data.email,
            phone: data.phone,
            profileImage: data.profileImage,
            receiveEmailNotifications: data.receiveEmailNotifications,
            receiveSmsNotifications: data.receiveSmsNotifications,
          });
        }
        toast.success("Profile updated successfully!");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const changePasswordMutation = useMutation(
    trpc.changePassword.mutationOptions({
      onSuccess: () => {
        toast.success("Password changed successfully!");
        resetPasswordForm();
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const generateUploadUrlMutation = useMutation(
    trpc.generateAvatarUploadUrl.mutationOptions({
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
        setIsUploadingAvatar(false);
      },
    })
  );

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Get file extension
      const extension = file.name.substring(file.name.lastIndexOf("."));
      
      // Generate presigned URL
      const { presignedUrl, publicUrl } = await generateUploadUrlMutation.mutateAsync({
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

      // Update preview
      setAvatarPreview(publicUrl);

      // Update user profile with new avatar URL
      await updateProfileMutation.mutateAsync({
        token: token || "",
        profileImage: publicUrl,
      });

      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      token: token || "",
      name,
      email,
      phone: phone || undefined,
      statusMessage: statusMessage || undefined,
    });
  };

  const handleSaveNotifications = () => {
    updateProfileMutation.mutate({
      token: token || "",
      receiveEmailNotifications: emailNotifications,
      receiveSmsNotifications: smsNotifications,
    });
  };

  const onPasswordSubmit = (data: PasswordChangeForm) => {
    changePasswordMutation.mutate({
      token: token || "",
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  return (
    <div className="space-y-6">
      {/* Avatar Upload Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
            <Camera className="h-5 w-5 text-cinematic-gold-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Profile Picture</h3>
            <p className="text-sm text-gray-400">
              Upload a photo to personalize your profile
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Avatar Preview */}
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-700"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-cinematic-blue-500 to-cinematic-blue-600 rounded-full flex items-center justify-center border-4 border-gray-700">
                <span className="text-3xl font-bold text-white">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cinematic-gold-500/20 text-cinematic-gold-400 border border-cinematic-gold-500/30 rounded-lg hover:bg-cinematic-gold-500/30 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4" />
              {isUploadingAvatar ? "Uploading..." : "Upload Photo"}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              JPG, PNG, GIF or WebP. Max size 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Information Form */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={updateProfileMutation.isPending}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={updateProfileMutation.isPending}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              disabled={updateProfileMutation.isPending}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status Message
            </label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="What are you working on?"
              maxLength={100}
              disabled={updateProfileMutation.isPending}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-2">
              Let your team know what you're up to (max 100 characters)
            </p>
          </div>

          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Role</span>
              <span className="px-3 py-1 bg-cinematic-blue-500/20 text-cinematic-blue-400 rounded-full text-xs font-medium">
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Contact your admin to change your role
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
            <Bell className="h-5 w-5 text-cinematic-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Notification Preferences</h3>
            <p className="text-sm text-gray-400">
              Choose how you want to receive updates
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
                <Mail className="h-5 w-5 text-cinematic-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">Email Notifications</p>
                <p className="text-xs text-gray-500">
                  Receive production reports and updates via email
                </p>
              </div>
            </div>
            <Switch
              checked={emailNotifications}
              onChange={setEmailNotifications}
              className={`${
                emailNotifications ? "bg-cinematic-gold-500" : "bg-gray-700"
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:ring-offset-2 focus:ring-offset-gray-900`}
            >
              <span
                className={`${
                  emailNotifications ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">SMS Notifications</p>
                <p className="text-xs text-gray-500">
                  Receive urgent updates via text message
                </p>
              </div>
            </div>
            <Switch
              checked={smsNotifications}
              onChange={setSmsNotifications}
              className={`${
                smsNotifications ? "bg-cinematic-gold-500" : "bg-gray-700"
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:ring-offset-2 focus:ring-offset-gray-900`}
            >
              <span
                className={`${
                  smsNotifications ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400">
              <strong>Note:</strong> SMS notifications are currently in beta. You'll need to verify your phone number to receive text updates.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveNotifications}
              disabled={updateProfileMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cinematic-blue-500 to-cinematic-blue-600 text-white rounded-lg hover:from-cinematic-blue-600 hover:to-cinematic-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Form */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Lock className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Change Password</h3>
            <p className="text-sm text-gray-400">
              Update your password to keep your account secure
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                {...registerPassword("currentPassword")}
                disabled={changePasswordMutation.isPending}
                className="w-full px-4 py-2.5 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p className="mt-2 text-sm text-red-400">
                {passwordErrors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                {...registerPassword("newPassword")}
                disabled={changePasswordMutation.isPending}
                className="w-full px-4 py-2.5 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
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
            {passwordErrors.newPassword && (
              <p className="mt-2 text-sm text-red-400">
                {passwordErrors.newPassword.message}
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

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                {...registerPassword("confirmPassword")}
                disabled={changePasswordMutation.isPending}
                className="w-full px-4 py-2.5 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
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
            {passwordErrors.confirmPassword && (
              <p className="mt-2 text-sm text-red-400">
                {passwordErrors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Security Notice */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-400">
              <strong>Security Tip:</strong> Use a strong, unique password that you don't use for other accounts. Consider using a password manager.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecipientGroupsSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<any>(null);

  const groupsQuery = useQuery(
    trpc.getRecipientGroups.queryOptions({ token: token || "" })
  );

  const deleteMutation = useMutation(
    trpc.deleteRecipientGroup.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getRecipientGroups.queryKey(),
        });
        toast.success("Recipient group deleted successfully!");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const groups = groupsQuery.data || [];
  const canManage = user?.role === "Admin" || user?.role === "Developer";

  const handleEdit = (group: any) => {
    setGroupToEdit(group);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setGroupToEdit(null);
    setIsModalOpen(true);
  };

  const handleDelete = (groupId: number, groupName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the "${groupName}" group? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate({ token: token || "", groupId });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setGroupToEdit(null);
  };

  if (!canManage) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
            <Mail className="h-8 w-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Admin Access Required
          </h3>
          <p className="text-gray-400 text-sm">
            Only administrators can manage recipient groups
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Email Recipient Groups
            </h3>
            <p className="text-sm text-gray-400">
              Create groups to organize who receives production reports
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cinematic-blue-500 to-cinematic-blue-600 text-white rounded-lg hover:from-cinematic-blue-600 hover:to-cinematic-blue-700 transition-all font-medium"
          >
            <Users className="h-4 w-4" />
            New Group
          </button>
        </div>

        {groupsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-cinematic-blue-500/20 rounded-2xl mb-4">
              <Users className="h-8 w-8 text-cinematic-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No Recipient Groups Yet
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Create groups like "Producers", "Directors", or "Studio
              Executives" to organize report recipients
            </p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cinematic-blue-500 to-cinematic-blue-600 text-white rounded-lg hover:from-cinematic-blue-600 hover:to-cinematic-blue-700 transition-all font-medium"
            >
              <Users className="h-4 w-4" />
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group: any) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-base font-semibold text-white">
                      {group.name}
                    </h4>
                    <span className="px-2 py-0.5 text-xs bg-cinematic-blue-500/20 text-cinematic-blue-400 rounded">
                      {group.memberCount} member
                      {group.memberCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {group.description && (
                    <p className="text-sm text-gray-400 truncate">
                      {group.description}
                    </p>
                  )}
                  {group.members.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 3).map((member: any) => (
                          <div
                            key={member.id}
                            className="w-7 h-7 rounded-full bg-gradient-to-br from-cinematic-gold-500 to-cinematic-gold-600 flex items-center justify-center text-xs font-semibold text-gray-950 border-2 border-gray-800"
                            title={member.name}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                      {group.memberCount > 3 && (
                        <span className="text-xs text-gray-500">
                          +{group.memberCount - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(group)}
                    className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(group.id, group.name)}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RecipientGroupModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        groupToEdit={groupToEdit}
      />
    </>
  );
}

function UserRolesSettings() {
  const permissions = usePermissions();
  const canManage = permissions.canManageTeam();

  if (!canManage) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
            <Users className="h-8 w-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Admin Access Required
          </h3>
          <p className="text-gray-400 text-sm">
            Only administrators can manage user role assignments
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">
          User Role Assignment
        </h3>
        <p className="text-sm text-gray-400">
          Assign roles to users to control their access and permissions
        </p>
      </div>
      
      <UserRoleAssignmentTable />
    </div>
  );
}

function CustomRolesSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const permissions = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const permissionsQuery = useQuery(
    trpc.getPermissions.queryOptions({ token: token || "" })
  );

  const rolesQuery = useQuery(
    trpc.getRoles.queryOptions({ token: token || "" })
  );

  const templatesQuery = useQuery(
    trpc.getRoleTemplates.queryOptions({ token: token || "" })
  );

  const createMutation = useMutation(
    trpc.createRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getRoles.queryKey(),
        });
        toast.success("Custom role created successfully!");
        setIsModalOpen(false);
        setSelectedTemplate(null);
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const updateMutation = useMutation(
    trpc.updateRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getRoles.queryKey(),
        });
        toast.success("Role updated successfully!");
        setIsModalOpen(false);
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.deleteRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getRoles.queryKey(),
        });
        toast.success("Role deleted successfully!");
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const cloneMutation = useMutation(
    trpc.cloneRole.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.getRoles.queryKey(),
        });
        toast.success(`Role "${data.role.name}" created successfully!`);
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const roles = rolesQuery.data || [];
  const permissionsData = permissionsQuery.data;
  const templates = templatesQuery.data?.templates || [];
  const categories = templatesQuery.data?.categories || [];
  const canManage = permissions.canManageRoles();

  const handleCreate = () => {
    setRoleToEdit(null);
    setSelectedTemplate(null);
    setIsModalOpen(true);
  };

  const handleUseTemplate = () => {
    setIsTemplateModalOpen(true);
  };

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setRoleToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (role: any) => {
    setRoleToEdit(role);
    setSelectedTemplate(null);
    setIsModalOpen(true);
  };

  const handleClone = (roleId: number, roleName: string) => {
    if (window.confirm(`Create a copy of "${roleName}"?`)) {
      cloneMutation.mutate({ token: token || "", roleId });
    }
  };

  const handleDelete = (roleId: number, roleName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the "${roleName}" role? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate({ token: token || "", roleId });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setRoleToEdit(null);
    setSelectedTemplate(null);
  };

  const handleSubmit = async (data: { name: string; description?: string; permissionIds: number[] }) => {
    if (roleToEdit) {
      await updateMutation.mutateAsync({
        token: token || "",
        roleId: roleToEdit.id,
        name: data.name,
        description: data.description,
        permissionIds: data.permissionIds,
      });
    } else {
      await createMutation.mutateAsync({
        token: token || "",
        name: data.name,
        description: data.description,
        permissionIds: data.permissionIds,
      });
    }
  };

  // Convert template permission names to permission IDs
  const getTemplatePermissionIds = (template: any) => {
    if (!permissionsData) return [];
    return permissionsData.permissions
      .filter((p: any) => template.recommendedPermissions.includes(p.name))
      .map((p: any) => p.id);
  };

  if (!canManage) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
            <Shield className="h-8 w-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Admin Access Required
          </h3>
          <p className="text-gray-400 text-sm">
            Only administrators can manage custom roles
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Role Management
            </h3>
            <p className="text-sm text-gray-400">
              Create custom roles with specific permission combinations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUseTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cinematic-blue-500 text-white rounded-lg hover:bg-cinematic-blue-600 transition-all font-medium"
            >
              <Shield className="h-4 w-4" />
              Use Template
            </button>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-medium"
            >
              <Shield className="h-4 w-4" />
              Create Role
            </button>
          </div>
        </div>

        {rolesQuery.isLoading || permissionsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-cinematic-gold-500/20 rounded-2xl mb-4">
              <Shield className="h-8 w-8 text-cinematic-gold-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No Custom Roles Yet
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Create custom roles to give team members specific permission combinations
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleUseTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cinematic-blue-500 text-white rounded-lg hover:bg-cinematic-blue-600 transition-all font-medium"
              >
                <Shield className="h-4 w-4" />
                Use Template
              </button>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-medium"
              >
                <Shield className="h-4 w-4" />
                Create From Scratch
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map((role: any) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-base font-semibold text-white">
                      {role.name}
                    </h4>
                    {role.isSystemRole && (
                      <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                        System Role
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-xs bg-cinematic-gold-500/20 text-cinematic-gold-400 rounded">
                      {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                      {role.userCount} user{role.userCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {role.description && (
                    <p className="text-sm text-gray-400 mb-2">
                      {role.description}
                    </p>
                  )}
                  {role.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissions.slice(0, 5).map((perm: any) => (
                        <span
                          key={perm.id}
                          className="px-2 py-0.5 text-xs bg-gray-700/50 text-gray-400 rounded"
                        >
                          {perm.displayName}
                        </span>
                      ))}
                      {role.permissions.length > 5 && (
                        <span className="px-2 py-0.5 text-xs text-gray-500">
                          +{role.permissions.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleClone(role.id, role.name)}
                    disabled={cloneMutation.isPending}
                    className="px-3 py-1.5 text-sm bg-cinematic-blue-500/20 text-cinematic-blue-400 rounded hover:bg-cinematic-blue-500/30 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    title="Clone this role"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Clone
                  </button>
                  <button
                    onClick={() => handleEdit(role)}
                    className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  >
                    {role.isSystemRole ? "View" : "Edit"}
                  </button>
                  {!role.isSystemRole && (
                    <button
                      onClick={() => handleDelete(role.id, role.name)}
                      disabled={deleteMutation.isPending || role.userCount > 0}
                      className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={role.userCount > 0 ? "Cannot delete role with assigned users" : ""}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {permissionsData && (
        <RoleFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          roleToEdit={roleToEdit}
          permissions={permissionsData.permissions}
          groupedPermissions={permissionsData.groupedPermissions}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
          templateData={
            selectedTemplate
              ? {
                  name: selectedTemplate.name,
                  description: selectedTemplate.description,
                  permissionIds: getTemplatePermissionIds(selectedTemplate),
                }
              : undefined
          }
        />
      )}

      <RoleTemplateSelector
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        categories={categories}
        onSelectTemplate={handleSelectTemplate}
      />
    </>
  );
}

function PermissionMatrixSettings() {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const permissions = usePermissions();

  const permissionsQuery = useQuery(
    trpc.getPermissions.queryOptions({ token: token || "" })
  );

  const rolesQuery = useQuery(
    trpc.getRoles.queryOptions({ token: token || "" })
  );

  const roles = rolesQuery.data || [];
  const permissionsData = permissionsQuery.data;
  const canView = permissions.canManageRoles() || permissions.isDeveloper() || permissions.isAdmin();

  if (!canView) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
            <Shield className="h-8 w-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Admin Access Required
          </h3>
          <p className="text-gray-400 text-sm">
            Only administrators can view the permission matrix
          </p>
        </div>
      </div>
    );
  }

  if (permissionsQuery.isLoading || rolesQuery.isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (permissionsQuery.error || rolesQuery.error) {
    const error = permissionsQuery.error || rolesQuery.error;
    const errorInfo = getUserFriendlyError(error);
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-1">Error Loading Data</h3>
              <p className="text-sm text-red-300">{errorInfo.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!permissionsData) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">
          Permission Matrix
        </h3>
        <p className="text-sm text-gray-400">
          View all roles and their associated permissions in a comprehensive matrix
        </p>
      </div>

      <PermissionMatrixView
        roles={roles}
        permissions={permissionsData.permissions}
        groupedPermissions={permissionsData.groupedPermissions}
      />
    </div>
  );
}
