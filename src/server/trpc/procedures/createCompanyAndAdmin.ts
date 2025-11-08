import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, hashPassword } from "~/server/utils/auth";

export const createCompanyAndAdmin = baseProcedure
  .input(
    z.object({
      token: z.string(),
      company: z.object({
        name: z.string().min(1, "Company name is required"),
        email: z.string().email("Invalid company email"),
        subscriptionTier: z.enum(["Basic", "Pro", "Enterprise"]).default("Basic"),
      }),
      admin: z.object({
        name: z.string().min(1, "Admin name is required"),
        email: z.string().email("Invalid admin email"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        phone: z.string().optional(),
      }),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate the calling user (must be a Developer)
    const { payload } = await authenticateUser(input.token);

    if (payload.role !== "Developer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only developers can create new companies",
      });
    }

    // Check if company with this email already exists
    const existingCompany = await db.company.findUnique({
      where: { email: input.company.email },
    });

    if (existingCompany) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A company with this email already exists",
      });
    }

    // Check if user with admin email already exists
    const existingUser = await db.user.findUnique({
      where: { email: input.admin.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A user with this email already exists",
      });
    }

    // Create the company
    const company = await db.company.create({
      data: {
        name: input.company.name,
        email: input.company.email,
        subscriptionTier: input.company.subscriptionTier,
        isActive: true, // Developer-created companies are active by default
        approvedByDeveloper: true, // Auto-approved since created by developer
      },
    });

    // Get the Admin system role
    const adminRole = await db.role.findFirst({
      where: {
        name: "Admin",
        isSystemRole: true,
        companyId: null,
      },
    });

    if (!adminRole) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Admin role not found in system",
      });
    }

    // Hash the admin's password
    const passwordHash = await hashPassword(input.admin.password);

    // Create the admin user
    const adminUser = await db.user.create({
      data: {
        name: input.admin.name,
        email: input.admin.email,
        passwordHash,
        phone: input.admin.phone,
        companyId: company.id,
        roleId: adminRole.id,
        approvedByAdmin: true, // First user, auto-approved
        isActive: true, // Active immediately
      },
      include: {
        role: true,
      },
    });

    // Create an initial production house for the company with the admin as its admin
    const productionHouse = await db.productionHouse.create({
      data: {
        companyId: company.id,
        adminId: adminUser.id,
        name: input.company.name, // Use company name as initial production house name
      },
    });

    return {
      success: true,
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        subscriptionTier: company.subscriptionTier,
      },
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role?.name || "Admin",
      },
      productionHouse: {
        id: productionHouse.id,
        name: productionHouse.name,
      },
    };
  });
