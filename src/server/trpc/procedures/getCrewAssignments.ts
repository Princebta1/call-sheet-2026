import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getCrewAssignments = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Verify the show exists and belongs to the user's company
    const show = await db.show.findUnique({
      where: { id: input.showId },
    });

    if (!show || show.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    const assignments = await db.crewAssignment.findMany({
      where: { showId: input.showId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profileImage: true,
          },
        },
        department: true,
        position: true,
      },
      orderBy: [
        { department: { name: "asc" } },
        { position: { name: "asc" } },
      ],
    });

    return { assignments };
  });
