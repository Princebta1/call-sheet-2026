import { QueryClientProvider } from "@tanstack/react-query";
import {
  loggerLink,
  splitLink,
  httpBatchStreamLink,
  httpSubscriptionLink,
  createTRPCClient,
  TRPCLink,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import SuperJSON from "superjson";
import { observable } from "@trpc/server/observable";

import { AppRouter } from "~/server/trpc/root";
import { getQueryClient } from "./query-client";
import { useAuthStore } from "~/stores/authStore";

// Now, with the newer @trpc/tanstack-react-query package, we no longer need createTRPCReact.
// We use createTRPCContext instead.
const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export { useTRPC, useTRPCClient };

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return `http://localhost:3000`;
}

// Custom link to handle UNAUTHORIZED errors
const unauthorizedLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const subscription = next(op).subscribe({
        next(value) {
          // Check if the result contains an UNAUTHORIZED error
          // TRPCError structure: { ok: false, error: { data: { code: "UNAUTHORIZED" } } }
          const isUnauthorized = 
            !value.ok && 
            value.error?.data?.code === "UNAUTHORIZED";

          if (isUnauthorized) {
            console.log("[tRPC] UNAUTHORIZED error detected, clearing auth and redirecting to login");
            
            // Clear auth store
            const { clearAuth } = useAuthStore.getState();
            clearAuth();
            
            // Redirect to login if we're in the browser
            if (typeof window !== "undefined" && window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
          }
          
          observer.next(value);
        },
        error(err) {
          // Also check for UNAUTHORIZED in error objects
          // This catches errors that might be thrown directly
          const isUnauthorized = 
            err?.data?.code === "UNAUTHORIZED" || 
            err?.code === "UNAUTHORIZED" ||
            (err?.message && /invalid or expired token/i.test(err.message));

          if (isUnauthorized) {
            console.log("[tRPC] UNAUTHORIZED error caught in error handler, clearing auth and redirecting to login");
            
            // Clear auth store
            const { clearAuth } = useAuthStore.getState();
            clearAuth();
            
            // Redirect to login if we're in the browser
            if (typeof window !== "undefined" && window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
          }
          
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return subscription;
    });
  };
};

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        unauthorizedLink,
        splitLink({
          condition: (op) => op.type === "subscription",
          false: httpBatchStreamLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/trpc",
          }),
          true: httpSubscriptionLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/trpc",
          }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
