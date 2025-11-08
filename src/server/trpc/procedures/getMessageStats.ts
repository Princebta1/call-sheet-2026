import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const getMessageStats = baseProcedure
  .input(
    z.object({
      token: z.string(),
      // Optional: map of showId to last viewed timestamp (ISO string)
      lastViewedTimestamps: z.record(z.string(), z.string()).optional(),
    })
  )
  .query(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "view_messages");

    // Get all shows the user has access to
    const userShows = await db.userShow.findMany({
      where: { userId: user.id },
      select: { showId: true },
    });
    const showIds = userShows.map((us) => us.showId);

    if (showIds.length === 0) {
      return {
        totalUnread: 0,
        unreadByShow: [],
      };
    }

    // Calculate unread counts per show
    const unreadByShow = await Promise.all(
      showIds.map(async (showId) => {
        // Get last viewed timestamp for this show
        const lastViewedStr = input.lastViewedTimestamps?.[showId.toString()];
        const lastViewed = lastViewedStr ? new Date(lastViewedStr) : new Date(0);

        // Count new messages in this show (channel messages + direct messages to user)
        const count = await db.message.count({
          where: {
            showId,
            createdAt: { gt: lastViewed },
            // Exclude messages sent by the user themselves
            senderId: { not: user.id },
            OR: [
              { recipientId: null }, // Channel messages
              { recipientId: user.id }, // Direct messages to user
            ],
          },
        });

        // Get show details
        const show = await db.show.findUnique({
          where: { id: showId },
          select: { id: true, title: true },
        });

        return {
          showId,
          showTitle: show?.title || "Unknown Show",
          unreadCount: count,
        };
      })
    );

    // Calculate total unread
    const totalUnread = unreadByShow.reduce(
      (sum, show) => sum + show.unreadCount,
      0
    );

    return {
      totalUnread,
      unreadByShow: unreadByShow.filter((show) => show.unreadCount > 0),
    };
  });
