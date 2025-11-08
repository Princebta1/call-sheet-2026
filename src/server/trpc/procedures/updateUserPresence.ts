import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const updateUserPresence = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Update the user's lastActiveAt timestamp
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return { success: true };
  });
