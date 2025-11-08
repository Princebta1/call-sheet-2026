import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";
import { typingStatusStore } from "./sendTypingStatus";

export const typingStatusStream = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      recipientId: z.number().optional(),
    })
  )
  .subscription(async function* ({ input }) {
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

    let lastTypingUsers: string[] = [];

    // Poll for typing status changes
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Check every second

      const now = Date.now();
      const TYPING_TIMEOUT = 10000; // 10 seconds
      
      // Get current typing statuses
      const typingStatuses = typingStatusStore.get(key) || [];
      
      // Filter out old statuses and exclude current user
      const activeTypingStatuses = typingStatuses.filter(
        (status) =>
          status.userId !== user.id &&
          now - status.timestamp < TYPING_TIMEOUT
      );

      // Create a sorted list of typing user names for comparison
      const currentTypingUsers = activeTypingStatuses
        .map((status) => status.userName)
        .sort();

      // Only yield if the typing users have changed
      if (
        JSON.stringify(currentTypingUsers) !== JSON.stringify(lastTypingUsers)
      ) {
        lastTypingUsers = currentTypingUsers;
        
        yield {
          typingUsers: activeTypingStatuses.map((status) => ({
            userId: status.userId,
            userName: status.userName,
          })),
        };
      }
    }
  });
