import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const updateUserStatus = baseProcedure
  .input(
    z.object({
      token: z.string(),
      userId: z.number(),
      isActive: z.boolean().optional(),
      approvedByAdmin: z.boolean().optional(),
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
        message: "You don't have permission to update user status",
      });
    }

    // Get the user to be updated
    const targetUser = await db.user.findUnique({
      where: { id: input.userId },
    });

    if (!targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Verify the user is in the same company
    if (targetUser.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot update users from other companies",
      });
    }

    // Prevent users from changing their own status
    if (targetUser.id === user.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot change your own status",
      });
    }

    // Build update data
    const updateData: { isActive?: boolean; approvedByAdmin?: boolean } = {};
    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }
    if (input.approvedByAdmin !== undefined) {
      updateData.approvedByAdmin = input.approvedByAdmin;
    }

    // Update the user's status
    const updatedUser = await db.user.update({
      where: { id: input.userId },
      data: updateData,
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
        approvedByAdmin: updatedUser.approvedByAdmin,
      },
    };
  });
