import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getReports = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
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

    if (input.startDate || input.endDate) {
      whereClause.date = {};
      if (input.startDate) {
        whereClause.date.gte = new Date(input.startDate);
      }
      if (input.endDate) {
        whereClause.date.lte = new Date(input.endDate);
      }
    }

    const reports = await db.report.findMany({
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
      reports: reports.map((report) => ({
        id: report.id,
        showId: report.showId,
        showTitle: report.show.title,
        date: report.date,
        completedScenes: report.completedScenes,
        totalScenes: report.totalScenes,
        averageDuration: report.averageDuration,
        delayedScenes: report.delayedScenes,
        longestScene: report.longestScene,
        totalPlannedScenes: report.totalPlannedScenes,
        scenesShot: report.scenesShot,
        scenesScheduled: report.scenesScheduled,
        completionRateOverall: report.completionRateOverall,
        averageSetupTime: report.averageSetupTime,
        totalShootingTime: report.totalShootingTime,
        behindScheduleScenes: report.behindScheduleScenes,
        aheadScheduleScenes: report.aheadScheduleScenes,
        crewPresent: report.crewPresent,
        issuesEncountered: report.issuesEncountered,
        weatherConditions: report.weatherConditions,
        equipmentIssues: report.equipmentIssues,
        notableAchievements: report.notableAchievements,
        createdAt: report.createdAt,
      })),
    };
  });
