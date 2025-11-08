import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const updateUserRole = baseProcedure
  .input(
    z.object({
      token: z.string(),
      userId: z.number(),
      roleId: z.number(),
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
        message: "You don't have permission to update user roles",
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

    // Prevent users from changing their own role
    if (targetUser.id === user.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot change your own role",
      });
    }

    // Verify the role exists and is available to this company
    const targetRole = await db.role.findFirst({
      where: {
        id: input.roleId,
        OR: [
          { isSystemRole: true, companyId: null },
          { companyId: user.companyId, isSystemRole: false },
        ],
      },
    });

    if (!targetRole) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid role selected",
      });
    }

    // If it's a system role, ensure it's one of the allowed roles
    if (targetRole.isSystemRole) {
      const allowedSystemRoles = ["Developer", "Admin", "Manager", "Viewer", "Actor", "Crew"];
      if (!allowedSystemRoles.includes(targetRole.name)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Role "${targetRole.name}" is deprecated and cannot be assigned`,
        });
      }
    }

    // Get the current user's role to check if they're a Developer
    const currentUserRole = await db.role.findUnique({
      where: { id: user.roleId ?? 0 },
    });

    // Check if target user currently has Developer role
    const targetUserCurrentRole = await db.role.findUnique({
      where: { id: targetUser.roleId ?? 0 },
    });

    // Prevent non-Developers from changing a Developer's role
    if (targetUserCurrentRole?.name === "Developer" && currentUserRole?.name !== "Developer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Developers can change the role of another Developer",
      });
    }

    // Prevent non-Developers from assigning the Developer role
    if (targetRole.name === "Developer" && currentUserRole?.name !== "Developer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Developers can assign the Developer role",
      });
    }

    // Update the user's role
    const updatedUser = await db.user.update({
      where: { id: input.userId },
      data: { roleId: input.roleId },
      include: {
        role: true,
      },
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role?.name || "No Role",
      },
    };
  });
