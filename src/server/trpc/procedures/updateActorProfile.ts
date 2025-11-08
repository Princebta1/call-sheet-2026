import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const updateActorProfile = baseProcedure
  .input(
    z.object({
      token: z.string(),
      userId: z.number(),
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user: currentUser } = await authenticateUser(input.token);

    // Only admins and developers can update other users' profiles
    if (currentUser.role !== "Admin" && currentUser.role !== "Developer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can update user profiles",
      });
    }

    // Get the target user
    const targetUser = await db.user.findUnique({
      where: { id: input.userId },
    });

    if (!targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Ensure the target user is in the same company
    if (targetUser.companyId !== currentUser.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot update users from other companies",
      });
    }

    // Check if the new email is already taken by another user
    if (input.email !== targetUser.email) {
      const existingUser = await db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser && existingUser.id !== input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A user with this email already exists",
        });
      }
    }

    // Update the user
    const updatedUser = await db.user.update({
      where: { id: input.userId },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
      },
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
    };
  });
