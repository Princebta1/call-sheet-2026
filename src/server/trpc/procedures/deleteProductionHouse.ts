import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const deleteProductionHouse = baseProcedure
  .input(
    z.object({
      token: z.string(),
      id: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_production_houses");

    // Verify the production house exists and belongs to the user's company
    const productionHouse = await db.productionHouse.findUnique({
      where: { id: input.id },
    });

    if (!productionHouse) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Production house not found",
      });
    }

    if (productionHouse.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to delete this production house",
      });
    }

    await db.productionHouse.delete({
      where: { id: input.id },
    });

    return { success: true };
  });
