import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const deletePosition = baseProcedure
  .input(
    z.object({
      token: z.string(),
      positionId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_team");

    // Verify the position exists
    const position = await db.position.findUnique({
      where: { id: input.positionId },
      include: { department: true },
    });

    if (!position || position.department.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Position not found",
      });
    }

    await db.position.delete({
      where: { id: input.positionId },
    });

    return { success: true };
  });
