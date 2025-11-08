import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getDepartments = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    const departments = await db.department.findMany({
      where: { companyId: user.companyId },
      include: {
        positions: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return { departments };
  });
