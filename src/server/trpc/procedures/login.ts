import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { comparePassword, signToken } from "~/server/utils/auth";

export const login = baseProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Find user with role and permissions
    const user = await db.user.findUnique({
      where: { email: input.email },
      include: {
        company: true,
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

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(
      input.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account is inactive. Please contact your administrator.",
      });
    }

    // Check if user is approved
    if (!user.approvedByAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account is pending approval from an administrator.",
      });
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

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
      companyId: user.companyId,
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
        companyName: user.company.name,
        companyEmail: user.company.email,
        subscriptionTier: user.company.subscriptionTier,
        phone: user.phone,
        profileImage: user.profileImage,
      },
    };
  });
