import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getCompanyDashboardStats = baseProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    // Check if user has permission to view company dashboard (Admin only)
    if (!payload.permissions.includes("manage_company")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can access the company dashboard",
      });
    }

    const companyId = user.companyId;

    // Get company information
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        logoURL: true,
        subscriptionTier: true,
        subscriptionExpiry: true,
        isActive: true,
        approvedByDeveloper: true,
        createdAt: true,
      },
    });

    if (!company) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Company not found",
      });
    }

    // Get team statistics
    const [totalUsers, activeUsers, inactiveUsers, pendingApprovalUsers] = await Promise.all([
      db.user.count({ where: { companyId } }),
      db.user.count({ where: { companyId, isActive: true } }),
      db.user.count({ where: { companyId, isActive: false } }),
      db.user.count({ where: { companyId, approvedByAdmin: false } }),
    ]);

    // Get users by role
    const usersByRole = await db.user.groupBy({
      by: ["roleId"],
      where: { companyId, isActive: true },
      _count: true,
    });

    // Get role names for the counts
    const roleIds = usersByRole.map((r) => r.roleId).filter((id): id is number => id !== null);
    const roles = await db.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true },
    });

    const roleMap = new Map(roles.map((r) => [r.id, r.name]));
    const teamByRole = usersByRole.map((r) => ({
      role: r.roleId ? roleMap.get(r.roleId) || "Unknown" : "No Role",
      count: r._count,
    }));

    // Get production houses statistics
    const productionHouses = await db.productionHouse.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { shows: true, productionHouseMembers: true },
        },
      },
    });

    const totalProductionHouses = productionHouses.length;

    // Get shows statistics
    const [totalShows, preProductionShows, shootingShows, wrappedShows] = await Promise.all([
      db.show.count({ where: { companyId } }),
      db.show.count({ where: { companyId, status: "Pre-Production" } }),
      db.show.count({ where: { companyId, status: "Shooting" } }),
      db.show.count({ where: { companyId, status: "Wrapped" } }),
    ]);

    // Get scenes statistics
    const [totalScenes, unshotScenes, inProgressScenes, completeScenes] = await Promise.all([
      db.scene.count({ where: { companyId } }),
      db.scene.count({ where: { companyId, status: "Unshot" } }),
      db.scene.count({ where: { companyId, status: "In Progress" } }),
      db.scene.count({ where: { companyId, status: "Complete" } }),
    ]);

    // Calculate completion rate
    const completionRate = totalScenes > 0 ? (completeScenes / totalScenes) * 100 : 0;

    // Get reports and call sheets
    const [totalReports, totalCallSheets] = await Promise.all([
      db.report.count({ where: { companyId } }),
      db.callSheet.count({ where: { companyId } }),
    ]);

    // Get departments and custom roles
    const [totalDepartments, totalCustomRoles] = await Promise.all([
      db.department.count({ where: { companyId } }),
      db.role.count({ where: { companyId, isSystemRole: false } }),
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      recentUsers,
      recentShows,
      recentScenes,
      recentCallSheets,
      recentReports,
    ] = await Promise.all([
      db.user.count({
        where: {
          companyId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      db.show.count({
        where: {
          companyId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      db.scene.count({
        where: {
          companyId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      db.callSheet.count({
        where: {
          companyId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      db.report.count({
        where: {
          companyId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    // Get announcements statistics
    const [totalAnnouncements, recentAnnouncements] = await Promise.all([
      db.announcement.count({ where: { companyId } }),
      db.announcement.count({
        where: {
          companyId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      company,
      team: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        pendingApproval: pendingApprovalUsers,
        byRole: teamByRole,
      },
      productionHouses: {
        total: totalProductionHouses,
        houses: productionHouses.map((ph) => ({
          id: ph.id,
          name: ph.name,
          showCount: ph._count.shows,
          memberCount: ph._count.productionHouseMembers,
        })),
      },
      shows: {
        total: totalShows,
        preProduction: preProductionShows,
        shooting: shootingShows,
        wrapped: wrappedShows,
      },
      scenes: {
        total: totalScenes,
        unshot: unshotScenes,
        inProgress: inProgressScenes,
        complete: completeScenes,
        completionRate: Math.round(completionRate * 10) / 10,
      },
      content: {
        reports: totalReports,
        callSheets: totalCallSheets,
        departments: totalDepartments,
        customRoles: totalCustomRoles,
        announcements: totalAnnouncements,
      },
      recentActivity: {
        users: recentUsers,
        shows: recentShows,
        scenes: recentScenes,
        callSheets: recentCallSheets,
        reports: recentReports,
        announcements: recentAnnouncements,
      },
    };
  });
