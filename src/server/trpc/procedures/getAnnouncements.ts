import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getAnnouncements = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number().optional(),
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

    // Fetch announcements where user is a recipient (directly or through groups)
    const announcements = await db.announcement.findMany({
      where: {
        companyId: user.companyId,
        ...(input.showId ? { showId: input.showId } : {}),
        recipients: {
          some: {
            OR: [
              { userId: user.id },
              { recipientGroupId: { in: groupIds } },
            ],
          },
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        show: {
          select: {
            id: true,
            title: true,
          },
        },
        recipients: {
          where: {
            userId: user.id,
          },
          select: {
            readAt: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" }, // urgent, high, normal, low
        { createdAt: "desc" },
      ],
    });

    return announcements.map((announcement) => ({
      id: announcement.id,
      subject: announcement.subject,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      createdAt: announcement.createdAt,
      sender: {
        id: announcement.sender.id,
        name: announcement.sender.name,
        profileImage: announcement.sender.profileImage,
        role: announcement.sender.role?.name || "Unknown",
      },
      show: announcement.show
        ? {
            id: announcement.show.id,
            title: announcement.show.title,
          }
        : null,
      isRead: announcement.recipients.length > 0 && announcement.recipients[0]!.readAt !== null,
      readAt: announcement.recipients.length > 0 ? announcement.recipients[0]!.readAt : null,
    }));
  });
