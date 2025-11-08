import {
  Outlet,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "react-hot-toast";
import { Film } from "lucide-react";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const isFetching = useRouterState({ select: (s) => s.isLoading });

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-cinematic">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cinematic-gold-500/20 rounded-2xl mb-4">
            <Film className="h-8 w-8 text-cinematic-gold-400 animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cinematic-gold-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <TRPCReactProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1f2937",
            color: "#f3f4f6",
            border: "1px solid #374151",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
      <Outlet />
    </TRPCReactProvider>
  );
}
