import { createFileRoute } from "@tanstack/react-router";
import { Settings, Info } from "lucide-react";

export const Route = createFileRoute("/shows/$showId/settings/")({
  component: ProductionSettingsPage,
});

function ProductionSettingsPage() {
  const { showId } = Route.useParams();

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
              <Settings className="h-6 w-6 text-cinematic-gold-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Production Settings</h1>
          </div>
          <p className="text-gray-400">
            Configure settings specific to this production
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-cinematic-blue-500/20 rounded-xl">
              <Info className="h-6 w-6 text-cinematic-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Production-Specific Settings
              </h3>
              <p className="text-gray-400 mb-4">
                Production-level configuration options will be available here, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-400">
                <li>Production details (title, description, dates)</li>
                <li>Default shooting schedule preferences</li>
                <li>Call sheet distribution settings</li>
                <li>Report generation preferences</li>
                <li>Notification settings for this production</li>
              </ul>
              <div className="mt-6 p-4 bg-cinematic-gold-500/10 border border-cinematic-gold-500/30 rounded-lg">
                <p className="text-sm text-cinematic-gold-400">
                  <strong>Note:</strong> For now, use the main Settings page to configure company-wide settings.
                  Production-specific settings will be enhanced in a future update.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
