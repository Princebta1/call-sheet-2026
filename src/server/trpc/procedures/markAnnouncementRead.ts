import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const markAnnouncementRead = baseProcedure
  .input(
    z.object({
      token: z.string(),
      announcementId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Find the recipient record for this user and announcement
    const recipient = await db.announcementRecipient.findFirst({
      where: {
        announcementId: input.announcementId,
        userId: user.id,
      },
    });

    if (!recipient) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Announcement not found or you are not a recipient",
      });
    }

    // Update the readAt timestamp
    await db.announcementRecipient.update({
      where: { id: recipient.id },
      data: { readAt: new Date() },
    });

    return { success: true };
  });
