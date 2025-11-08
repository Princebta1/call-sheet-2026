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
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role?.name || "No Role",
        roleId: u.roleId,
        isActive: u.isActive,
        approvedByAdmin: u.approvedByAdmin,
        profileImage: u.profileImage,
        statusMessage: u.statusMessage,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        lastActiveAt: u.lastActiveAt,
      })),
    };
  });
