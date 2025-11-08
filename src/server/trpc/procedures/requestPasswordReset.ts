import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import crypto from "crypto";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

const resend = new Resend(env.RESEND_API_KEY);

export const requestPasswordReset = baseProcedure
  .input(
    z.object({
      email: z.string().email(),
    })
  )
  .mutation(async ({ input }) => {
    // Find user by email
    const user = await db.user.findUnique({
      where: { email: input.email },
    });

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (!user) {
      return {
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      };
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Set token expiry to 1 hour from now
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1);

    // Store token in database
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: tokenExpiry,
      },
    });

    // Generate reset URL
    const baseUrl = env.BASE_URL || "http://localhost:5173";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send email with reset link
    if (user.receiveEmailNotifications) {
      try {
        await resend.emails.send({
          from: env.FROM_EMAIL,
          to: user.email,
          subject: "Reset Your Password 🔑",
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
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
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
                  .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                    color: white;
                    padding: 14px 28px;
                    border-radius: 6px;
                    text-decoration: none;
                    font-weight: bold;
                    margin: 20px 0;
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
                  .link-box {
                    background: white;
                    padding: 15px;
                    border-radius: 6px;
                    border: 1px solid #e5e7eb;
                    margin: 20px 0;
                    word-break: break-all;
                    font-size: 12px;
                    color: #6b7280;
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1>🔑 Reset Your Password</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">We received a request to reset your password</p>
                </div>
                
                <div class="content">
                  <p>Hi <strong>${user.name}</strong>,</p>
                  
                  <p>We received a request to reset the password for your account. Click the button below to create a new password:</p>
                  
                  <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                  </div>
                  
                  <p style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 10px;">
                    Or copy and paste this link into your browser:
                  </p>
                  
                  <div class="link-box">
                    ${resetUrl}
                  </div>
                  
                  <div class="warning-box">
                    <p><strong>⚠️ Important:</strong> This password reset link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.</p>
                  </div>
                  
                  <p>If you continue to have problems, please contact your administrator.</p>
                  
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
        console.error(`Failed to send password reset email to ${user.email}:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send password reset email. Please try again later.",
        });
      }
    }

    return {
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    };
  });
