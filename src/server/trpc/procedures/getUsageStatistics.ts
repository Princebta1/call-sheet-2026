import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getUsageStatistics = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    // Check if user is a developer
    if (payload.role !== "Developer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only developers can access usage statistics",
      });
    }

    // Get content statistics
    const [totalShows, totalScenes, totalCallSheets, totalReports] =
      await Promise.all([
        db.show.count(),
        db.scene.count(),
        db.callSheet.count(),
        db.report.count(),
      ]);

    // Get scene status breakdown
    const [unshotScenes, inProgressScenes, completeScenes] = await Promise.all([
      db.scene.count({ where: { status: "Unshot" } }),
      db.scene.count({ where: { status: "In Progress" } }),
      db.scene.count({ where: { status: "Complete" } }),
    ]);

    // Get show status breakdown
    const [preProductionShows, shootingShows, wrappedShows] = await Promise.all([
      db.show.count({ where: { status: "Pre-Production" } }),
      db.show.count({ where: { status: "Shooting" } }),
      db.show.count({ where: { status: "Wrapped" } }),
    ]);

    // Get subscription tier breakdown
    const subscriptionTiers = await db.company.groupBy({
      by: ["subscriptionTier"],
      _count: true,
      where: {
        isActive: true,
      },
    });

    const tierBreakdown = subscriptionTiers.reduce(
      (acc, tier) => {
        acc[tier.subscriptionTier] = tier._count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentShows, recentScenes, recentCallSheets, recentReports] =
      await Promise.all([
        db.show.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),
        db.scene.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),
        db.callSheet.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),
        db.report.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),
      ]);

    return {
      content: {
        totalShows,
        totalScenes,
        totalCallSheets,
        totalReports,
      },
      sceneStatus: {
        unshot: unshotScenes,
        inProgress: inProgressScenes,
        complete: completeScenes,
      },
      showStatus: {
        preProduction: preProductionShows,
        shooting: shootingShows,
        wrapped: wrappedShows,
      },
      subscriptions: {
        basic: tierBreakdown.Basic || 0,
        pro: tierBreakdown.Pro || 0,
        enterprise: tierBreakdown.Enterprise || 0,
      },
      recentActivity: {
        shows: recentShows,
        scenes: recentScenes,
        callSheets: recentCallSheets,
        reports: recentReports,
      },
    };
  });
