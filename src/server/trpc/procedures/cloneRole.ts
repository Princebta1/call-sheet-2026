import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const cloneRole = baseProcedure
  .input(
    z.object({
      token: z.string(),
      roleId: z.number(),
      newName: z.string().optional(), // Optional custom name, defaults to "Copy of [Original Name]"
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

    // Get the role to clone
    const sourceRole = await db.role.findUnique({
      where: { id: input.roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!sourceRole) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Source role not found",
      });
    }

    // If cloning a custom role from another company, don't allow it
    if (!sourceRole.isSystemRole && sourceRole.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot clone roles from other companies",
      });
    }

    // Generate new role name
    const baseName = input.newName || `Copy of ${sourceRole.name}`;
    let newName = baseName;
    let counter = 1;

    // Ensure unique name
    while (true) {
      const existingRole = await db.role.findFirst({
        where: {
          name: newName,
          companyId: user.companyId,
        },
      });

      if (!existingRole) break;
      
      newName = `${baseName} (${counter})`;
      counter++;
    }

    // Create the new role
    const newRole = await db.role.create({
      data: {
        name: newName,
        description: sourceRole.description 
          ? `${sourceRole.description} (cloned from ${sourceRole.name})`
          : `Cloned from ${sourceRole.name}`,
        companyId: user.companyId,
        isSystemRole: false,
      },
    });

    // Copy all permissions from source role
    const permissionIds = sourceRole.rolePermissions.map((rp) => rp.permissionId);
    
    if (permissionIds.length > 0) {
      await db.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: newRole.id,
          permissionId,
        })),
      });
    }

    return {
      success: true,
      role: {
        id: newRole.id,
        name: newRole.name,
        description: newRole.description,
        permissionCount: permissionIds.length,
      },
    };
  });
