import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";
import { db } from "~/server/db";

export const getCurrentUser = baseProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Fetch user's role with permissions
    let roleInfo = null;
    let permissions: string[] = [];
    
    if (user.roleId) {
      const role = await db.role.findUnique({
        where: { id: user.roleId },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (role) {
        roleInfo = {
          id: role.id,
          name: role.name,
          description: role.description,
          isSystemRole: role.isSystemRole,
        };
        permissions = role.rolePermissions.map((rp) => rp.permission.name);
      }
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleInfo?.name || "No Role",
      roleId: user.roleId,
      roleInfo,
      permissions,
      companyId: user.companyId,
      companyName: user.company.name,
      companyEmail: user.company.email,
      subscriptionTier: user.company.subscriptionTier,
      profileImage: user.profileImage,
      statusMessage: user.statusMessage,
      lastActiveAt: user.lastActiveAt,
      phone: user.phone,
      isActive: user.isActive,
      approvedByAdmin: user.approvedByAdmin,
      receiveEmailNotifications: user.receiveEmailNotifications,
      receiveSmsNotifications: user.receiveSmsNotifications,
    };
  });
