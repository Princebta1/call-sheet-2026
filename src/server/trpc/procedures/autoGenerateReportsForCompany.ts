import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, canManageScenes } from "~/server/utils/auth";
import { autoGenerateReports } from "~/server/utils/autoGenerateReports";
import { TRPCError } from "@trpc/server";

export const autoGenerateReportsForCompany = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    if (!canManageScenes(user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to generate reports",
      });
    }

    // Auto-generate reports for all completed shooting days
    const generatedReports = await autoGenerateReports({
      companyId: user.companyId,
      showId: input.showId,
    });

    return {
      success: true,
      count: generatedReports.length,
      reports: generatedReports,
    };
  });
