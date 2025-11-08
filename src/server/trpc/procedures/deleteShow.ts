import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const deleteShow = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    
    // Only developers can delete shows
    if (payload.role !== "Developer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only developers can delete shows",
      });
    }

    // Verify the show exists and belongs to the user's company
    const existingShow = await db.show.findUnique({
      where: { id: input.showId },
    });

    if (!existingShow) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    if (existingShow.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to this show",
      });
    }

    // Delete the show (cascade will handle related records)
    await db.show.delete({
      where: { id: input.showId },
    });

    return {
      success: true,
      message: "Show deleted successfully",
    };
  });
