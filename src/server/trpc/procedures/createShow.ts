import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";
import { Resend } from "resend";
import { env } from "~/server/env";

const resend = new Resend(env.RESEND_API_KEY);

export const createShow = baseProcedure
  .input(
    z.object({
      token: z.string(),
      title: z.string().min(1),
      productionHouseId: z.number(),
      thumbnailURL: z.string().nullable().optional(),
      description: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.enum(["Pre-Production", "Shooting", "Wrapped"]).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_shows");

    // Verify that the production house belongs to the user's company
    const productionHouse = await db.productionHouse.findUnique({
      where: { id: input.productionHouseId },
    });

    if (!productionHouse) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Production house not found",
      });
    }

    if (productionHouse.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only assign shows to production houses within your company",
      });
    }

    // Determine approval status based on creator's role
    // Developers auto-approve, others need approval
    const approvalStatus = payload.role === "Developer" ? "approved" : "pending";
    const needsApproval = payload.role === "Admin" || payload.role === "Production Admin";

    const show = await db.show.create({
      data: {
        companyId: user.companyId,
        title: input.title,
        productionHouseId: input.productionHouseId,
        thumbnailURL: input.thumbnailURL || null,
        description: input.description,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        status: input.status || "Pre-Production",
        approvalStatus,
        createdBy: user.id,
      },
    });

    // Send notification to developer if approval is needed
    if (needsApproval) {
      try {
        await resend.emails.send({
          from: env.FROM_EMAIL,
          to: env.FROM_EMAIL, // Developer's email
          subject: `New Show Pending Approval - ${input.title}`,
          html: generateShowApprovalEmailHtml({
            showTitle: input.title,
            showDescription: input.description || "No description provided",
            productionHouseName: productionHouse.name,
            creatorName: user.name,
            creatorEmail: user.email,
            creatorRole: payload.role,
            companyName: user.company.name,
          }),
        });
        console.log(`Show approval notification sent to developer for show: ${input.title}`);
      } catch (error) {
        console.error(`Failed to send show approval notification:`, error);
        // Don't throw - show was created successfully, email is just a notification
      }
    }

    return {
      id: show.id,
      title: show.title,
      productionHouseId: show.productionHouseId,
      thumbnailURL: show.thumbnailURL,
      description: show.description,
      status: show.status,
      approvalStatus: show.approvalStatus,
      startDate: show.startDate,
      endDate: show.endDate,
    };
  });

/**
 * Generates the HTML content for show approval notification emails
 */
function generateShowApprovalEmailHtml(params: {
  showTitle: string;
  showDescription: string;
  productionHouseName: string;
  creatorName: string;
  creatorEmail: string;
  creatorRole: string;
  companyName: string;
}) {
  const {
    showTitle,
    showDescription,
    productionHouseName,
    creatorName,
    creatorEmail,
    creatorRole,
    companyName,
  } = params;

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
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
            border-left: 4px solid #f59e0b;
            margin: 20px 0;
          }
          .info-item {
            margin: 10px 0;
          }
          .info-label {
            font-weight: bold;
            color: #4b5563;
            font-size: 14px;
          }
          .info-value {
            color: #1f2937;
            font-size: 16px;
            margin-top: 4px;
          }
          .action-box {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .action-box p {
            margin: 0;
            color: #92400e;
            font-size: 14px;
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
          <h1>🎬 New Show Approval Required</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">A new show has been created</p>
        </div>
        
        <div class="content">
          <p>Hi <strong>Developer</strong>,</p>
          
          <p>A new show has been created by a ${creatorRole} and requires your approval before production can begin.</p>
          
          <div class="info-box">
            <div class="info-item">
              <div class="info-label">Show Title:</div>
              <div class="info-value">${showTitle}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Description:</div>
              <div class="info-value">${showDescription}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Production House:</div>
              <div class="info-value">${productionHouseName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Company:</div>
              <div class="info-value">${companyName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Created By:</div>
              <div class="info-value">${creatorName} (${creatorEmail})</div>
            </div>
            <div class="info-item">
              <div class="info-label">Role:</div>
              <div class="info-value">${creatorRole}</div>
            </div>
          </div>
          
          <div class="action-box">
            <p><strong>Action Required:</strong> Please log in to the system to review and approve or reject this show.</p>
          </div>
          
          <p><strong>To approve or reject this show:</strong></p>
          <ol>
            <li>Log in to the production management system</li>
            <li>Navigate to Developer Dashboard → Pending Shows</li>
            <li>Find "${showTitle}" in the pending approvals list</li>
            <li>Review the show information and approve or reject</li>
          </ol>
          
          <p><strong>Note:</strong> Until the show is approved, it will not be visible to production staff and no work can begin on it.</p>
          
          <div class="footer">
            <p>This is an automated notification from your production management system.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
