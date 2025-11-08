import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getAllCompanies = baseProcedure
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
        message: "Only developers can access all companies",
      });
    }

    const companies = await db.company.findMany({
      include: {
        _count: {
          select: {
            users: true,
            shows: true,
            scenes: true,
            reports: true,
          },
        },
      },
      orderBy: [
        { isActive: "desc" },
        { approvedByDeveloper: "desc" },
        { createdAt: "desc" },
      ],
    });

    return {
      companies: companies.map((company) => ({
        id: company.id,
        name: company.name,
        email: company.email,
        logoURL: company.logoURL,
        subscriptionTier: company.subscriptionTier,
        subscriptionExpiry: company.subscriptionExpiry,
        isActive: company.isActive,
        approvedByDeveloper: company.approvedByDeveloper,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        userCount: company._count.users,
        showCount: company._count.shows,
        sceneCount: company._count.scenes,
        reportCount: company._count.reports,
      })),
    };
  });
