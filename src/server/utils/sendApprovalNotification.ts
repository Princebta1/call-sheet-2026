import { Resend } from "resend";
import { db } from "~/server/db";
import { env } from "~/server/env";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Sends an approval notification email based on the user's role
 * - Admin accounts: notification goes to Prince Madikazi (developer)
 * - Actor/Crew accounts: notification goes to Production House admin
 */
export async function sendApprovalNotification(params: {
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  productionHouseId: number;
  productionHouseName: string;
  companyId: number;
}) {
  const {
    userId,
    userName,
    userEmail,
    userRole,
    productionHouseId,
    productionHouseName,
    companyId,
  } = params;

  try {
    // Determine who should receive the approval notification
    let recipientEmail: string;
    let recipientName: string;
    let notificationType: "developer" | "production_house_admin";

    if (userRole === "Admin") {
      // Admin accounts need approval from the developer (Prince Madikazi)
      recipientEmail = env.FROM_EMAIL; // equivob@gmail.com
      recipientName = "Prince Madikazi";
      notificationType = "developer";
    } else if (userRole === "Actor" || userRole === "Crew") {
      // Actor/Crew accounts need approval from Production House admin
      const productionHouse = await db.productionHouse.findUnique({
        where: { id: productionHouseId },
        include: {
          admin: true,
        },
      });

      if (!productionHouse?.admin) {
        console.error(
          `No admin found for production house ${productionHouseId}. Cannot send approval notification.`
        );
        return;
      }

      recipientEmail = productionHouse.admin.email;
      recipientName = productionHouse.admin.name;
      notificationType = "production_house_admin";
    } else {
      // Unknown role, skip notification
      console.warn(`Unknown role "${userRole}" for user ${userId}. Skipping approval notification.`);
      return;
    }

    // Send the approval notification email
    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: recipientEmail,
      subject: `New ${userRole} Account Pending Approval - ${userName}`,
      html: generateApprovalEmailHtml({
        recipientName,
        userName,
        userEmail,
        userRole,
        productionHouseName,
        notificationType,
      }),
    });

    console.log(
      `Approval notification sent to ${recipientEmail} for ${userRole} account: ${userName} (${userEmail})`
    );
  } catch (error) {
    console.error(`Failed to send approval notification for user ${userId}:`, error);
    // Don't throw - user was created successfully, email is just a notification
  }
}

/**
 * Generates the HTML content for approval notification emails
 */
function generateApprovalEmailHtml(params: {
  recipientName: string;
  userName: string;
  userEmail: string;
  userRole: string;
  productionHouseName: string;
  notificationType: "developer" | "production_house_admin";
}) {
  const {
    recipientName,
    userName,
    userEmail,
    userRole,
    productionHouseName,
    notificationType,
  } = params;

  const isDeveloperNotification = notificationType === "developer";

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
          <h1>⚠️ Account Approval Required</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">New ${userRole} Account Registration</p>
        </div>
        
        <div class="content">
          <p>Hi <strong>${recipientName}</strong>,</p>
          
          <p>A new ${userRole} account has been created and requires your approval before the user can access the system.</p>
          
          <div class="info-box">
            <div class="info-item">
              <div class="info-label">User Name:</div>
              <div class="info-value">${userName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email:</div>
              <div class="info-value">${userEmail}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Role:</div>
              <div class="info-value">${userRole}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Production House:</div>
              <div class="info-value">${productionHouseName}</div>
            </div>
          </div>
          
          <div class="action-box">
            <p><strong>Action Required:</strong> Please log in to the system to review and ${
              isDeveloperNotification ? "approve or reject" : "approve or reject"
            } this account application.</p>
          </div>
          
          <p><strong>To approve or reject this account:</strong></p>
          <ol>
            <li>Log in to the production management system</li>
            <li>Navigate to ${
              isDeveloperNotification
                ? "Developer Dashboard → Companies → View Users"
                : "Production House → Team Management"
            }</li>
            <li>Find ${userName} in the pending approvals list</li>
            <li>Review their information and approve or reject their application</li>
          </ol>
          
          ${
            isDeveloperNotification
              ? `<p><strong>Note:</strong> As a Developer, you are responsible for approving Admin accounts to ensure proper access control for production houses.</p>`
              : `<p><strong>Note:</strong> As the Production House admin, you are responsible for approving Actor and Crew accounts for your production house.</p>`
          }
          
          <div class="footer">
            <p>This is an automated notification from your production management system.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
