import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const removeUserFromShow = baseProcedure
  .input(
    z.object({
      token: z.string(),
      userId: z.number(),
      showId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_team");

    // Verify the user exists and is in the same company
    const targetUser = await db.user.findUnique({
      where: { id: input.userId },
    });

    if (!targetUser || targetUser.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Delete the assignment
    await db.userShow.deleteMany({
      where: {
        userId: input.userId,
        showId: input.showId,
      },
    });

    return { success: true };
  });
