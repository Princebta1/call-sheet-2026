import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getAnnouncementStats = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Get user's recipient groups
    const userGroups = await db.recipientGroupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });
    const groupIds = userGroups.map((g) => g.groupId);

    // Count total announcements
    const totalAnnouncements = await db.announcement.count({
      where: {
        companyId: user.companyId,
        recipients: {
          some: {
            OR: [
              { userId: user.id },
              { recipientGroupId: { in: groupIds } },
            ],
          },
        },
      },
    });

    // Count unread announcements
    const unreadAnnouncements = await db.announcement.count({
      where: {
        companyId: user.companyId,
        recipients: {
          some: {
            OR: [
              { userId: user.id, readAt: null },
              { recipientGroupId: { in: groupIds } },
            ],
          },
        },
      },
    });

    // Count urgent/high priority unread announcements
    const urgentUnread = await db.announcement.count({
      where: {
        companyId: user.companyId,
        priority: { in: ["urgent", "high"] },
        recipients: {
          some: {
            OR: [
              { userId: user.id, readAt: null },
              { recipientGroupId: { in: groupIds } },
            ],
          },
        },
      },
    });

    return {
      total: totalAnnouncements,
      unread: unreadAnnouncements,
      urgentUnread,
    };
  });
