import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { DashboardLayout } from "~/components/DashboardLayout";
import { EditShowModal } from "~/components/EditShowModal";
import { Clapperboard, ArrowLeft, Film, Calendar, AlertCircle, Building2, Users } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";

export const Route = createFileRoute("/production-houses/$productionHouseId/shows/")({
  component: ProductionHouseShowsPage,
});

function ProductionHouseShowsPage() {
  const { productionHouseId } = Route.useParams();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const permissions = usePermissions();
  const [editingShow, setEditingShow] = useState<any>(null);
  const [filter, setFilter] = useState<string>("all");
  const [isCreatingProductionHouse, setIsCreatingProductionHouse] = useState(false);

  const productionHousesQuery = useQuery({
    queryKey: ["publicProductionHouses"],
    queryFn: async () => {
      const result = await trpc.getPublicProductionHouses.query({});
      return result;
    },
    retry: false,
  });

  const productionHouses = productionHousesQuery.data || [];
  const productionHouse = productionHouses.find(
    (ph) => ph.id === parseInt(productionHouseId)
  );

  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );

  const updateShowMutation = useMutation(
    trpc.updateShow.mutationOptions()
  );

  const createProductionHouseMutation = useMutation(
    trpc.createProductionHouse.mutationOptions()
  );

  // Filter shows by production house
  const allShows = showsQuery.data || [];
  const productionHouseShows = allShows.filter(
    (show) => show.productionHouse?.id === parseInt(productionHouseId)
  );

  const filteredShows =
    filter === "all"
      ? productionHouseShows
      : productionHouseShows.filter((show) => show.status === filter);

  const handleUpdateShow = async (showId: number, data: any) => {
    try {
      await updateShowMutation.mutateAsync({
        token: token || "",
        showId,
        ...data,
      });
      toast.success("Show updated successfully");
      showsQuery.refetch();
    } catch (error: any) {
      const errorInfo = getUserFriendlyError(error);
      toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      throw error;
    }
  };

  const handleCreateProductionHouse = async (name: string) => {
    try {
      setIsCreatingProductionHouse(true);
      await createProductionHouseMutation.mutateAsync({
        token: token || "",
        name,
      });
      await productionHousesQuery.refetch();
      toast.success(`Production house "${name}" created successfully!`);
    } catch (error: any) {
      const errorInfo = getUserFriendlyError(error);
      toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
    } finally {
      setIsCreatingProductionHouse(false);
    }
  };

  if (!permissions.isDeveloper()) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-20">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">Only developers can access production houses.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!productionHouse && !productionHousesQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-20">
            <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Production House Not Found</h2>
            <p className="text-gray-400 mb-6">
              The production house you're looking for doesn't exist or you don't have access to it.
            </p>
            <button
              onClick={() => navigate({ to: "/production-houses" })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-semibold"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Production Houses
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate({ to: "/production-houses" })}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Production Houses
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {productionHouse?.logoURL ? (
                <img
                  src={productionHouse.logoURL}
                  alt={productionHouse.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="p-4 bg-cinematic-gold-500/20 rounded-xl">
                  <Building2 className="h-8 w-8 text-cinematic-gold-400" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {productionHouse?.name || "Loading..."}
                </h1>
                <p className="text-gray-400">
                  {productionHouseShows.length} {productionHouseShows.length === 1 ? "show" : "shows"} assigned
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {permissions.isDeveloper() && (
          <div className="flex gap-2 border-b border-gray-800">
            <Link
              to="/production-houses/$productionHouseId/shows"
              params={{ productionHouseId }}
              className="px-4 py-3 text-sm font-medium border-b-2 border-cinematic-gold-400 text-cinematic-gold-400"
            >
              Shows
            </Link>
            <Link
              to="/production-houses/$productionHouseId/team"
              params={{ productionHouseId }}
              className="px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Team
            </Link>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <FilterButton
            label="All Shows"
            active={filter === "all"}
            onClick={() => setFilter("all")}
            count={productionHouseShows.length}
          />
          <FilterButton
            label="Pre-Production"
            active={filter === "Pre-Production"}
            onClick={() => setFilter("Pre-Production")}
            count={productionHouseShows.filter((s) => s.status === "Pre-Production").length}
          />
          <FilterButton
            label="Shooting"
            active={filter === "Shooting"}
            onClick={() => setFilter("Shooting")}
            count={productionHouseShows.filter((s) => s.status === "Shooting").length}
          />
          <FilterButton
            label="Wrapped"
            active={filter === "Wrapped"}
            onClick={() => setFilter("Wrapped")}
            count={productionHouseShows.filter((s) => s.status === "Wrapped").length}
          />
        </div>

        {/* Shows Grid */}
        {showsQuery.isLoading || productionHousesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinematic-gold-500"></div>
          </div>
        ) : filteredShows.length === 0 ? (
          <div className="text-center py-20">
            <Clapperboard className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">
              {filter === "all"
                ? `No shows assigned to ${productionHouse?.name} yet.`
                : `No shows in ${filter} status for ${productionHouse?.name}.`}
            </p>
            {filter === "all" && permissions.canManageShows() && (
              <Link
                to="/shows/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-semibold"
              >
                <Clapperboard className="h-5 w-5" />
                Create New Show
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShows.map((show) => (
              <div key={show.id} className="group relative">
                <Link
                  to="/shows/$showId"
                  params={{ showId: show.id.toString() }}
                  className="block"
                >
                  <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-cinematic-gold-500/50 transition-all h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-cinematic-gold-500/20 rounded-xl group-hover:bg-cinematic-gold-500/30 transition-colors">
                        <Clapperboard className="h-6 w-6 text-cinematic-gold-400" />
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
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

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cinematic-gold-400 transition-colors">
                      {show.title}
                    </h3>

                    {show.description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">
                        {show.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-800">
                      <span className="flex items-center gap-1.5">
                        <Film className="h-4 w-4" />
                        {show.sceneCount} scenes
                      </span>
                      {show.startDate && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {new Date(show.startDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {permissions.canManageShows() && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setEditingShow(show);
                    }}
                    className="absolute top-8 right-8 p-2 bg-gray-900/90 border border-gray-700 rounded-lg text-gray-400 hover:text-cinematic-gold-400 hover:border-cinematic-gold-500/50 transition-all opacity-0 group-hover:opacity-100"
                    title="Edit Show"
                  >
                    <Film className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Edit Show Modal */}
        {editingShow && (
          <EditShowModal
            isOpen={!!editingShow}
            onClose={() => setEditingShow(null)}
            show={editingShow}
            productionHouses={productionHouses}
            onUpdate={handleUpdateShow}
            isPending={updateShowMutation.isPending}
            onCreateProductionHouse={handleCreateProductionHouse}
            isCreatingProductionHouse={isCreatingProductionHouse}
          />
        )}
      </div>
    </DashboardLayout>
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
