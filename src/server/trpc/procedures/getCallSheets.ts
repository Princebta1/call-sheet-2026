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
      callSheets: callSheets.map((callSheet) => ({
        id: callSheet.id,
        showId: callSheet.showId,
        showTitle: callSheet.show.title,
        date: callSheet.date,
        location: callSheet.location,
        pdfURL: callSheet.pdfURL,
        scenesIncluded: callSheet.scenesIncluded,
        crewList: callSheet.crewList,
        actorList: callSheet.actorList,
        weatherInfo: callSheet.weatherInfo,
        notes: callSheet.notes,
        createdAt: callSheet.createdAt,
      })),
    };
  });
