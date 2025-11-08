import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { X, FileText, Calendar, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | null;
}

export function GenerateReportModal({
  isOpen,
  onClose,
  selectedDate,
}: GenerateReportModalProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  
  const [showId, setShowId] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [recipientGroupId, setRecipientGroupId] = useState<number | null>(null);

  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );

  const shows = showsQuery.data || [];

  const groupsQuery = useQuery(
    trpc.getRecipientGroups.queryOptions({ token: token || "" })
  );

  const groups = groupsQuery.data || [];

  const generateMutation = useMutation(
    trpc.generateReport.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.getReports.queryKey(),
        });
        setGeneratedReport(data);
        toast.success("Production report generated successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to generate report");
      },
    })
  );

  useEffect(() => {
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split("T")[0];
      setDate(dateStr);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isOpen) {
      setGeneratedReport(null);
      setRecipientGroupId(null);
      if (shows.length > 0 && !showId) {
        setShowId(shows[0].id);
      }
    }
  }, [isOpen, shows, showId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!showId || !date) {
      toast.error("Please select a show and date");
      return;
    }

    generateMutation.mutate({
      token: token || "",
      showId,
      date,
      recipientGroupId: recipientGroupId || undefined,
    });
  };

  const handleClose = () => {
    if (!generateMutation.isPending) {
      setShowId(null);
      setDate("");
      setGeneratedReport(null);
      setRecipientGroupId(null);
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/95 border border-gray-800 p-6 shadow-2xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
                      <FileText className="h-6 w-6 text-cinematic-gold-400" />
                    </div>
                    <Dialog.Title className="text-xl font-bold text-white">
                      Generate Production Report
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={generateMutation.isPending}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {generatedReport ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-cinematic-emerald-500/10 border border-cinematic-emerald-500/30 rounded-lg">
                      <p className="text-cinematic-emerald-400 text-sm mb-3">
                        Production report generated successfully!
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-300">
                          <span>Show:</span>
                          <span className="font-medium">{generatedReport.showTitle}</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>Date:</span>
                          <span className="font-medium">
                            {new Date(generatedReport.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>Completion Rate:</span>
                          <span className="font-medium">
                            {generatedReport.completedScenes}/{generatedReport.totalScenes} scenes (
                            {Math.round((generatedReport.completedScenes / generatedReport.totalScenes) * 100)}%)
                          </span>
                        </div>
                        {generatedReport.averageDuration && (
                          <div className="flex justify-between text-gray-300">
                            <span>Avg Duration:</span>
                            <span className="font-medium">
                              {Math.round(generatedReport.averageDuration)} min
                            </span>
                          </div>
                        )}
                        {generatedReport.delayedScenes > 0 && (
                          <div className="flex justify-between text-orange-400">
                            <span>Delayed Scenes:</span>
                            <span className="font-medium">{generatedReport.delayedScenes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleClose}
                      className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                ) : shows.length === 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-cinematic-blue-500/10 border border-cinematic-blue-500/30 rounded-lg">
                      <p className="text-cinematic-blue-400 text-sm mb-3">
                        You need to create a show before generating a report.
                      </p>
                      <Link
                        to="/shows"
                        onClick={handleClose}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-medium text-sm w-full justify-center"
                      >
                        <TrendingUp className="h-4 w-4" />
                        Go to Shows
                      </Link>
                    </div>
                    <button
                      onClick={handleClose}
                      className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Show *
                      </label>
                      <select
                        value={showId || ""}
                        onChange={(e) => setShowId(Number(e.target.value))}
                        required
                        disabled={generateMutation.isPending}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
                      >
                        <option value="">Select a show</option>
                        {shows.map((show) => (
                          <option key={show.id} value={show.id}>
                            {show.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Date *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                          disabled={generateMutation.isPending}
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Send To
                      </label>
                      <select
                        value={recipientGroupId || ""}
                        onChange={(e) =>
                          setRecipientGroupId(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        disabled={generateMutation.isPending}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
                      >
                        <option value="">
                          Default Recipients (Admins, ADs, Directors)
                        </option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name} ({group.memberCount} member
                            {group.memberCount !== 1 ? "s" : ""})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Choose a recipient group or use default role-based
                        recipients
                      </p>
                    </div>

                    <div className="p-4 bg-cinematic-blue-500/10 border border-cinematic-blue-500/30 rounded-lg">
                      <p className="text-cinematic-blue-400 text-xs">
                        This will generate a report for all scenes scheduled on the selected date.
                        If a report already exists for this date and show, it will be updated.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={generateMutation.isPending}
                        className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={generateMutation.isPending || !showId || !date}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generateMutation.isPending ? "Generating..." : "Generate"}
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
