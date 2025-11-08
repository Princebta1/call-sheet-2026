import { Resend } from "resend";
import { env } from "~/server/env";
import type { ReportRecipient } from "./getReportRecipients";

const resend = new Resend(env.RESEND_API_KEY);

export interface ReportEmailData {
  showTitle: string;
  date: Date;
  completedScenes: number;
  totalScenes: number;
  averageDuration: number | null;
  delayedScenes: number;
  longestScene: string | null;
  totalPlannedScenes?: number | null;
  scenesShot?: number | null;
  scenesScheduled?: number | null;
  completionRateOverall?: number | null;
  averageSetupTime?: number | null;
  totalShootingTime?: number | null;
  behindScheduleScenes?: number | null;
  aheadScheduleScenes?: number | null;
}

function formatReportEmail(data: ReportEmailData): string {
  const formattedDate = data.date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const completionRate = data.totalScenes > 0
    ? Math.round((data.completedScenes / data.totalScenes) * 100)
    : 0;

  const overallCompletionRate = data.completionRateOverall !== undefined && data.completionRateOverall !== null
    ? Math.round(data.completionRateOverall)
    : null;

  const avgDurationText = data.averageDuration !== null
    ? `${Math.round(data.averageDuration)} minutes`
    : "N/A";

  const avgSetupTimeText = data.averageSetupTime !== undefined && data.averageSetupTime !== null
    ? `${Math.round(data.averageSetupTime)} minutes`
    : "N/A";

  const totalShootingTimeText = data.totalShootingTime !== undefined && data.totalShootingTime !== null
    ? `${Math.round(data.totalShootingTime)} minutes (${(data.totalShootingTime / 60).toFixed(1)} hours)`
    : "N/A";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .metric-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          .metric-card {
            background: white;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .metric-card.full-width {
            grid-column: 1 / -1;
          }
          .metric-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
          }
          .summary {
            background: white;
            padding: 20px;
            border-radius: 6px;
            margin-top: 20px;
            border-left: 4px solid #10b981;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
            margin: 25px 0 15px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Production Report Generated</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.showTitle}</p>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${formattedDate}</p>
        </div>
        
        <div class="content">
          <h2 style="margin-top: 0; color: #111827;">Daily Performance</h2>
          
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-label">Daily Completion</div>
              <div class="metric-value">${completionRate}%</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                ${data.completedScenes} of ${data.totalScenes} scenes
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Average Duration</div>
              <div class="metric-value">${avgDurationText}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                Per completed scene
              </div>
            </div>
            
            ${data.totalShootingTime !== undefined ? `
            <div class="metric-card">
              <div class="metric-label">Total Shooting Time</div>
              <div class="metric-value">${totalShootingTimeText}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                For all scenes today
              </div>
            </div>
            ` : ''}
            
            ${data.averageSetupTime !== undefined ? `
            <div class="metric-card">
              <div class="metric-label">Avg Setup Time</div>
              <div class="metric-value">${avgSetupTimeText}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                Estimated per scene
              </div>
            </div>
            ` : ''}
            
            <div class="metric-card">
              <div class="metric-label">Delayed Scenes</div>
              <div class="metric-value">${data.delayedScenes}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                Over 60 minutes
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Longest Scene</div>
              <div class="metric-value">${data.longestScene || "N/A"}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                Scene number
              </div>
            </div>
            
            ${data.behindScheduleScenes !== undefined || data.aheadScheduleScenes !== undefined ? `
            <div class="metric-card">
              <div class="metric-label">Behind Schedule</div>
              <div class="metric-value">${data.behindScheduleScenes || 0}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                Scenes over expected time
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Ahead of Schedule</div>
              <div class="metric-value">${data.aheadScheduleScenes || 0}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                Scenes under expected time
              </div>
            </div>
            ` : ''}
          </div>
          
          ${overallCompletionRate !== null ? `
          <div class="section-title">Overall Production Progress</div>
          <div class="metric-grid">
            <div class="metric-card full-width">
              <div class="metric-label">Show Completion Rate</div>
              <div class="metric-value">${overallCompletionRate}%</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                ${data.totalPlannedScenes ? `Total: ${data.totalPlannedScenes} scenes planned` : ''}
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="summary">
            <h3 style="margin-top: 0; color: #111827;">Summary</h3>
            <p style="margin: 0; color: #4b5563;">
              ${data.completedScenes === data.totalScenes
                ? `✅ All ${data.totalScenes} scenes completed successfully!`
                : `🎬 ${data.completedScenes} out of ${data.totalScenes} scenes completed today.`
              }
              ${data.delayedScenes > 0
                ? ` ${data.delayedScenes} scene${data.delayedScenes > 1 ? 's' : ''} took longer than expected.`
                : ` All scenes completed on schedule.`
              }
              ${overallCompletionRate !== null
                ? ` Overall production is ${overallCompletionRate}% complete.`
                : ''
              }
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from your production management system.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send production report email notifications to relevant team members.
 * Returns true if successful, false if there was an error.
 */
export async function sendReportEmail(
  data: ReportEmailData,
  recipients: ReportRecipient[]
): Promise<boolean> {
  if (recipients.length === 0) {
    console.log("No recipients to send report email to");
    return false;
  }

  const subject = `Production Report: ${data.showTitle} - ${data.date.toLocaleDateString()}`;
  const htmlContent = formatReportEmail(data);

  try {
    // Send individual emails to each recipient for better deliverability
    // and to avoid exposing recipient lists
    const emailPromises = recipients.map(async (recipient) => {
      try {
        await resend.emails.send({
          from: env.FROM_EMAIL,
          to: recipient.email,
          subject,
          html: htmlContent,
        });
        console.log(`Report email sent to ${recipient.name} (${recipient.email})`);
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        // Don't throw - we want to try sending to other recipients
      }
    });

    await Promise.all(emailPromises);
    return true;
  } catch (error) {
    console.error("Error sending report emails:", error);
    return false;
  }
}
