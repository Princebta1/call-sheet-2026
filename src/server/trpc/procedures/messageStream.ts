import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const messageStream = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      recipientId: z.number().optional(), // Filter for direct messages with specific user
    })
  )
  .subscription(async function* ({ input }) {
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

    // Track the last message ID we've seen
    let lastMessageId = 0;

    // Get the most recent message ID to start from
    const latestMessage = await db.message.findFirst({
      where: { showId: input.showId },
      orderBy: { id: "desc" },
      select: { id: true },
    });

    if (latestMessage) {
      lastMessageId = latestMessage.id;
    }

    // Poll for new messages
    while (true) {
      // Wait before checking for new messages
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Build where clause for filtering new messages
      const whereClause: any = {
        showId: input.showId,
        id: {
          gt: lastMessageId,
        },
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

      // Check for new messages
      const newMessages = await db.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              lastActiveAt: true,
              statusMessage: true,
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
              statusMessage: true,
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
          id: "asc",
        },
      });

      // Yield each new message
      for (const message of newMessages) {
        lastMessageId = message.id;
        
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
        
        yield {
          id: message.id,
          showId: message.showId,
          content: message.content,
          createdAt: message.createdAt,
          sender: {
            id: message.sender.id,
            name: message.sender.name,
            profileImage: message.sender.profileImage,
            lastActiveAt: message.sender.lastActiveAt,
            statusMessage: message.sender.statusMessage,
            role: message.sender.role?.name || "Unknown",
          },
          recipient: message.recipient
            ? {
                id: message.recipient.id,
                name: message.recipient.name,
                profileImage: message.recipient.profileImage,
                statusMessage: message.recipient.statusMessage,
              }
            : null,
          attachments: message.attachments,
          isRead: !!currentUserReadReceipt,
          readAt: currentUserReadReceipt?.readAt || null,
          readBy: readBy,
        };
      }
    }
  });
