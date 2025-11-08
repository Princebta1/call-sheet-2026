import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getRecipientGroups = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    const groups = await db.recipientGroup.findMany({
      where: {
        companyId: user.companyId,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: group.members.length,
      members: group.members.map((m) => m.user),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));
  });
