import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { GenerateCallSheetModal } from "~/components/GenerateCallSheetModal";
import {
  FileText,
  Plus,
  Download,
  Calendar,
  MapPin,
  Film,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/shows/$showId/call-sheets/")({
  component: ProductionCallSheetsPage,
});

function ProductionCallSheetsPage() {
  const { showId } = Route.useParams();
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const permissions = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const callSheetsQuery = useQuery(
    trpc.getCallSheets.queryOptions({
      token: token || "",
      showId: parseInt(showId),
    })
  );

  const callSheets = callSheetsQuery.data?.callSheets || [];
  const canManageScenes = permissions.canManageScenes();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Call Sheets</h1>
          <p className="text-gray-400">
            View and download generated call sheets for this production
          </p>
        </div>
        {canManageScenes && (
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold shadow-lg shadow-cinematic-gold-500/20"
          >
            <Plus className="h-5 w-5" />
            Generate Call Sheet
          </button>
        )}
      </div>

      {/* Call Sheets Grid */}
      {callSheetsQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinematic-gold-500"></div>
        </div>
      ) : callSheets.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-6">
            No call sheets generated yet. Create your first one!
          </p>
          {canManageScenes && (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-semibold"
            >
              <Plus className="h-5 w-5" />
              Generate Your First Call Sheet
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {callSheets.map((callSheet) => (
            <CallSheetCard key={callSheet.id} callSheet={callSheet} />
          ))}
        </div>
      )}

      {/* Generate Call Sheet Modal */}
      <GenerateCallSheetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedDate={null}
      />
    </div>
  );
}

interface CallSheetCardProps {
  callSheet: any;
}

function CallSheetCard({ callSheet }: CallSheetCardProps) {
  const date = new Date(callSheet.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const scenesCount = callSheet.scenesIncluded
    ? JSON.parse(callSheet.scenesIncluded).length
    : 0;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-cinematic-gold-500/50 transition-all h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-cinematic-gold-500/20 rounded-xl">
          <FileText className="h-6 w-6 text-cinematic-gold-400" />
        </div>
      </div>

      <h3 className="text-lg font-bold text-white mb-2">Call Sheet</h3>
      
      <div className="space-y-2 mb-4 flex-1">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="h-4 w-4" />
          {formattedDate}
        </div>
        
        {callSheet.location && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin className="h-4 w-4" />
            {callSheet.location}
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Film className="h-4 w-4" />
          {scenesCount} {scenesCount === 1 ? "scene" : "scenes"}
        </div>
      </div>

      {callSheet.notes && (
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {callSheet.notes}
        </p>
      )}

      <div className="flex gap-2 pt-4 border-t border-gray-800">
        {callSheet.pdfURL ? (
          <>
            <a
              href={callSheet.pdfURL}
              download
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-cinematic-gold-500/20 text-cinematic-gold-400 rounded-lg hover:bg-cinematic-gold-500/30 transition-colors font-medium text-sm"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
            <a
              href={callSheet.pdfURL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              View
            </a>
          </>
        ) : (
          <div className="flex-1 text-center text-sm text-gray-500 py-2">
            PDF not available
          </div>
        )}
      </div>
    </div>
  );
}
