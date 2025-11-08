import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const removeCrewAssignment = baseProcedure
  .input(
    z.object({
      token: z.string(),
      assignmentId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_team");

    // Verify the assignment exists
    const assignment = await db.crewAssignment.findUnique({
      where: { id: input.assignmentId },
      include: { show: true },
    });

    if (!assignment || assignment.show.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Assignment not found",
      });
    }

    await db.crewAssignment.delete({
      where: { id: input.assignmentId },
    });

    return { success: true };
  });
