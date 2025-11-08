import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, comparePassword, hashPassword } from "~/server/utils/auth";

export const changePassword = baseProcedure
  .input(
    z.object({
      token: z.string(),
      currentPassword: z.string().min(1, "Current password is required"),
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
    const { user } = await authenticateUser(input.token);

    // Verify current password
    const isValidPassword = await comparePassword(
      input.currentPassword,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Current password is incorrect",
      });
    }

    // Check that new password is different from current password
    const isSamePassword = await comparePassword(
      input.newPassword,
      user.passwordHash
    );

    if (isSamePassword) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "New password must be different from current password",
      });
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(input.newPassword);

    // Update user's password
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  });
