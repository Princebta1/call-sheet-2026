import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { hashPassword, signToken } from "~/server/utils/auth";
import { sendApprovalNotification } from "~/server/utils/sendApprovalNotification";

export const register = baseProcedure
  .input(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
      phone: z.string().optional(),
      productionHouseId: z.number().optional(),
      productionHouseName: z.string().optional(),
      role: z.enum(["Admin", "Actor", "Crew"]),
    }).refine(
      (data) => data.productionHouseId !== undefined || data.productionHouseName !== undefined,
      {
        message: "Either productionHouseId or productionHouseName must be provided",
        path: ["productionHouseId"],
      }
    )
  )
  .mutation(async ({ input }) => {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User with this email already exists",
      });
    }

    let company: { id: number; name: string; email: string; subscriptionTier: string };
    let productionHouse: { id: number; name: string; companyId: number };
    let isFirstUser: boolean;

    // Case 1: Creating a new production house (and implicitly a new company)
    if (input.productionHouseName) {
      // Create a new company for this production house
      // Use production house name as company name and user email as company email
      const newCompany = await db.company.create({
        data: {
          name: input.productionHouseName,
          email: input.email,
          subscriptionTier: "Basic",
          isActive: true, // Auto-activate for first user
          approvedByDeveloper: false,
        },
      });

      company = newCompany;
      isFirstUser = true;

      // We'll create the production house after creating the user, 
      // so we can set the user as admin
      productionHouse = { id: 0, name: input.productionHouseName, companyId: company.id };
    } 
    // Case 2: Joining an existing production house
    else if (input.productionHouseId) {
      const existingProductionHouse = await db.productionHouse.findUnique({
        where: { id: input.productionHouseId },
        include: {
          company: true,
        },
      });

      if (!existingProductionHouse) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid production house selected",
        });
      }

      productionHouse = existingProductionHouse;
      company = existingProductionHouse.company;

      // Check if this is the first user for this company
      const existingUsersCount = await db.user.count({
        where: { companyId: company.id },
      });

      isFirstUser = existingUsersCount === 0;
    } else {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Either productionHouseId or productionHouseName must be provided",
      });
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Get the system role based on the selected role name
    const systemRole = await db.role.findFirst({
      where: {
        name: input.role,
        isSystemRole: true,
        companyId: null,
      },
    });

    if (!systemRole) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid role: ${input.role}`,
      });
    }

    // Create user
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        phone: input.phone,
        companyId: company.id,
        roleId: systemRole.id,
        approvedByAdmin: isFirstUser,
        isActive: isFirstUser,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // If creating a new production house, create it now with the user as admin
    if (input.productionHouseName) {
      const newProductionHouse = await db.productionHouse.create({
        data: {
          companyId: company.id,
          adminId: user.id,
          name: input.productionHouseName,
        },
      });
      productionHouse = newProductionHouse;
    }

    // If first user, activate company
    if (isFirstUser && !input.productionHouseName) {
      // Only update if we didn't just create the company (it's already active)
      await db.company.update({
        where: { id: company.id },
        data: { isActive: true },
      });
    }

    // Send approval notification if account needs approval
    if (!isFirstUser) {
      // Send notification asynchronously (don't wait for it)
      sendApprovalNotification({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: input.role,
        productionHouseId: productionHouse.id,
        productionHouseName: productionHouse.name,
        companyId: company.id,
      }).catch((error) => {
        console.error("Failed to send approval notification:", error);
        // Don't throw - user was created successfully
      });
    }

    // Extract role info and permissions
    const roleInfo = user.role
      ? {
          id: user.role.id,
          name: user.role.name,
          description: user.role.description,
          isSystemRole: user.role.isSystemRole,
        }
      : null;

    const permissions = user.role
      ? user.role.rolePermissions.map((rp) => rp.permission.name)
      : [];

    // Generate token with permissions
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role?.name || "No Role",
      roleId: user.roleId,
      companyId: company.id,
      permissions,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name || "No Role",
        roleId: user.roleId,
        roleInfo,
        permissions,
        companyId: user.companyId,
        companyName: company.name,
        companyEmail: company.email,
        subscriptionTier: company.subscriptionTier,
        phone: user.phone,
        profileImage: user.profileImage,
        approvedByAdmin: user.approvedByAdmin,
        isActive: user.isActive,
      },
      needsApproval: !isFirstUser,
    };
  });
