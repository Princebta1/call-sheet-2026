import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

const trpcInstance = initTRPC.create({
  transformer: superjson,
  sse: {
    enabled: true,
    client: {
      reconnectAfterInactivityMs: 5000,
    },
    ping: {
      enabled: true,
      intervalMs: 2500,
    },
  },
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = trpcInstance.createCallerFactory;
export const createTRPCRouter = trpcInstance.router;
export const baseProcedure = trpcInstance.procedure;
