import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const createProductionHouseSimple = baseProcedure
  .input(
    z.object({
      token: z.string(),
      name: z.string().min(1, "Name is required"),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Create production house with current user as admin
    const productionHouse = await db.productionHouse.create({
      data: {
        companyId: user.companyId,
        adminId: user.id,
        name: input.name,
      },
    });

    return {
      id: productionHouse.id,
      name: productionHouse.name,
      companyId: productionHouse.companyId,
    };
  });
