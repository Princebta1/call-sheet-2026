import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, canManageScenes } from "~/server/utils/auth";
import { sendReportEmail } from "~/server/utils/sendReportEmail";
import { getReportRecipients } from "~/server/utils/getReportRecipients";

export const generateReport = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      date: z.string(), // ISO date string
      recipientGroupId: z.number().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    if (!canManageScenes(user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to generate reports",
      });
    }

    // Parse the date and get start/end of day
    const targetDate = new Date(input.date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all scenes scheduled for this date and show
    const scenes = await db.scene.findMany({
      where: {
        companyId: user.companyId,
        showId: input.showId,
        scheduledTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (scenes.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No scenes scheduled for this date",
      });
    }

    // Fetch show information to verify it exists
    const show = await db.show.findUnique({
      where: { id: input.showId },
    });

    if (!show) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    // Fetch all scenes for the show to calculate overall completion rate
    const allShowScenes = await db.scene.findMany({
      where: {
        companyId: user.companyId,
        showId: input.showId,
      },
    });

    // Calculate report metrics
    const totalScenes = scenes.length;
    const scenesScheduled = scenes.length;
    const completedScenes = scenes.filter(
      (scene) => scene.status === "Complete"
    ).length;
    const scenesShot = completedScenes;

    // Calculate overall completion rate for the entire show
    const totalPlannedScenes = allShowScenes.length;
    const totalCompletedScenes = allShowScenes.filter(
      (scene) => scene.status === "Complete"
    ).length;
    const completionRateOverall = totalPlannedScenes > 0
      ? (totalCompletedScenes / totalPlannedScenes) * 100
      : 0;

    // Calculate average duration for completed scenes
    const completedScenesWithDuration = scenes.filter(
      (scene) => scene.status === "Complete" && scene.durationMinutes !== null
    );
    const averageDuration =
      completedScenesWithDuration.length > 0
        ? completedScenesWithDuration.reduce(
            (sum, scene) => sum + (scene.durationMinutes || 0),
            0
          ) / completedScenesWithDuration.length
        : null;

    // Calculate total shooting time
    const totalShootingTime = completedScenesWithDuration.reduce(
      (sum, scene) => sum + (scene.durationMinutes || 0),
      0
    );

    // Count delayed scenes (scenes that took more than 60 minutes)
    const delayedScenes = scenes.filter(
      (scene) =>
        scene.status === "Complete" &&
        scene.durationMinutes !== null &&
        scene.durationMinutes > 60
    ).length;

    // Calculate behind/ahead schedule
    const behindScheduleScenes = scenes.filter(
      (scene) =>
        scene.status === "Complete" &&
        scene.durationMinutes !== null &&
        scene.expectedDurationMinutes !== null &&
        scene.durationMinutes > scene.expectedDurationMinutes
    ).length;

    const aheadScheduleScenes = scenes.filter(
      (scene) =>
        scene.status === "Complete" &&
        scene.durationMinutes !== null &&
        scene.expectedDurationMinutes !== null &&
        scene.durationMinutes < scene.expectedDurationMinutes
    ).length;

    // Calculate average setup time (time from timer start to completion)
    // This is an approximation based on scene duration
    const averageSetupTime = averageDuration !== null ? averageDuration * 0.2 : null; // Estimate 20% of duration is setup

    // Find the longest scene
    let longestScene: string | null = null;
    let maxDuration = 0;
    scenes.forEach((scene) => {
      if (
        scene.durationMinutes !== null &&
        scene.durationMinutes > maxDuration
      ) {
        maxDuration = scene.durationMinutes;
        longestScene = scene.sceneNumber;
      }
    });

    // Collect crew present (from assigned crew in scenes)
    const crewSet = new Set<number>();
    scenes.forEach((scene) => {
      if (scene.assignedCrew) {
        try {
          const crew = JSON.parse(scene.assignedCrew);
          crew.forEach((crewId: number) => crewSet.add(crewId));
        } catch {
          // Ignore parse errors
        }
      }
    });
    const crewPresent = Array.from(crewSet);

    // Check if a report already exists for this date and show
    const existingReport = await db.report.findFirst({
      where: {
        companyId: user.companyId,
        showId: input.showId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existingReport) {
      // Update existing report
      const updatedReport = await db.report.update({
        where: { id: existingReport.id },
        data: {
          completedScenes,
          totalScenes,
          averageDuration,
          delayedScenes,
          longestScene,
          totalPlannedScenes,
          scenesShot,
          scenesScheduled,
          completionRateOverall,
          averageSetupTime,
          totalShootingTime,
          behindScheduleScenes,
          aheadScheduleScenes,
          crewPresent: crewPresent.length > 0 ? JSON.stringify(crewPresent) : null,
        },
        include: {
          show: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // Send email notification
      try {
        const recipients = await getReportRecipients(user.companyId, input.recipientGroupId);
        await sendReportEmail(
          {
            showTitle: updatedReport.show.title,
            date: updatedReport.date,
            completedScenes: updatedReport.completedScenes,
            totalScenes: updatedReport.totalScenes,
            averageDuration: updatedReport.averageDuration,
            delayedScenes: updatedReport.delayedScenes,
            longestScene: updatedReport.longestScene,
            totalPlannedScenes: updatedReport.totalPlannedScenes,
            scenesShot: updatedReport.scenesShot,
            scenesScheduled: updatedReport.scenesScheduled,
            completionRateOverall: updatedReport.completionRateOverall,
            averageSetupTime: updatedReport.averageSetupTime,
            totalShootingTime: updatedReport.totalShootingTime,
            behindScheduleScenes: updatedReport.behindScheduleScenes,
            aheadScheduleScenes: updatedReport.aheadScheduleScenes,
          },
          recipients
        );
      } catch (emailError) {
        // Log error but don't fail the report generation
        console.error("Failed to send report email notification:", emailError);
      }

      return {
        id: updatedReport.id,
        showId: updatedReport.showId,
        showTitle: updatedReport.show.title,
        date: updatedReport.date,
        completedScenes: updatedReport.completedScenes,
        totalScenes: updatedReport.totalScenes,
        averageDuration: updatedReport.averageDuration,
        delayedScenes: updatedReport.delayedScenes,
        longestScene: updatedReport.longestScene,
        totalPlannedScenes: updatedReport.totalPlannedScenes,
        scenesShot: updatedReport.scenesShot,
        scenesScheduled: updatedReport.scenesScheduled,
        completionRateOverall: updatedReport.completionRateOverall,
        averageSetupTime: updatedReport.averageSetupTime,
        totalShootingTime: updatedReport.totalShootingTime,
        behindScheduleScenes: updatedReport.behindScheduleScenes,
        aheadScheduleScenes: updatedReport.aheadScheduleScenes,
        createdAt: updatedReport.createdAt,
      };
    }

    // Create new report
    const report = await db.report.create({
      data: {
        companyId: user.companyId,
        showId: input.showId,
        date: targetDate,
        completedScenes,
        totalScenes,
        averageDuration,
        delayedScenes,
        longestScene,
        totalPlannedScenes,
        scenesShot,
        scenesScheduled,
        completionRateOverall,
        averageSetupTime,
        totalShootingTime,
        behindScheduleScenes,
        aheadScheduleScenes,
        crewPresent: crewPresent.length > 0 ? JSON.stringify(crewPresent) : null,
      },
      include: {
        show: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Send email notification
    try {
      const recipients = await getReportRecipients(user.companyId, input.recipientGroupId);
      await sendReportEmail(
        {
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
        },
        recipients
      );
    } catch (emailError) {
      // Log error but don't fail the report generation
      console.error("Failed to send report email notification:", emailError);
    }

    return {
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
      createdAt: report.createdAt,
    };
  });
