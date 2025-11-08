import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { DashboardLayout } from "~/components/DashboardLayout";
import { SystemHealthCard } from "~/components/SystemHealthCard";
import { UsageStatisticsCard } from "~/components/UsageStatisticsCard";
import { CreateCompanyModal } from "~/components/CreateCompanyModal";
import {
  Settings,
  Users,
  Building2,
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Clapperboard,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

export const Route = createFileRoute("/developer-dashboard/")({
  component: DeveloperDashboardPage,
});

function DeveloperDashboardPage() {
  const trpc = useTRPC();
  const { token, user } = useAuthStore();
  const permissions = usePermissions();
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedShowForRejection, setSelectedShowForRejection] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Check if user is a developer
  if (!permissions.isDeveloper()) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Access Denied
            </h1>
            <p className="text-gray-400 mb-6">
              This dashboard is only accessible to developer users.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-semibold"
            >
              Go to Main Dashboard
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const systemHealthQuery = useQuery(
    trpc.getSystemHealth.queryOptions({ token: token || "" })
  );

  const usageStatsQuery = useQuery(
    trpc.getUsageStatistics.queryOptions({ token: token || "" })
  );

  const companiesQuery = useQuery(
    trpc.getAllCompanies.queryOptions({ token: token || "" })
  );

  const pendingShowsQuery = useQuery(
    trpc.getPendingShows.queryOptions({ token: token || "" })
  );

  const approveMutation = useMutation(
    trpc.approveShow.mutationOptions({
      onSuccess: () => {
        pendingShowsQuery.refetch();
        toast.success("Show approved successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to approve show");
      },
    })
  );

  const rejectMutation = useMutation(
    trpc.rejectShow.mutationOptions({
      onSuccess: () => {
        pendingShowsQuery.refetch();
        setIsRejectModalOpen(false);
        setSelectedShowForRejection(null);
        setRejectionReason("");
        toast.success("Show rejected");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reject show");
      },
    })
  );

  const createCompanyMutation = useMutation(
    trpc.createCompanyAndAdmin.mutationOptions({
      onSuccess: () => {
        // Invalidate the companies query to refresh the list
        companiesQuery.refetch();
        setIsCreateCompanyModalOpen(false);
        toast.success("Company created successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create company");
      },
    })
  );

  const handleCreateCompany = async (data: {
    companyName: string;
    companyEmail: string;
    subscriptionTier: "Basic" | "Pro" | "Enterprise";
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    adminPhone?: string;
  }) => {
    await createCompanyMutation.mutateAsync({
      token: token || "",
      company: {
        name: data.companyName,
        email: data.companyEmail,
        subscriptionTier: data.subscriptionTier,
      },
      admin: {
        name: data.adminName,
        email: data.adminEmail,
        password: data.adminPassword,
        phone: data.adminPhone,
      },
    });
  };

  const handleApprove = (showId: number) => {
    if (window.confirm("Are you sure you want to approve this show?")) {
      approveMutation.mutate({ token: token || "", showId });
    }
  };

  const handleRejectClick = (showId: number) => {
    setSelectedShowForRejection(showId);
    setIsRejectModalOpen(true);
  };

  const handleRejectSubmit = () => {
    if (selectedShowForRejection) {
      rejectMutation.mutate({
        token: token || "",
        showId: selectedShowForRejection,
        reason: rejectionReason || undefined,
      });
    }
  };

  const isLoading =
    systemHealthQuery.isLoading ||
    usageStatsQuery.isLoading ||
    companiesQuery.isLoading ||
    pendingShowsQuery.isLoading;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
              <Settings className="h-6 w-6 text-cinematic-gold-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Developer Dashboard
            </h1>
          </div>
          <p className="text-gray-400">
            System administration and monitoring
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-12 w-12 animate-spin text-cinematic-gold-500" />
          </div>
        ) : (
          <>
            {/* System Health and Usage Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {systemHealthQuery.data && (
                <SystemHealthCard health={systemHealthQuery.data} />
              )}
              {usageStatsQuery.data && (
                <UsageStatisticsCard statistics={usageStatsQuery.data} />
              )}
            </div>

            {/* Pending Shows Section */}
            {pendingShowsQuery.data && pendingShowsQuery.data.length > 0 && (
              <div className="bg-gradient-to-br from-amber-900/20 to-amber-900/5 border border-amber-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Pending Show Approvals
                    </h2>
                    <p className="text-sm text-amber-400">
                      {pendingShowsQuery.data.length} show{pendingShowsQuery.data.length !== 1 ? "s" : ""} awaiting your approval
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {pendingShowsQuery.data.map((show) => (
                    <PendingShowCard
                      key={show.id}
                      show={show}
                      onApprove={handleApprove}
                      onReject={handleRejectClick}
                      isApproving={approveMutation.isPending}
                      isRejecting={rejectMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickActionButton
                  icon={Building2}
                  label="Create New Company"
                  description="Add a company"
                  onClick={() => setIsCreateCompanyModalOpen(true)}
                />
                <QuickActionButton
                  icon={Building2}
                  label="View All Companies"
                  description="Manage companies"
                  onClick={() => {
                    document
                      .getElementById("companies-section")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
                <QuickActionButton
                  icon={Users}
                  label="Team Management"
                  href="/team"
                  description="View all users"
                />
                <QuickActionButton
                  icon={Shield}
                  label="Roles & Permissions"
                  href="/settings"
                  description="Configure access"
                />
                <QuickActionButton
                  icon={FileText}
                  label="System Reports"
                  href="/reports"
                  description="View analytics"
                />
              </div>
            </div>

            {/* Companies List */}
            {companiesQuery.data && (
              <div
                id="companies-section"
                className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      All Companies
                    </h2>
                    <p className="text-sm text-gray-400">
                      {companiesQuery.data.companies.length} total companies
                    </p>
                  </div>
                </div>

                {companiesQuery.data.companies.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No companies registered yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {companiesQuery.data.companies.map((company) => (
                      <CompanyCard key={company.id} company={company} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <CreateCompanyModal
        isOpen={isCreateCompanyModalOpen}
        onClose={() => setIsCreateCompanyModalOpen(false)}
        onCreateCompany={handleCreateCompany}
        isPending={createCompanyMutation.isPending}
      />

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Reject Show</h3>
            <p className="text-gray-400 mb-4">
              Please provide a reason for rejecting this show (optional):
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none mb-4"
              placeholder="Enter reason for rejection..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedShowForRejection(null);
                  setRejectionReason("");
                }}
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectMutation.isPending ? "Rejecting..." : "Reject Show"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

function QuickActionButton({
  icon: Icon,
  label,
  description,
  href,
  onClick,
}: QuickActionButtonProps) {
  const content = (
    <>
      <div className="p-3 bg-cinematic-gold-500/20 rounded-lg group-hover:bg-cinematic-gold-500/30 transition-colors mb-3">
        <Icon className="h-6 w-6 text-cinematic-gold-400" />
      </div>
      <div>
        <h3 className="font-semibold text-white group-hover:text-cinematic-gold-400 transition-colors mb-1">
          {label}
        </h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="block p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl transition-all group"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl transition-all group"
    >
      {content}
    </button>
  );
}

interface CompanyCardProps {
  company: {
    id: number;
    name: string;
    email: string;
    subscriptionTier: string;
    isActive: boolean;
    approvedByDeveloper: boolean;
    createdAt: Date;
    userCount: number;
    showCount: number;
    sceneCount: number;
    reportCount: number;
  };
}

function CompanyCard({ company }: CompanyCardProps) {
  const statusColor = company.isActive
    ? "bg-cinematic-emerald-500/20 text-cinematic-emerald-400"
    : "bg-gray-700 text-gray-400";

  const approvalColor = company.approvedByDeveloper
    ? "bg-cinematic-blue-500/20 text-cinematic-blue-400"
    : "bg-amber-500/20 text-amber-400";

  return (
    <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">{company.name}</h3>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
            >
              {company.isActive ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Inactive
                </span>
              )}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${approvalColor}`}
            >
              {company.approvedByDeveloper ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Approved
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Pending Approval
                </span>
              )}
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-2">{company.email}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {company.userCount} users
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {company.showCount} shows
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {company.sceneCount} scenes
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {company.reportCount} reports
            </span>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium mb-2 ${
              company.subscriptionTier === "Enterprise"
                ? "bg-cinematic-gold-500/20 text-cinematic-gold-400"
                : company.subscriptionTier === "Pro"
                ? "bg-cinematic-blue-500/20 text-cinematic-blue-400"
                : "bg-gray-700 text-gray-400"
            }`}
          >
            {company.subscriptionTier}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            {new Date(company.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PendingShowCardProps {
  show: {
    id: number;
    title: string;
    description: string | null;
    productionHouse: {
      id: number;
      name: string;
      logoURL: string | null;
    } | null;
    company: {
      id: number;
      name: string;
    };
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    creator: {
      id: number;
      name: string;
      email: string;
      role: string;
    } | null;
  };
  onApprove: (showId: number) => void;
  onReject: (showId: number) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

function PendingShowCard({ show, onApprove, onReject, isApproving, isRejecting }: PendingShowCardProps) {
  return (
    <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Clapperboard className="h-5 w-5 text-cinematic-gold-400" />
            <h3 className="text-lg font-semibold text-white">{show.title}</h3>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
              Pending Approval
            </span>
          </div>
          {show.description && (
            <p className="text-sm text-gray-400 mb-2">{show.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {show.productionHouse?.name || "No production house"}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {show.company.name}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Created by {show.creator?.name || "Unknown"} ({show.creator?.role || "Unknown"})
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(show.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onApprove(show.id)}
          disabled={isApproving || isRejecting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ThumbsUp className="h-4 w-4" />
          {isApproving ? "Approving..." : "Approve"}
        </button>
        <button
          onClick={() => onReject(show.id)}
          disabled={isApproving || isRejecting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ThumbsDown className="h-4 w-4" />
          {isRejecting ? "Rejecting..." : "Reject"}
        </button>
      </div>
    </div>
  );
}
