import { db } from "~/server/db";

export interface ReportRecipient {
  email: string;
  name: string;
  role: string;
}

/**
 * Get all relevant team members who should receive production report notifications.
 * If groupId is provided, returns members of that group.
 * Otherwise, includes Admins (producers), Assistant Directors, and Directors (legacy behavior).
 */
export async function getReportRecipients(
  companyId: number,
  groupId?: number
): Promise<ReportRecipient[]> {
  if (groupId) {
    // Fetch recipients from the specified group
    const groupMembers = await db.recipientGroupMember.findMany({
      where: {
        groupId,
        group: {
          companyId,
        },
        user: {
          isActive: true,
          approvedByAdmin: true,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return groupMembers.map((member) => member.user);
  }

  // Legacy behavior: fetch by role
  const relevantRoles = ["Admin", "1st AD", "2nd AD", "Director"];

  const users = await db.user.findMany({
    where: {
      companyId,
      role: {
        in: relevantRoles,
      },
      isActive: true,
      approvedByAdmin: true,
    },
    select: {
      email: true,
      name: true,
      role: true,
    },
  });

  return users;
}
