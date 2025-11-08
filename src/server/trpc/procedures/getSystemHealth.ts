import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getSystemHealth = baseProcedure
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
        message: "Only developers can access system health metrics",
      });
    }

    // Get company statistics
    const [
      totalCompanies,
      activeCompanies,
      inactiveCompanies,
      pendingApprovalCompanies,
    ] = await Promise.all([
      db.company.count(),
      db.company.count({ where: { isActive: true } }),
      db.company.count({ where: { isActive: false } }),
      db.company.count({ 
        where: { 
          isActive: false,
          approvedByDeveloper: false 
        } 
      }),
    ]);

    // Get user statistics
    const [totalUsers, activeUsers, inactiveUsers] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.user.count({ where: { isActive: false } }),
    ]);

    // Get recent automation log failures (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentFailures = await db.automationLog.count({
      where: {
        status: "Failed",
        timestamp: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Get total automation logs for comparison
    const totalAutomationLogs = await db.automationLog.count({
      where: {
        timestamp: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Calculate success rate
    const successRate = totalAutomationLogs > 0
      ? ((totalAutomationLogs - recentFailures) / totalAutomationLogs) * 100
      : 100;

    return {
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        inactive: inactiveCompanies,
        pendingApproval: pendingApprovalCompanies,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
      },
      automation: {
        recentFailures,
        totalLogs: totalAutomationLogs,
        successRate: Math.round(successRate * 100) / 100,
      },
    };
  });
