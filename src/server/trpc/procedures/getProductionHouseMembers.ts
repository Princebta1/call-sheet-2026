import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";
import { TRPCError } from "@trpc/server";

export const getProductionHouseMembers = baseProcedure
  .input(
    z.object({
      token: z.string(),
      productionHouseId: z.number(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Verify the production house belongs to the user's company
    const productionHouse = await db.productionHouse.findFirst({
      where: {
        id: input.productionHouseId,
        companyId: user.companyId,
      },
    });

    if (!productionHouse) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Production house not found",
      });
    }

    // Fetch all members of this production house
    const members = await db.productionHouseMember.findMany({
      where: {
        productionHouseId: input.productionHouseId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profileImage: true,
            isActive: true,
            approvedByAdmin: true,
            lastActiveAt: true,
          },
        },
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
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      productionHouse: {
        id: productionHouse.id,
        name: productionHouse.name,
      },
      members: members.map((member) => ({
        id: member.id,
        userId: member.user.id,
        name: member.user.name,
        email: member.user.email,
        phone: member.user.phone,
        profileImage: member.user.profileImage,
        isActive: member.user.isActive,
        approvedByAdmin: member.user.approvedByAdmin,
        lastActiveAt: member.user.lastActiveAt,
        roleId: member.roleId,
        roleName: member.role?.name || "No Role",
        permissions: member.role?.rolePermissions.map((rp) => rp.permission.name) || [],
        createdAt: member.createdAt,
      })),
    };
  });
