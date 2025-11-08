import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, hashPassword } from "~/server/utils/auth";
import { env } from "~/server/env";

const resend = new Resend(env.RESEND_API_KEY);

export const inviteBulkUsers = baseProcedure
  .input(
    z.object({
      token: z.string(),
      users: z.array(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().optional(),
          roleId: z.number(),
        })
      ),
      approveImmediately: z.boolean().default(false),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Check if user has permission to manage team
    const userRole = await db.role.findUnique({
      where: { id: user.roleId ?? 0 },
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
        message: "You don't have permission to invite users",
      });
    }

    // Verify all roles exist and are available to this company
    const roleIds = [...new Set(input.users.map((u) => u.roleId))];
    const roles = await db.role.findMany({
      where: {
        id: { in: roleIds },
        OR: [
          { isSystemRole: true, companyId: null },
          { companyId: user.companyId, isSystemRole: false },
        ],
      },
    });

    const roleMap = new Map(roles.map((r) => [r.id, r]));

    // Validate all roles
    for (const roleId of roleIds) {
      const role = roleMap.get(roleId);
      if (!role) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid role ID: ${roleId}`,
        });
      }

      // If it's a system role, ensure it's one of the allowed roles
      if (role.isSystemRole) {
        const allowedSystemRoles = ["Developer", "Admin", "Manager", "Viewer", "Actor", "Crew"];
        if (!allowedSystemRoles.includes(role.name)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Role "${role.name}" is deprecated and cannot be assigned`,
          });
        }
      }
    }

    // Process each invitation
    const results = await Promise.allSettled(
      input.users.map(async (userData) => {
        // Check if user with this email already exists
        const existingUser = await db.user.findUnique({
          where: { email: userData.email },
        });

        if (existingUser) {
          throw new Error(`User with email ${userData.email} already exists`);
        }

        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        const passwordHash = await hashPassword(tempPassword);

        // Create the new user
        const newUser = await db.user.create({
          data: {
            name: userData.name,
            email: userData.email,
            passwordHash,
            phone: userData.phone,
            companyId: user.companyId,
            roleId: userData.roleId,
            approvedByAdmin: input.approveImmediately,
            isActive: input.approveImmediately,
          },
          include: {
            role: true,
          },
        });

        // Send invitation email if user has email notifications enabled
        if (newUser.receiveEmailNotifications) {
          try {
            await resend.emails.send({
              from: env.FROM_EMAIL,
              to: newUser.email,
              subject: "Welcome to the Production Team! 🎬",
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
                      .credentials-box {
                        background: white;
                        padding: 20px;
                        border-radius: 6px;
                        border-left: 4px solid #667eea;
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
                      <h1>🎬 Welcome to the Team!</h1>
                      <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to join the production</p>
                    </div>
                    
                    <div class="content">
                      <p>Hi <strong>${newUser.name}</strong>,</p>
                      
                      <p>You've been invited to join the production management system as a <strong>${newUser.role?.name || "team member"}</strong>.</p>
                      
                      <div class="warning-box">
                        <p><strong>⚠️ Important:</strong> This email contains your temporary login credentials. Please keep them secure and change your password after your first login.</p>
                      </div>
                      
                      <div class="credentials-box">
                        <div class="credential-item">
                          <div class="credential-label">Email:</div>
                          <div class="credential-value">${newUser.email}</div>
                        </div>
                        <div class="credential-item">
                          <div class="credential-label">Temporary Password:</div>
                          <div class="credential-value">${tempPassword}</div>
                        </div>
                      </div>
                      
                      <p>To get started:</p>
                      <ol>
                        <li>Visit the login page</li>
                        <li>Use the credentials above to sign in</li>
                        <li>Change your password in Settings → User Profile</li>
                        <li>Complete your profile information</li>
                      </ol>
                      
                      ${!input.approveImmediately ? `
                        <div class="warning-box">
                          <p><strong>Note:</strong> Your account requires admin approval before you can access all features. You'll receive another email once your account is approved.</p>
                        </div>
                      ` : ""}
                      
                      <p>If you have any questions or need assistance, please contact your production administrator.</p>
                      
                      <div class="footer">
                        <p>This is an automated invitation from your production management system.</p>
                        <p>Please do not reply to this email.</p>
                      </div>
                    </div>
                  </body>
                </html>
              `,
            });
          } catch (error) {
            console.error(`Failed to send invitation email to ${newUser.email}:`, error);
            // Don't throw - user was created successfully, email is just a nice-to-have
          }
        }

        return {
          success: true,
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role?.name || "No Role",
          },
          temporaryPassword: tempPassword,
        };
      })
    );

    // Format results
    const successful: Array<{
      user: { id: number; name: string; email: string; role: string };
      temporaryPassword: string;
    }> = [];
    const failed: Array<{ email: string; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successful.push(result.value);
      } else {
        failed.push({
          email: input.users[index]!.email,
          error: result.reason.message || "Unknown error",
        });
      }
    });

    return {
      successful,
      failed,
      totalProcessed: input.users.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  });
