import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { DashboardLayout } from "~/components/DashboardLayout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import {
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Plus,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { GenerateReportModal } from "~/components/GenerateReportModal";
import { toast } from "sonner";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";

export const Route = createFileRoute("/reports/")({
  component: ReportsPage,
});

function ReportsPage() {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const reportsQuery = useQuery(
    trpc.getReports.queryOptions({
      token: token || "",
      showId: selectedShowId || undefined,
    })
  );

  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );

  const autoGenerateMutation = useMutation(
    trpc.autoGenerateReportsForCompany.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.getReports.queryKey(),
        });
        if (data.count === 0) {
          toast.success("No new reports to generate - all completed days already have reports");
        } else {
          toast.success(`Successfully generated ${data.count} report${data.count === 1 ? '' : 's'}!`);
        }
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const handleAutoGenerate = () => {
    autoGenerateMutation.mutate({
      token: token || "",
      showId: selectedShowId || undefined,
    });
  };

  const reports = reportsQuery.data?.reports || [];
  const shows = showsQuery.data || [];

  return (
    <ProtectedRoute
      requirePermission={(p) => p.canViewReportsPage()}
      accessDeniedMessage="Only production management and directors can access reports."
    >
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Production Reports
              </h1>
              <p className="text-gray-400">
                Daily reports showing completion rates, scene duration, and production insights
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAutoGenerate}
                disabled={autoGenerateMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all font-medium border border-gray-700 disabled:opacity-50"
                title="Auto-generate reports for all completed shooting days"
              >
                <Zap className="h-5 w-5" />
                {autoGenerateMutation.isPending ? "Processing..." : "Auto-Generate"}
              </button>
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold shadow-lg shadow-cinematic-gold-500/20"
              >
                <Plus className="h-5 w-5" />
                Generate Report
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <FilterButton
              label="All Shows"
              active={selectedShowId === null}
              onClick={() => setSelectedShowId(null)}
              count={reports.length}
            />
            {shows.map((show) => {
              const count = reportsQuery.data?.reports.filter(
                (r) => r.showId === show.id
              ).length || 0;
              return (
                <FilterButton
                  key={show.id}
                  label={show.title}
                  active={selectedShowId === show.id}
                  onClick={() => setSelectedShowId(show.id)}
                  count={count}
                />
              );
            })}
          </div>

          {/* Reports Grid */}
          {reportsQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinematic-gold-500"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-cinematic-gold-500/20 rounded-2xl mb-6">
                <FileText className="h-10 w-10 text-cinematic-gold-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No Reports Yet
              </h3>
              <p className="text-gray-400 mb-6">
                {selectedShowId
                  ? "No reports generated for this show yet"
                  : "Reports will be automatically generated as you complete scenes"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </div>

        {/* Generate Report Modal */}
        <GenerateReportModal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

interface FilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}

function FilterButton({ label, active, onClick, count }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
        active
          ? "bg-cinematic-gold-500 text-gray-950"
          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
      }`}
    >
      {label} <span className="ml-1.5">({count})</span>
    </button>
  );
}

interface ReportCardProps {
  report: any;
}

function ReportCard({ report }: ReportCardProps) {
  const date = new Date(report.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const completionRate = report.totalScenes > 0
    ? Math.round((report.completedScenes / report.totalScenes) * 100)
    : 0;

  const avgDurationFormatted = report.averageDuration
    ? `${Math.round(report.averageDuration)} min`
    : "N/A";

  const overallCompletionRate = report.completionRateOverall !== null && report.completionRateOverall !== undefined
    ? Math.round(report.completionRateOverall)
    : null;

  const totalShootingTimeFormatted = report.totalShootingTime !== null && report.totalShootingTime !== undefined
    ? `${Math.round(report.totalShootingTime)} min`
    : null;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-cinematic-gold-500/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-cinematic-gold-500/20 rounded-xl">
          <FileText className="h-6 w-6 text-cinematic-gold-400" />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-cinematic-blue-500/20 text-cinematic-blue-400">
          {report.showTitle}
        </span>
      </div>

      <h3 className="text-lg font-bold text-white mb-2">Daily Report</h3>

      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Calendar className="h-4 w-4" />
        {formattedDate}
      </div>

      {/* Key Metrics */}
      <div className="space-y-3 mb-4 pt-4 border-t border-gray-800">
        {/* Completion Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <CheckCircle className="h-4 w-4" />
            <span>Daily Completion</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {completionRate}%
            </span>
            <span className="text-xs text-gray-500">
              ({report.completedScenes}/{report.totalScenes})
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 h-2 rounded-full transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        {/* Overall Completion Rate */}
        {overallCompletionRate !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <TrendingUp className="h-4 w-4" />
              <span>Overall Progress</span>
            </div>
            <span className="text-sm font-semibold text-cinematic-emerald-400">
              {overallCompletionRate}%
            </span>
          </div>
        )}

        {/* Average Duration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            <span>Avg Duration</span>
          </div>
          <span className="text-sm font-semibold text-white">
            {avgDurationFormatted}
          </span>
        </div>

        {/* Total Shooting Time */}
        {totalShootingTimeFormatted && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              <span>Total Time</span>
            </div>
            <span className="text-sm font-semibold text-white">
              {totalShootingTimeFormatted}
            </span>
          </div>
        )}

        {/* Behind/Ahead Schedule */}
        {(report.behindScheduleScenes !== null && report.behindScheduleScenes !== undefined && report.behindScheduleScenes > 0) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Behind Schedule</span>
            </div>
            <span className="text-sm font-semibold text-orange-400">
              {report.behindScheduleScenes}
            </span>
          </div>
        )}

        {(report.aheadScheduleScenes !== null && report.aheadScheduleScenes !== undefined && report.aheadScheduleScenes > 0) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <CheckCircle className="h-4 w-4" />
              <span>Ahead of Schedule</span>
            </div>
            <span className="text-sm font-semibold text-cinematic-emerald-400">
              {report.aheadScheduleScenes}
            </span>
          </div>
        )}

        {/* Delayed Scenes */}
        {report.delayedScenes > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Delayed Scenes</span>
            </div>
            <span className="text-sm font-semibold text-orange-400">
              {report.delayedScenes}
            </span>
          </div>
        )}

        {/* Longest Scene */}
        {report.longestScene && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <TrendingUp className="h-4 w-4" />
              <span>Longest Scene</span>
            </div>
            <span className="text-sm font-semibold text-white">
              {report.longestScene}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
