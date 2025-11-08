import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const markMessageAsRead = baseProcedure
  .input(
    z.object({
      token: z.string(),
      messageId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "view_messages");

    // Verify message exists and user has access to it
    const message = await db.message.findUnique({
      where: { id: input.messageId },
      include: {
        show: true,
      },
    });

    if (!message) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Message not found",
      });
    }

    // Verify user has access to the show
    if (message.show.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this message",
      });
    }

    // Verify user has access to the show
    // Users with manage_shows permission can access all shows in their company
    const canManageShows = payload.permissions.includes("manage_shows");
    
    if (!canManageShows) {
      const hasAccess = await db.userShow.findFirst({
        where: {
          userId: user.id,
          showId: message.showId,
        },
      });

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this show",
        });
      }
    }

    // Don't mark own messages as read
    if (message.senderId === user.id) {
      return { success: true, alreadyRead: true };
    }

    // Check if already marked as read
    const existingReceipt = await db.messageReadReceipt.findUnique({
      where: {
        messageId_userId: {
          messageId: input.messageId,
          userId: user.id,
        },
      },
    });

    if (existingReceipt) {
      return { success: true, alreadyRead: true };
    }

    // Create read receipt
    await db.messageReadReceipt.create({
      data: {
        messageId: input.messageId,
        userId: user.id,
      },
    });

    return { success: true, alreadyRead: false };
  });
