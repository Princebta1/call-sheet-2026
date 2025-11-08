import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getCallSheets = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number().optional(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    const whereClause: any = {
      companyId: user.companyId,
    };

    if (input.showId) {
      whereClause.showId = input.showId;
    }

    const callSheets = await db.callSheet.findMany({
      where: whereClause,
      include: {
        show: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return {
      callSheets: callSheets.map((cs) => ({
        id: cs.id,
        showId: cs.showId,
        showTitle: cs.show.title,
        date: cs.date,
        location: cs.location,
        pdfURL: cs.pdfURL,
        scenesIncluded: cs.scenesIncluded,
        crewList: cs.crewList,
        actorList: cs.actorList,
        weatherInfo: cs.weatherInfo,
        notes: cs.notes,
        createdAt: cs.createdAt,
      })),
    };
  });
