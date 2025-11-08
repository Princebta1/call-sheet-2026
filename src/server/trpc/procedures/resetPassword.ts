import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { hashPassword } from "~/server/utils/auth";

export const resetPassword = baseProcedure
  .input(
    z.object({
      token: z.string(),
      newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        ),
    })
  )
  .mutation(async ({ input }) => {
    // Find user by reset token
    const user = await db.user.findFirst({
      where: {
        passwordResetToken: input.token,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid or expired reset token",
      });
    }

    // Check if token is expired
    if (!user.passwordResetTokenExpiry || user.passwordResetTokenExpiry < new Date()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Reset token has expired. Please request a new password reset.",
      });
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(input.newPassword);

    // Update user's password and clear reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      },
    });

    return {
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    };
  });
