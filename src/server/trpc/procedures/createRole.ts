import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const createRole = baseProcedure
  .input(
    z.object({
      token: z.string(),
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

    // Check if role name already exists for this company
    const existingRole = await db.role.findFirst({
      where: {
        name: input.name,
        companyId: user.companyId,
      },
    });

    if (existingRole) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A role with this name already exists",
      });
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

    // Create the role
    const role = await db.role.create({
      data: {
        name: input.name,
        description: input.description,
        companyId: user.companyId,
        isSystemRole: false,
      },
    });

    // Create role-permission relationships
    await db.rolePermission.createMany({
      data: input.permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
    });

    return {
      success: true,
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
      },
    };
  });
