import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/shows/$showId/")({
  component: ProductionIndex,
});

function ProductionIndex() {
  const { showId } = Route.useParams();
  return <Navigate to={`/shows/${showId}/scenes`} replace />;
}
