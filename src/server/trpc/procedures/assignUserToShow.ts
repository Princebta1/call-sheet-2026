import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const assignUserToShow = baseProcedure
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

    // Verify the user to assign exists and is in the same company
    const targetUser = await db.user.findUnique({
      where: { id: input.userId },
    });

    if (!targetUser || targetUser.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Verify the show exists and belongs to the company
    const show = await db.show.findUnique({
      where: { id: input.showId },
    });

    if (!show || show.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    // Create the assignment (upsert to handle duplicates gracefully)
    await db.userShow.upsert({
      where: {
        userId_showId: {
          userId: input.userId,
          showId: input.showId,
        },
      },
      create: {
        userId: input.userId,
        showId: input.showId,
      },
      update: {},
    });

    return { success: true };
  });
