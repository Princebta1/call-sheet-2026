import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "~/components/DashboardLayout";
import { ProductionHouseMemberManagement } from "~/components/ProductionHouseMemberManagement";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { usePermissions } from "~/hooks/usePermissions";
import { Building2, Users, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/production-houses/$productionHouseId/team/")({
  component: ProductionHouseTeamPage,
});

function ProductionHouseTeamPage() {
  const { productionHouseId } = Route.useParams();
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const permissions = usePermissions();

  const productionHousesQuery = useQuery(
    trpc.getProductionHouses.queryOptions({ token: token || "" })
  );

  const productionHouse = productionHousesQuery.data?.find(
    (ph) => ph.id === Number(productionHouseId)
  );

  if (!permissions.isDeveloper()) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
              <p className="text-gray-400">
                Only developers can access production house management.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (productionHousesQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-cinematic-gold-400" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!productionHouse) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 text-center">
              <Building2 className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Production House Not Found</h2>
              <p className="text-gray-400 mb-6">
                The production house you're looking for doesn't exist or you don't have access to it.
              </p>
              <Link
                to="/production-houses"
                className="inline-flex items-center gap-2 px-6 py-3 bg-cinematic-gold-500 text-gray-950 rounded-lg hover:bg-cinematic-gold-600 transition-colors font-semibold"
              >
                Back to Production Houses
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Link
                to="/production-houses"
                className="hover:text-cinematic-gold-400 transition-colors"
              >
                Production Houses
              </Link>
              <span>/</span>
              <Link
                to="/production-houses/$productionHouseId/shows"
                params={{ productionHouseId }}
                className="hover:text-cinematic-gold-400 transition-colors"
              >
                {productionHouse.name}
              </Link>
              <span>/</span>
              <span className="text-white">Team</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-cinematic-gold-500/20 rounded-xl">
                <Users className="h-8 w-8 text-cinematic-gold-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {productionHouse.name} Team
                </h1>
                <p className="text-gray-400 mt-1">
                  Manage roles and permissions for production house members
                </p>
              </div>
            </div>
          </div>

          {/* Member Management */}
          <ProductionHouseMemberManagement
            productionHouseId={Number(productionHouseId)}
            productionHouseName={productionHouse.name}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
