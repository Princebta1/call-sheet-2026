import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";
import { Resend } from "resend";
import { env } from "~/server/env";

const resend = new Resend(env.RESEND_API_KEY);

export const rejectShow = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      reason: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    // Only developers can reject shows
    if (payload.role !== "Developer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only developers can reject shows",
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
      data: { approvalStatus: "rejected" },
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
          subject: `Show Rejected - ${show.title}`,
          html: generateShowRejectedEmailHtml({
            recipientName: creator.name,
            showTitle: show.title,
            productionHouseName: show.productionHouse?.name || "Unknown",
            reason: input.reason,
          }),
        });
        console.log(`Show rejection notification sent to ${creator.email} for show: ${show.title}`);
      }
    } catch (error) {
      console.error(`Failed to send show rejection notification:`, error);
      // Don't throw - show was rejected successfully, email is just a notification
    }

    return {
      id: updatedShow.id,
      title: updatedShow.title,
      approvalStatus: updatedShow.approvalStatus,
    };
  });

function generateShowRejectedEmailHtml(params: {
  recipientName: string;
  showTitle: string;
  productionHouseName: string;
  reason?: string;
}) {
  const { recipientName, showTitle, productionHouseName, reason } = params;

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
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
            border-left: 4px solid #ef4444;
            margin: 20px 0;
          }
          .reason-box {
            background: #fef2f2;
            border: 1px solid #fecaca;
            padding: 15px;
            border-radius: 6px;
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
          <h1>❌ Show Rejected</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your show was not approved</p>
        </div>
        
        <div class="content">
          <p>Hi <strong>${recipientName}</strong>,</p>
          
          <p>Unfortunately, your show has been rejected by the developer and cannot proceed to production at this time.</p>
          
          <div class="info-box">
            <p><strong>Show Title:</strong> ${showTitle}</p>
            <p><strong>Production House:</strong> ${productionHouseName}</p>
          </div>
          
          ${reason ? `
          <div class="reason-box">
            <p style="margin: 0; color: #991b1b;"><strong>Reason for Rejection:</strong></p>
            <p style="margin: 10px 0 0 0; color: #991b1b;">${reason}</p>
          </div>
          ` : ''}
          
          <p>If you have questions or would like to discuss this decision, please contact the developer or system administrator.</p>
          
          <div class="footer">
            <p>This is an automated notification from your production management system.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
