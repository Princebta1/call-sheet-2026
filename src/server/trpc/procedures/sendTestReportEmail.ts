import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";
import { sendReportEmail } from "~/server/utils/sendReportEmail";
import { env } from "~/server/env";

export const sendTestReportEmail = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Create mock report data for testing
    const mockReportData = {
      showTitle: "Test Production (Demo)",
      date: new Date(),
      completedScenes: 8,
      totalScenes: 10,
      averageDuration: 45.5,
      delayedScenes: 2,
      longestScene: "Scene 7A",
    };

    // Create a test recipient using the authenticated user's information
    const testRecipient = {
      email: user.email,
      name: user.name,
      role: user.role,
    };

    // Send the test email
    const success = await sendReportEmail(mockReportData, [testRecipient]);

    if (!success) {
      return {
        success: false,
        message: "Failed to send test email. Check server logs for details.",
      };
    }

    return {
      success: true,
      message: `Test production report email sent successfully to ${user.email}`,
      recipient: user.email,
      fromEmail: env.FROM_EMAIL,
    };
  });
