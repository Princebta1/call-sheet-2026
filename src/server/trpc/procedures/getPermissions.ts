import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getPermissions = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    await authenticateUser(input.token);

    // Fetch all permissions
    const permissions = await db.permission.findMany({
      orderBy: [
        { category: "asc" },
        { displayName: "asc" },
      ],
    });

    // Group permissions by category
    const groupedPermissions: Record<string, typeof permissions> = {};
    
    for (const permission of permissions) {
      if (!groupedPermissions[permission.category]) {
        groupedPermissions[permission.category] = [];
      }
      groupedPermissions[permission.category].push(permission);
    }

    return {
      permissions,
      groupedPermissions,
    };
  });
