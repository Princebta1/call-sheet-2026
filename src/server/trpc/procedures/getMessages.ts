import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const getMessages = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      recipientId: z.number().optional(), // Filter for direct messages with specific user
      limit: z.number().min(1).max(100).default(50),
      cursor: z.number().optional(), // For pagination
    })
  )
  .query(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "view_messages");

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

    // Build where clause for filtering
    const whereClause: any = {
      showId: input.showId,
    };

    // If recipientId is provided, filter for direct messages between user and recipient
    if (input.recipientId) {
      whereClause.OR = [
        {
          senderId: user.id,
          recipientId: input.recipientId,
        },
        {
          senderId: input.recipientId,
          recipientId: user.id,
        },
      ];
    } else {
      // Show all messages in the channel (no specific recipient or messages where user is sender/recipient)
      whereClause.OR = [
        { recipientId: null }, // Channel messages
        { senderId: user.id }, // Messages sent by user
        { recipientId: user.id }, // Messages sent to user
      ];
    }

    // Add cursor for pagination
    if (input.cursor) {
      whereClause.id = {
        lt: input.cursor,
      };
    }

    const messages = await db.message.findMany({
      where: whereClause,
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
        recipient: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
        attachments: {
          select: {
            id: true,
            url: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
          },
        },
        readReceipts: {
          select: {
            userId: true,
            readAt: true,
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: input.limit + 1, // Take one extra to determine if there are more
    });

    let nextCursor: number | undefined = undefined;
    if (messages.length > input.limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id;
    }

    return {
      messages: messages.reverse().map((message) => {
        // Check if current user has read this message
        const currentUserReadReceipt = message.readReceipts.find(
          (receipt) => receipt.userId === user.id
        );
        
        // For messages sent by current user, get all read receipts
        const isOwnMessage = message.senderId === user.id;
        const readBy = isOwnMessage
          ? message.readReceipts.map((receipt) => ({
              userId: receipt.user.id,
              userName: receipt.user.name,
              userProfileImage: receipt.user.profileImage,
              readAt: receipt.readAt,
            }))
          : [];

        return {
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
          attachments: message.attachments,
          isRead: !!currentUserReadReceipt,
          readAt: currentUserReadReceipt?.readAt || null,
          readBy: readBy,
        };
      }),
      nextCursor,
    };
  });
