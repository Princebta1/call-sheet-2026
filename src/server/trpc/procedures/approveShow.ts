import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";
import { Resend } from "resend";
import { env } from "~/server/env";

const resend = new Resend(env.RESEND_API_KEY);

export const approveShow = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    // Only developers can approve shows
    if (payload.role !== "Developer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only developers can approve shows",
      });
    }

    // Get the show
    const show = await db.show.findUnique({
      where: { id: input.showId },
      include: {
        productionHouse: true,
        company: true,
      },
    });

    if (!show) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    if (show.approvalStatus !== "pending") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Show is not pending approval",
      });
    }

    // Update the show's approval status
    const updatedShow = await db.show.update({
      where: { id: input.showId },
      data: { approvalStatus: "approved" },
    });

    // Send notification to the creator
    try {
      const creator = await db.user.findUnique({
        where: { id: show.createdBy },
      });

      if (creator) {
        await resend.emails.send({
          from: env.FROM_EMAIL,
          to: creator.email,
          subject: `Show Approved - ${show.title}`,
          html: generateShowApprovedEmailHtml({
            recipientName: creator.name,
            showTitle: show.title,
            productionHouseName: show.productionHouse?.name || "Unknown",
          }),
        });
        console.log(`Show approval notification sent to ${creator.email} for show: ${show.title}`);
      }
    } catch (error) {
      console.error(`Failed to send show approval notification:`, error);
      // Don't throw - show was approved successfully, email is just a notification
    }

    return {
      id: updatedShow.id,
      title: updatedShow.title,
      approvalStatus: updatedShow.approvalStatus,
    };
  });

function generateShowApprovedEmailHtml(params: {
  recipientName: string;
  showTitle: string;
  productionHouseName: string;
}) {
  const { recipientName, showTitle, productionHouseName } = params;

  return `
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
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
          .info-box {
            background: white;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #10b981;
            margin: 20px 0;
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
          <h1>✅ Show Approved!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your show has been approved</p>
        </div>
        
        <div class="content">
          <p>Hi <strong>${recipientName}</strong>,</p>
          
          <p>Great news! Your show has been approved by the developer and is now ready for production.</p>
          
          <div class="info-box">
            <p><strong>Show Title:</strong> ${showTitle}</p>
            <p><strong>Production House:</strong> ${productionHouseName}</p>
          </div>
          
          <p>You can now:</p>
          <ul>
            <li>Add scenes to the show</li>
            <li>Assign cast and crew members</li>
            <li>Create call sheets</li>
            <li>Begin production planning</li>
          </ul>
          
          <p>Log in to the production management system to get started!</p>
          
          <div class="footer">
            <p>This is an automated notification from your production management system.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
