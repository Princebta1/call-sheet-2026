import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const createDepartment = baseProcedure
  .input(
    z.object({
      token: z.string(),
      name: z.string().min(1, "Department name is required"),
      description: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_team");

    const department = await db.department.create({
      data: {
        companyId: user.companyId,
        name: input.name,
        description: input.description,
      },
    });

    return { department };
  });
