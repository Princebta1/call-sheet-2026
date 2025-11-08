import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { DashboardLayout } from "~/components/DashboardLayout";
import { ShowPreview } from "~/components/ShowPreview";
import { Clapperboard, Plus, Film, Calendar, Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmationModal } from "~/components/DeleteConfirmationModal";
import toast from "react-hot-toast";
import { getUserFriendlyError, formatErrorMessage } from "~/utils/errorMessages";

export const Route = createFileRoute("/shows/")({
  component: ShowsPage,
});

function ShowsPage() {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const permissions = usePermissions();
  const [filter, setFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const [deletingShow, setDeletingShow] = useState<{ id: number; title: string } | null>(null);

  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );

  const deleteShowMutation = useMutation(
    trpc.deleteShow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getShows.queryKey(),
        });
        toast.success("Show deleted successfully!");
        setDeletingShow(null);
      },
      onError: (error) => {
        const errorInfo = getUserFriendlyError(error);
        toast.error(formatErrorMessage(errorInfo), { duration: 6000 });
      },
    })
  );

  const handleDeleteShow = async () => {
    if (deletingShow) {
      await deleteShowMutation.mutateAsync({
        token: token || "",
        showId: deletingShow.id,
      });
    }
  };

  const shows = showsQuery.data || [];

  const filteredShows =
    filter === "all"
      ? shows
      : shows.filter((show) => show.status === filter);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Shows</h1>
            <p className="text-gray-400">
              Manage your film and video productions
            </p>
          </div>
          <Link
            to="/shows/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold shadow-lg shadow-cinematic-gold-500/20"
          >
            <Plus className="h-5 w-5" />
            New Show
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <FilterButton
            label="All Shows"
            active={filter === "all"}
            onClick={() => setFilter("all")}
            count={shows.length}
          />
          <FilterButton
            label="Pre-Production"
            active={filter === "Pre-Production"}
            onClick={() => setFilter("Pre-Production")}
            count={shows.filter((s) => s.status === "Pre-Production").length}
          />
          <FilterButton
            label="Shooting"
            active={filter === "Shooting"}
            onClick={() => setFilter("Shooting")}
            count={shows.filter((s) => s.status === "Shooting").length}
          />
          <FilterButton
            label="Wrapped"
            active={filter === "Wrapped"}
            onClick={() => setFilter("Wrapped")}
            count={shows.filter((s) => s.status === "Wrapped").length}
          />
        </div>

        {/* Shows Grid */}
        {showsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinematic-gold-500"></div>
          </div>
        ) : filteredShows.length === 0 ? (
          <div className="text-center py-20">
            <Clapperboard className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">
              {filter === "all"
                ? "No shows yet. Create your first production!"
                : `No shows in ${filter} status`}
            </p>
            {filter === "all" && (
              <Link
                to="/shows/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-semibold"
              >
                <Plus className="h-5 w-5" />
                Create Your First Show
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
                      <ShowPreview
                        thumbnailURL={show.thumbnailURL}
                        showTitle={show.title}
                        size="md"
                      />
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

                    {show.productionHouse && (
                      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-800">
                        {show.productionHouse.logoURL && (
                          <img
                            src={show.productionHouse.logoURL}
                            alt={show.productionHouse.name}
                            className="w-6 h-6 rounded object-cover"
                          />
                        )}
                        <span className="text-sm text-gray-500">
                          {show.productionHouse.name}
                        </span>
                      </div>
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

                {/* Delete button - only visible on hover and for developers */}
                {permissions.isDeveloper() && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setDeletingShow({ id: show.id, title: show.title });
                    }}
                    className="absolute top-8 right-8 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 hover:border-red-500/50 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Show"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingShow && (
          <DeleteConfirmationModal
            isOpen={!!deletingShow}
            onClose={() => setDeletingShow(null)}
            onConfirm={handleDeleteShow}
            title="Delete Show"
            itemName={deletingShow.title}
            itemType="show"
            isPending={deleteShowMutation.isPending}
            warningMessage="This will permanently delete the show and all associated data including scenes, call sheets, reports, and assignments. This action cannot be undone."
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
