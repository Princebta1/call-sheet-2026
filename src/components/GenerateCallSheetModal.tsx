import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { X, FileText, Calendar, MapPin, FileDown } from "lucide-react";
import toast from "react-hot-toast";

interface GenerateCallSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | null;
}

export function GenerateCallSheetModal({
  isOpen,
  onClose,
  selectedDate,
}: GenerateCallSheetModalProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  
  const [showId, setShowId] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );

  const shows = showsQuery.data || [];

  const generateMutation = useMutation(
    trpc.generateCallSheet.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.getCallSheets.queryKey(),
        });
        setGeneratedPdfUrl(data.pdfURL || null);
        toast.success("Call sheet generated successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to generate call sheet");
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
      setGeneratedPdfUrl(null);
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
      location: location || undefined,
      notes: notes || undefined,
    });
  };

  const handleClose = () => {
    if (!generateMutation.isPending) {
      setShowId(null);
      setDate("");
      setLocation("");
      setNotes("");
      setGeneratedPdfUrl(null);
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
                      Generate Call Sheet
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

                {generatedPdfUrl ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-cinematic-emerald-500/10 border border-cinematic-emerald-500/30 rounded-lg">
                      <p className="text-cinematic-emerald-400 text-sm mb-3">
                        Your call sheet has been generated successfully!
                      </p>
                      <a
                        href={generatedPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-medium text-sm w-full justify-center"
                      >
                        <FileDown className="h-4 w-4" />
                        Download Call Sheet PDF
                      </a>
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
                        You need to create a show before generating a call sheet.
                      </p>
                      <Link
                        to="/shows/new"
                        onClick={handleClose}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-medium text-sm w-full justify-center"
                      >
                        <FileText className="h-4 w-4" />
                        Create Your First Show
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
                        Primary Location
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g., Studio Lot - Building 3"
                          disabled={generateMutation.isPending}
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Special instructions, weather considerations, etc."
                        rows={3}
                        disabled={generateMutation.isPending}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all resize-none disabled:opacity-50"
                      />
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
