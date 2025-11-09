import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getCompanyUsers = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    const users = await db.user.findMany({
      where: {
        companyId: user.companyId,
        ...(input.showId
          ? {
              userShows: {
                some: {
                  showId: parseInt(input.showId),
                },
              },
            }
          : {}),
      },
      include: {
        role: true,
      },
      orderBy: [
        { approvedByAdmin: "desc" },
        { isActive: "desc" },
        { createdAt: "asc" },
      ],
    });

    return {
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role?.name || "No Role",
        roleId: user.roleId,
        isActive: user.isActive,
        approvedByAdmin: user.approvedByAdmin,
        profileImage: user.profileImage,
        statusMessage: user.statusMessage,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        lastActiveAt: user.lastActiveAt,
      })),
    };
  });
