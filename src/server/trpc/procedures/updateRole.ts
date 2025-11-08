import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const updateRole = baseProcedure
  .input(
    z.object({
      token: z.string(),
      roleId: z.number(),
      name: z.string().min(1, "Role name is required"),
      description: z.string().optional(),
      permissionIds: z.array(z.number()).min(1, "At least one permission is required"),
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

    // Get the role to update
    const role = await db.role.findUnique({
      where: { id: input.roleId },
    });

    if (!role) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Role not found",
      });
    }

    // Cannot update system roles
    if (role.isSystemRole) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot modify system roles",
      });
    }

    // Verify the role belongs to the user's company
    if (role.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot update roles from other companies",
      });
    }

    // Check if new name conflicts with existing role (excluding current role)
    if (input.name !== role.name) {
      const existingRole = await db.role.findFirst({
        where: {
          name: input.name,
          companyId: user.companyId,
          id: { not: input.roleId },
        },
      });

      if (existingRole) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A role with this name already exists",
        });
      }
    }

    // Verify all permission IDs are valid
    const permissions = await db.permission.findMany({
      where: {
        id: { in: input.permissionIds },
      },
    });

    if (permissions.length !== input.permissionIds.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more invalid permission IDs",
      });
    }

    // Update the role
    await db.role.update({
      where: { id: input.roleId },
      data: {
        name: input.name,
        description: input.description,
      },
    });

    // Delete existing role-permission relationships
    await db.rolePermission.deleteMany({
      where: { roleId: input.roleId },
    });

    // Create new role-permission relationships
    await db.rolePermission.createMany({
      data: input.permissionIds.map((permissionId) => ({
        roleId: input.roleId,
        permissionId,
      })),
    });

    return {
      success: true,
      role: {
        id: role.id,
        name: input.name,
        description: input.description,
      },
    };
  });
