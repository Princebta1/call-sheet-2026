import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const updateDepartment = baseProcedure
  .input(
    z.object({
      token: z.string(),
      departmentId: z.number(),
      name: z.string().min(1, "Department name is required").optional(),
      description: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_team");

    // Verify the department exists and belongs to the user's company
    const department = await db.department.findUnique({
      where: { id: input.departmentId },
    });

    if (!department || department.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Department not found",
      });
    }

    const updated = await db.department.update({
      where: { id: input.departmentId },
      data: {
        name: input.name,
        description: input.description,
      },
    });

    return { department: updated };
  });
