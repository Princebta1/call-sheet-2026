import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

// In-memory store for typing status
// Key format: "showId:recipientId" or "showId" for channel messages
// Value: { userId, userName, timestamp }
interface TypingStatus {
  userId: number;
  userName: string;
  timestamp: number;
}

const typingStatusStore = new Map<string, TypingStatus[]>();

// Clean up old typing statuses (older than 10 seconds)
setInterval(() => {
  const now = Date.now();
  const TYPING_TIMEOUT = 10000; // 10 seconds
  
  for (const [key, statuses] of typingStatusStore.entries()) {
    const activeStatuses = statuses.filter(
      (status) => now - status.timestamp < TYPING_TIMEOUT
    );
    
    if (activeStatuses.length === 0) {
      typingStatusStore.delete(key);
    } else if (activeStatuses.length !== statuses.length) {
      typingStatusStore.set(key, activeStatuses);
    }
  }
}, 5000); // Run cleanup every 5 seconds

export const sendTypingStatus = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      recipientId: z.number().optional(),
      isTyping: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    // Verify show exists and user has access
    const show = await db.show.findUnique({
      where: { id: input.showId },
    });

    if (!show || show.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    // Verify user has access to the show
    // Users with manage_shows permission can access all shows in their company
    const canManageShows = payload.permissions.includes("manage_shows");
    
    if (!canManageShows) {
      const hasAccess = await db.userShow.findFirst({
        where: {
          userId: user.id,
          showId: input.showId,
        },
      });

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this show",
        });
      }
    }

    // Build the key for the typing status store
    const key = input.recipientId
      ? `${input.showId}:${input.recipientId}`
      : `${input.showId}`;

    if (input.isTyping) {
      // Add or update typing status
      const currentStatuses = typingStatusStore.get(key) || [];
      const existingIndex = currentStatuses.findIndex(
        (status) => status.userId === user.id
      );

      const newStatus: TypingStatus = {
        userId: user.id,
        userName: user.name,
        timestamp: Date.now(),
      };

      if (existingIndex >= 0) {
        currentStatuses[existingIndex] = newStatus;
      } else {
        currentStatuses.push(newStatus);
      }

      typingStatusStore.set(key, currentStatuses);
    } else {
      // Remove typing status
      const currentStatuses = typingStatusStore.get(key) || [];
      const filteredStatuses = currentStatuses.filter(
        (status) => status.userId !== user.id
      );

      if (filteredStatuses.length === 0) {
        typingStatusStore.delete(key);
      } else {
        typingStatusStore.set(key, filteredStatuses);
      }
    }

    return { success: true };
  });

// Export the store so it can be accessed by the subscription
export { typingStatusStore };
