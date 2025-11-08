import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const createMessage = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      recipientId: z.number().optional(),
      content: z.string().min(1, "Message content is required"),
      attachments: z.array(
        z.object({
          url: z.string(),
          fileName: z.string(),
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
        })
      ).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "send_messages");

    // Verify show exists and belongs to user's company
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

    // If recipientId is provided, verify the recipient exists and has access to the show
    if (input.recipientId) {
      const recipient = await db.user.findUnique({
        where: { id: input.recipientId },
      });

      if (!recipient || recipient.companyId !== user.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recipient not found",
        });
      }

      // Verify recipient has access to the show
      const hasAccess = await db.userShow.findFirst({
        where: {
          userId: input.recipientId,
          showId: input.showId,
        },
      });

      if (!hasAccess) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Recipient does not have access to this show",
        });
      }
    }

    // Create the message
    const message = await db.message.create({
      data: {
        showId: input.showId,
        senderId: user.id,
        recipientId: input.recipientId,
        content: input.content,
        attachments: input.attachments
          ? {
              create: input.attachments.map((attachment) => ({
                url: attachment.url,
                fileName: attachment.fileName,
                fileSize: attachment.fileSize,
                mimeType: attachment.mimeType,
              })),
            }
          : undefined,
      },
      include: {
        attachments: true,
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
        recipient: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    return {
      success: true,
      message: {
        id: message.id,
        showId: message.showId,
        content: message.content,
        createdAt: message.createdAt,
        sender: {
          id: message.sender.id,
          name: message.sender.name,
          profileImage: message.sender.profileImage,
          role: message.sender.role?.name || "Unknown",
        },
        recipient: message.recipient
          ? {
              id: message.recipient.id,
              name: message.recipient.name,
              profileImage: message.recipient.profileImage,
            }
          : null,
        attachments: message.attachments.map((att) => ({
          id: att.id,
          url: att.url,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
        })),
      },
    };
  });
