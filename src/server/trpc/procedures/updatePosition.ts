import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const updatePosition = baseProcedure
  .input(
    z.object({
      token: z.string(),
      positionId: z.number(),
      name: z.string().min(1, "Position name is required").optional(),
      description: z.string().optional(),
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

    const updated = await db.position.update({
      where: { id: input.positionId },
      data: {
        name: input.name,
        description: input.description,
      },
    });

    return { position: updated };
  });
