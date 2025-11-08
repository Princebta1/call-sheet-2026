import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { EditShowModal } from "~/components/EditShowModal";
import toast from "react-hot-toast";
import { handleErrorWithToast } from "~/utils/errorMessages";
import {
  Info,
  Calendar,
  Film,
  FileText,
  Users,
  Clock,
  Edit,
} from "lucide-react";

export const Route = createFileRoute("/shows/$showId/profile/")({
  component: ProductionProfilePage,
});

function ProductionProfilePage() {
  const { showId } = Route.useParams();
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const { canManageShows } = usePermissions();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatingProductionHouse, setIsCreatingProductionHouse] = useState(false);
  const queryClient = useQueryClient();

  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );

  const scenesQuery = useQuery(
    trpc.getScenes.queryOptions({
      token: token || "",
      showId: parseInt(showId),
    })
  );

  const callSheetsQuery = useQuery(
    trpc.getCallSheets.queryOptions({
      token: token || "",
      showId: parseInt(showId),
    })
  );

  const reportsQuery = useQuery(
    trpc.getReports.queryOptions({
      token: token || "",
      showId: parseInt(showId),
    })
  );

  const productionHousesQuery = useQuery(
    trpc.getProductionHouses.queryOptions({ token: token || "" })
  );

  const updateShowMutation = useMutation(
    trpc.updateShow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getShows.queryKey(),
        });
        toast.success("Production updated successfully!");
      },
      onError: (error) => {
        handleErrorWithToast(error, "Failed to update production");
      },
    })
  );

  const createProductionHouseMutation = useMutation(
    trpc.createProductionHouseSimple.mutationOptions()
  );

  const handleCreateProductionHouse = async (name: string) => {
    try {
      setIsCreatingProductionHouse(true);
      const newHouse = await createProductionHouseMutation.mutateAsync({
        token: token || "",
        name,
      });
      
      // Refetch production houses to include the new one
      await queryClient.invalidateQueries({
        queryKey: trpc.getProductionHouses.queryKey(),
      });
      
      toast.success(`Production house "${name}" created successfully!`);
    } catch (error) {
      handleErrorWithToast(error, "Failed to create production house");
    } finally {
      setIsCreatingProductionHouse(false);
    }
  };

  const handleUpdate = async (
    showId: number,
    data: {
      title: string;
      productionHouseId?: number;
      description?: string;
      startDate?: string;
      endDate?: string;
      status: "Pre-Production" | "Shooting" | "Wrapped";
    }
  ) => {
    await updateShowMutation.mutateAsync({
      token: token || "",
      showId,
      title: data.title,
      productionHouseId: data.productionHouseId || null,
      description: data.description || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      status: data.status,
    });
  };

  const show = showsQuery.data?.find((s) => s.id === parseInt(showId));
  const scenes = scenesQuery.data || [];
  const callSheets = callSheetsQuery.data?.callSheets || [];
  const reports = reportsQuery.data?.reports || [];

  const stats = {
    totalScenes: scenes.length,
    completedScenes: scenes.filter((s) => s.status === "Complete").length,
    inProgressScenes: scenes.filter((s) => s.status === "In Progress").length,
    callSheets: callSheets.length,
    reports: reports.length,
  };

  const completionRate = stats.totalScenes > 0
    ? Math.round((stats.completedScenes / stats.totalScenes) * 100)
    : 0;

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
              <Info className="h-6 w-6 text-cinematic-gold-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Production Profile</h1>
          </div>
          {canManageShows() && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium border border-gray-700"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>

        {showsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinematic-gold-500"></div>
          </div>
        ) : !show ? (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
            <p className="text-red-400">Production not found</p>
          </div>
        ) : (
          <>
            {/* Production Details */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400 block mb-1">
                    Title
                  </label>
                  <p className="text-lg text-white">{show.title}</p>
                </div>

                {show.productionHouse && (
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-1">
                      Production House
                    </label>
                    <div className="flex items-center gap-2">
                      {show.productionHouse.logoURL && (
                        <img
                          src={show.productionHouse.logoURL}
                          alt={show.productionHouse.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <Link
                        to="/production-houses"
                        className="text-white hover:text-cinematic-gold-400 transition-colors"
                      >
                        {show.productionHouse.name}
                      </Link>
                    </div>
                  </div>
                )}

                {show.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-1">
                      Description
                    </label>
                    <p className="text-white">{show.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-1">
                      Status
                    </label>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        show.status === "Shooting"
                          ? "bg-cinematic-emerald-500/20 text-cinematic-emerald-400"
                          : show.status === "Pre-Production"
                          ? "bg-cinematic-blue-500/20 text-cinematic-blue-400"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {show.status}
                    </span>
                  </div>

                  {show.startDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-400 block mb-1">
                        Start Date
                      </label>
                      <div className="flex items-center gap-2 text-white">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {new Date(show.startDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {show.endDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-400 block mb-1">
                        End Date
                      </label>
                      <div className="flex items-center gap-2 text-white">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {new Date(show.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-1">
                      Created
                    </label>
                    <div className="flex items-center gap-2 text-white">
                      <Clock className="h-4 w-4 text-gray-500" />
                      {new Date(show.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Statistics</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-cinematic-blue-500/20 p-2 rounded-lg">
                      <Film className="h-5 w-5 text-cinematic-blue-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.totalScenes}</div>
                      <div className="text-sm text-gray-400">Total Scenes</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-cinematic-emerald-500/20 p-2 rounded-lg">
                      <Film className="h-5 w-5 text-cinematic-emerald-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.completedScenes}</div>
                      <div className="text-sm text-gray-400">Completed</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500/20 p-2 rounded-lg">
                      <Film className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.inProgressScenes}</div>
                      <div className="text-sm text-gray-400">In Progress</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-cinematic-gold-500/20 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-cinematic-gold-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.callSheets}</div>
                      <div className="text-sm text-gray-400">Call Sheets</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-500/20 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.reports}</div>
                      <div className="text-sm text-gray-400">Reports</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400">
                    Overall Progress
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {completionRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 h-3 rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Edit Modal */}
        <EditShowModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          show={show || null}
          productionHouses={productionHousesQuery.data || []}
          onUpdate={handleUpdate}
          isPending={updateShowMutation.isPending}
          onCreateProductionHouse={handleCreateProductionHouse}
          isCreatingProductionHouse={isCreatingProductionHouse}
        />
      </div>
    </div>
  );
}
