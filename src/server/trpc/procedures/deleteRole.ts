import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const deleteRole = baseProcedure
  .input(
    z.object({
      token: z.string(),
      roleId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Check if user has permission to manage roles
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
      (rp) => rp.permission.name === "manage_roles"
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to manage roles",
      });
    }

    // Get the role to delete
    const role = await db.role.findUnique({
      where: { id: input.roleId },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Role not found",
      });
    }

    // Cannot delete system roles
    if (role.isSystemRole) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot delete system roles",
      });
    }

    // Verify the role belongs to the user's company
    if (role.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot delete roles from other companies",
      });
    }

    // Cannot delete if users are assigned to this role
    if (role._count.users > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot delete role with ${role._count.users} assigned user${role._count.users > 1 ? "s" : ""}. Please reassign users first.`,
      });
    }

    // Delete the role (cascade will handle rolePermissions)
    await db.role.delete({
      where: { id: input.roleId },
    });

    return {
      success: true,
    };
  });
