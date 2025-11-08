import { db } from "~/server/db";
import { sendReportEmail } from "./sendReportEmail";
import { getReportRecipients } from "./getReportRecipients";

interface AutoGenerateReportsOptions {
  companyId: number;
  showId?: number;
  date?: Date;
}

interface GeneratedReportInfo {
  reportId: number;
  showId: number;
  showTitle: string;
  date: Date;
  completedScenes: number;
  totalScenes: number;
}

/**
 * Automatically generates production reports for shooting days where all scenes are complete.
 * This function can be called manually or triggered automatically at the end of each day.
 */
export async function autoGenerateReports(
  options: AutoGenerateReportsOptions
): Promise<GeneratedReportInfo[]> {
  const { companyId, showId, date } = options;
  const generatedReports: GeneratedReportInfo[] = [];

  // Build query to find scenes
  const whereClause: any = {
    companyId,
    scheduledTime: { not: null },
  };

  if (showId) {
    whereClause.showId = showId;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    whereClause.scheduledTime = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  // Get all scenes with scheduled times
  const scenes = await db.scene.findMany({
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
      scheduledTime: "asc",
    },
  });

  // Group scenes by show and date
  const scenesByShowAndDate = new Map<string, typeof scenes>();
  
  for (const scene of scenes) {
    if (!scene.scheduledTime) continue;
    
    const sceneDate = new Date(scene.scheduledTime);
    sceneDate.setHours(0, 0, 0, 0);
    
    const key = `${scene.showId}-${sceneDate.toISOString()}`;
    
    if (!scenesByShowAndDate.has(key)) {
      scenesByShowAndDate.set(key, []);
    }
    
    scenesByShowAndDate.get(key)!.push(scene);
  }

  // Process each group
  for (const [key, groupScenes] of scenesByShowAndDate.entries()) {
    if (groupScenes.length === 0) continue;

    const firstScene = groupScenes[0];
    const sceneDate = new Date(firstScene.scheduledTime!);
    sceneDate.setHours(0, 0, 0, 0);
    
    const startOfDay = new Date(sceneDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(sceneDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if all scenes for this day are complete
    const allComplete = groupScenes.every(
      (scene) => scene.status === "Complete"
    );

    // Only generate report if all scenes are complete
    if (!allComplete) {
      continue;
    }

    // Check if report already exists
    const existingReport = await db.report.findFirst({
      where: {
        companyId,
        showId: firstScene.showId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Skip if report already exists
    if (existingReport) {
      continue;
    }

    // Fetch all scenes for the show to calculate overall completion rate
    const allShowScenes = await db.scene.findMany({
      where: {
        companyId,
        showId: firstScene.showId,
      },
    });

    // Calculate report metrics
    const totalScenes = groupScenes.length;
    const scenesScheduled = groupScenes.length;
    const completedScenes = groupScenes.filter(
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
    const completedScenesWithDuration = groupScenes.filter(
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
    const delayedScenes = groupScenes.filter(
      (scene) =>
        scene.status === "Complete" &&
        scene.durationMinutes !== null &&
        scene.durationMinutes > 60
    ).length;

    // Calculate behind/ahead schedule
    const behindScheduleScenes = groupScenes.filter(
      (scene) =>
        scene.status === "Complete" &&
        scene.durationMinutes !== null &&
        scene.expectedDurationMinutes !== null &&
        scene.durationMinutes > scene.expectedDurationMinutes
    ).length;

    const aheadScheduleScenes = groupScenes.filter(
      (scene) =>
        scene.status === "Complete" &&
        scene.durationMinutes !== null &&
        scene.expectedDurationMinutes !== null &&
        scene.durationMinutes < scene.expectedDurationMinutes
    ).length;

    // Calculate average setup time (estimate 20% of duration)
    const averageSetupTime = averageDuration !== null ? averageDuration * 0.2 : null;

    // Find the longest scene
    let longestScene: string | null = null;
    let maxDuration = 0;
    groupScenes.forEach((scene) => {
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
    groupScenes.forEach((scene) => {
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

    // Create the report
    const report = await db.report.create({
      data: {
        companyId,
        showId: firstScene.showId,
        date: sceneDate,
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
    });

    generatedReports.push({
      reportId: report.id,
      showId: firstScene.showId,
      showTitle: firstScene.show.title,
      date: report.date,
      completedScenes: report.completedScenes,
      totalScenes: report.totalScenes,
    });

    console.log(
      `Auto-generated report for ${firstScene.show.title} on ${sceneDate.toLocaleDateString()}`
    );

    // Send email notification
    try {
      const recipients = await getReportRecipients(companyId);
      await sendReportEmail(
        {
          showTitle: firstScene.show.title,
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
      console.log(
        `Email notification sent for ${firstScene.show.title} report`
      );
    } catch (emailError) {
      // Log error but don't fail the auto-generation process
      console.error("Failed to send report email notification:", emailError);
    }
  }

  return generatedReports;
}
