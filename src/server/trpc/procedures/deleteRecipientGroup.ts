import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, canManageTeam } from "~/server/utils/auth";

export const deleteRecipientGroup = baseProcedure
  .input(
    z.object({
      token: z.string(),
      groupId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    if (!canManageTeam(user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to manage recipient groups",
      });
    }

    // Verify the group exists and belongs to the user's company
    const existingGroup = await db.recipientGroup.findUnique({
      where: { id: input.groupId },
    });

    if (!existingGroup || existingGroup.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Recipient group not found",
      });
    }

    // Delete the group (cascade will handle members)
    await db.recipientGroup.delete({
      where: { id: input.groupId },
    });

    return {
      success: true,
    };
  });
