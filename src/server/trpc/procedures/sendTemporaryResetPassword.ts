import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, hashPassword } from "~/server/utils/auth";
import { env } from "~/server/env";

const resend = new Resend(env.RESEND_API_KEY);

export const sendTemporaryResetPassword = baseProcedure
  .input(
    z.object({
      token: z.string(),
      userId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user: requestingUser } = await authenticateUser(input.token);

    // Check if requesting user has permission to manage team
    const userRole = await db.role.findUnique({
      where: { id: requestingUser.roleId ?? 0 },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    const hasPermission = userRole?.rolePermissions.some(
      (rp) => rp.permission.name === "manage_team"
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to reset user passwords",
      });
    }

    // Get the target user
    const targetUser = await db.user.findUnique({
      where: { id: input.userId },
      include: { role: true },
    });

    if (!targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Verify the target user is in the same company
    if (targetUser.companyId !== requestingUser.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only reset passwords for users in your company",
      });
    }

    // Prevent resetting your own password this way
    if (targetUser.id === requestingUser.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Use the 'Change Password' feature to update your own password",
      });
    }

    // Get the current user's role to check if they're a Developer
    const currentUserRole = await db.role.findUnique({
      where: { id: requestingUser.roleId ?? 0 },
    });

    // Prevent non-Developers from resetting a Developer's password
    if (targetUser.role?.name === "Developer" && currentUserRole?.name !== "Developer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Developers can reset the password of another Developer",
      });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await hashPassword(tempPassword);

    // Update the user's password
    await db.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
      },
    });

    // Send email with temporary password
    if (targetUser.receiveEmailNotifications) {
      try {
        await resend.emails.send({
          from: env.FROM_EMAIL,
          to: targetUser.email,
          subject: "Your Password Has Been Reset 🔐",
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
                    background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
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
                  .credentials-box {
                    background: white;
                    padding: 20px;
                    border-radius: 6px;
                    border-left: 4px solid #dc2626;
                    margin: 20px 0;
                  }
                  .credential-item {
                    margin: 10px 0;
                  }
                  .credential-label {
                    font-weight: bold;
                    color: #4b5563;
                    font-size: 14px;
                  }
                  .credential-value {
                    font-family: 'Courier New', monospace;
                    background: #f3f4f6;
                    padding: 8px 12px;
                    border-radius: 4px;
                    margin-top: 4px;
                    font-size: 16px;
                    color: #1f2937;
                  }
                  .warning-box {
                    background: #fef3c7;
                    border: 1px solid #fbbf24;
                    padding: 15px;
                    border-radius: 6px;
                    margin: 20px 0;
                  }
                  .warning-box p {
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
                  <h1>🔐 Password Reset</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Your password has been reset by an administrator</p>
                </div>
                
                <div class="content">
                  <p>Hi <strong>${targetUser.name}</strong>,</p>
                  
                  <p>An administrator has reset your password. You can now log in using the temporary password below.</p>
                  
                  <div class="warning-box">
                    <p><strong>⚠️ Important:</strong> This is a temporary password. Please change it immediately after logging in by going to Settings → User Profile → Change Password.</p>
                  </div>
                  
                  <div class="credentials-box">
                    <div class="credential-item">
                      <div class="credential-label">Email:</div>
                      <div class="credential-value">${targetUser.email}</div>
                    </div>
                    <div class="credential-item">
                      <div class="credential-label">Temporary Password:</div>
                      <div class="credential-value">${tempPassword}</div>
                    </div>
                  </div>
                  
                  <p>To log in:</p>
                  <ol>
                    <li>Visit the login page</li>
                    <li>Use your email and the temporary password above</li>
                    <li>Go to Settings → User Profile</li>
                    <li>Change your password to something secure and memorable</li>
                  </ol>
                  
                  <p>If you did not request this password reset, please contact your administrator immediately.</p>
                  
                  <div class="footer">
                    <p>This is an automated message from your production management system.</p>
                    <p>Please do not reply to this email.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });
      } catch (error) {
        console.error(`Failed to send password reset email to ${targetUser.email}:`, error);
        // Don't throw - password was reset successfully, email is just a nice-to-have
      }
    }

    return {
      success: true,
      temporaryPassword: tempPassword,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
    };
  });
