import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const updateUserProfile = baseProcedure
  .input(
    z.object({
      token: z.string(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      profileImage: z.string().url().optional(),
      receiveEmailNotifications: z.boolean().optional(),
      receiveSmsNotifications: z.boolean().optional(),
      statusMessage: z.string().max(100).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Check if the new email is already taken by another user
    if (input.email && input.email !== user.email) {
      const existingUser = await db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser && existingUser.id !== user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A user with this email already exists",
        });
      }
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.profileImage !== undefined) updateData.profileImage = input.profileImage;
    if (input.receiveEmailNotifications !== undefined) {
      updateData.receiveEmailNotifications = input.receiveEmailNotifications;
    }
    if (input.receiveSmsNotifications !== undefined) {
      updateData.receiveSmsNotifications = input.receiveSmsNotifications;
    }
    if (input.statusMessage !== undefined) updateData.statusMessage = input.statusMessage;

    // Update user
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profileImage: updatedUser.profileImage,
      receiveEmailNotifications: updatedUser.receiveEmailNotifications,
      receiveSmsNotifications: updatedUser.receiveSmsNotifications,
      statusMessage: updatedUser.statusMessage,
    };
  });
