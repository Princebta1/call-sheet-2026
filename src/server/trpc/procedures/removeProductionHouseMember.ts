import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, getUserPermissions, checkPermission } from "~/server/utils/auth";

export const removeProductionHouseMember = baseProcedure
  .input(
    z.object({
      token: z.string(),
      memberId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Check permissions
    const permissions = await getUserPermissions(user.id);
    checkPermission(permissions, "manage_team");

    // Get the member to remove
    const member = await db.productionHouseMember.findUnique({
      where: { id: input.memberId },
      include: {
        productionHouse: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!member) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Member not found",
      });
    }

    // Verify the production house belongs to the user's company
    if (member.productionHouse.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot remove members from other companies",
      });
    }

    // Prevent users from removing themselves
    if (member.userId === user.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot remove yourself from a production house",
      });
    }

    // Remove the member
    await db.productionHouseMember.delete({
      where: { id: input.memberId },
    });

    return {
      success: true,
      removedUser: {
        name: member.user.name,
        email: member.user.email,
      },
    };
  });
