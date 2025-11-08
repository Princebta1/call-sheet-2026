import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";
import { Resend } from "resend";
import { env } from "~/server/env";

const resend = new Resend(env.RESEND_API_KEY);

export const createAnnouncement = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number().optional(),
      subject: z.string().min(1, "Subject is required"),
      content: z.string().min(1, "Content is required"),
      type: z.enum(["production_update", "call_sheet_update", "schedule_change", "general"]).default("general"),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      recipientUserIds: z.array(z.number()).optional(),
      recipientGroupIds: z.array(z.number()).optional(),
      sendEmailNotification: z.boolean().default(true),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "send_announcements");

    // Validate that at least one recipient is specified
    if (
      (!input.recipientUserIds || input.recipientUserIds.length === 0) &&
      (!input.recipientGroupIds || input.recipientGroupIds.length === 0)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "At least one recipient (user or group) must be specified",
      });
    }

    // If showId is provided, verify it belongs to the user's company
    if (input.showId) {
      const show = await db.show.findUnique({
        where: { id: input.showId },
      });

      if (!show || show.companyId !== user.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Show not found",
        });
      }
    }

    // Create the announcement
    const announcement = await db.announcement.create({
      data: {
        companyId: user.companyId,
        showId: input.showId,
        senderId: user.id,
        subject: input.subject,
        content: input.content,
        type: input.type,
        priority: input.priority,
      },
    });

    // Create recipient records for individual users
    if (input.recipientUserIds && input.recipientUserIds.length > 0) {
      await Promise.all(
        input.recipientUserIds.map((userId) =>
          db.announcementRecipient.create({
            data: {
              announcementId: announcement.id,
              userId,
            },
          })
        )
      );
    }

    // Create recipient records for groups
    if (input.recipientGroupIds && input.recipientGroupIds.length > 0) {
      await Promise.all(
        input.recipientGroupIds.map((groupId) =>
          db.announcementRecipient.create({
            data: {
              announcementId: announcement.id,
              recipientGroupId: groupId,
            },
          })
        )
      );
    }

    // Send email notifications if enabled
    if (input.sendEmailNotification) {
      try {
        // Get all recipient users
        const recipientUsers = new Set<number>();

        // Add individual recipients
        if (input.recipientUserIds) {
          input.recipientUserIds.forEach((id) => recipientUsers.add(id));
        }

        // Add group members
        if (input.recipientGroupIds) {
          const groupMembers = await db.recipientGroupMember.findMany({
            where: {
              groupId: { in: input.recipientGroupIds },
            },
            select: { userId: true },
          });
          groupMembers.forEach((member) => recipientUsers.add(member.userId));
        }

        // Fetch user details
        const users = await db.user.findMany({
          where: {
            id: { in: Array.from(recipientUsers) },
            isActive: true,
            receiveEmailNotifications: true,
          },
          select: {
            email: true,
            name: true,
          },
        });

        // Get show title if applicable
        let showTitle = "Company-wide";
        if (input.showId) {
          const show = await db.show.findUnique({
            where: { id: input.showId },
            select: { title: true },
          });
          if (show) {
            showTitle = show.title;
          }
        }

        // Send emails
        const emailPromises = users.map(async (recipient) => {
          try {
            const priorityBadge = input.priority === "urgent" ? "🚨 URGENT" : 
                                  input.priority === "high" ? "⚠️ HIGH PRIORITY" : "";
            
            const typeLabel = input.type === "production_update" ? "Production Update" :
                             input.type === "call_sheet_update" ? "Call Sheet Update" :
                             input.type === "schedule_change" ? "Schedule Change" :
                             "Announcement";

            await resend.emails.send({
              from: env.FROM_EMAIL,
              to: recipient.email,
              subject: `${priorityBadge ? priorityBadge + " - " : ""}${input.subject}`,
              html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                      }
                      .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        border-radius: 8px 8px 0 0;
                        text-align: center;
                      }
                      .header h1 {
                        margin: 0;
                        font-size: 24px;
                      }
                      .content {
                        background: #f9fafb;
                        padding: 30px;
                        border-radius: 0 0 8px 8px;
                      }
                      .badge {
                        display: inline-block;
                        padding: 6px 12px;
                        border-radius: 6px;
                        font-size: 12px;
                        font-weight: bold;
                        margin-bottom: 15px;
                      }
                      .badge-urgent {
                        background: #fee2e2;
                        color: #991b1b;
                      }
                      .badge-high {
                        background: #fef3c7;
                        color: #92400e;
                      }
                      .badge-normal {
                        background: #dbeafe;
                        color: #1e40af;
                      }
                      .message-box {
                        background: white;
                        padding: 20px;
                        border-radius: 6px;
                        border-left: 4px solid #667eea;
                        margin: 20px 0;
                      }
                      .meta {
                        font-size: 14px;
                        color: #6b7280;
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #e5e7eb;
                      }
                      .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #e5e7eb;
                        color: #6b7280;
                        font-size: 14px;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <h1>📢 ${typeLabel}</h1>
                      <p style="margin: 10px 0 0 0; opacity: 0.9;">${showTitle}</p>
                    </div>
                    
                    <div class="content">
                      ${input.priority !== "normal" ? `
                        <div class="badge badge-${input.priority}">
                          ${input.priority === "urgent" ? "🚨 URGENT" : "⚠️ HIGH PRIORITY"}
                        </div>
                      ` : ""}
                      
                      <h2 style="margin-top: 0; color: #111827;">${input.subject}</h2>
                      
                      <div class="message-box">
                        ${input.content.replace(/\n/g, "<br>")}
                      </div>
                      
                      <div class="meta">
                        <p><strong>From:</strong> ${user.name}</p>
                        <p><strong>Type:</strong> ${typeLabel}</p>
                        <p><strong>Sent:</strong> ${new Date().toLocaleString()}</p>
                      </div>
                      
                      <div class="footer">
                        <p>This is an automated notification from your production management system.</p>
                      </div>
                    </div>
                  </body>
                </html>
              `,
            });
          } catch (error) {
            console.error(`Failed to send announcement email to ${recipient.email}:`, error);
          }
        });

        await Promise.all(emailPromises);
      } catch (error) {
        console.error("Error sending announcement emails:", error);
        // Don't throw - announcement was created successfully
      }
    }

    return {
      success: true,
      announcementId: announcement.id,
    };
  });
