import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getRoles = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Fetch system roles (available to all companies) and company-specific roles
    const roles = await db.role.findMany({
      where: {
        OR: [
          { isSystemRole: true, companyId: null },
          { companyId: user.companyId, isSystemRole: false },
        ],
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: [
        { isSystemRole: "desc" },
        { name: "asc" },
      ],
    });

    // Transform the data for easier frontend consumption
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      userCount: role._count.users,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        displayName: rp.permission.displayName,
        description: rp.permission.description,
        category: rp.permission.category,
      })),
      permissionIds: role.rolePermissions.map((rp) => rp.permissionId),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  });
