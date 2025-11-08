import { Building2, CheckCircle2, XCircle, Calendar, Mail, Crown } from "lucide-react";

interface CompanyOverviewCardProps {
  company: {
    id: number;
    name: string;
    email: string;
    logoURL: string | null;
    subscriptionTier: string;
    subscriptionExpiry: Date | null;
    isActive: boolean;
    approvedByDeveloper: boolean;
    createdAt: Date;
  };
}

export function CompanyOverviewCard({ company }: CompanyOverviewCardProps) {
  const isExpiringSoon = company.subscriptionExpiry
    ? new Date(company.subscriptionExpiry).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
    : false;

  const tierColors = {
    Enterprise: "from-cinematic-gold-500/20 to-cinematic-gold-600/20 border-cinematic-gold-500/30 text-cinematic-gold-400",
    Pro: "from-cinematic-blue-500/20 to-cinematic-blue-600/20 border-cinematic-blue-500/30 text-cinematic-blue-400",
    Basic: "from-gray-700/20 to-gray-800/20 border-gray-600/30 text-gray-400",
  };

  const tierColor = tierColors[company.subscriptionTier as keyof typeof tierColors] || tierColors.Basic;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        {company.logoURL ? (
          <img
            src={company.logoURL}
            alt={company.name}
            className="w-16 h-16 rounded-xl object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-cinematic-gold-500 to-cinematic-gold-600 rounded-xl flex items-center justify-center">
            <Building2 className="h-8 w-8 text-gray-950" />
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{company.name}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="h-4 w-4" />
                {company.email}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <span
                className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 ${
                  company.isActive
                    ? "bg-cinematic-emerald-500/20 text-cinematic-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {company.isActive ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Inactive
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`bg-gradient-to-br ${tierColor} border rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5" />
                <span className="text-sm font-medium text-gray-300">Subscription</span>
              </div>
              <p className="text-xl font-bold text-white">{company.subscriptionTier}</p>
              {company.subscriptionExpiry && (
                <p className={`text-xs mt-1 ${isExpiringSoon ? "text-amber-400" : "text-gray-500"}`}>
                  {isExpiringSoon ? "Expires soon: " : "Expires: "}
                  {new Date(company.subscriptionExpiry).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-cinematic-blue-400" />
                <span className="text-sm font-medium text-gray-300">Member Since</span>
              </div>
              <p className="text-xl font-bold text-white">
                {new Date(company.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.floor((Date.now() - new Date(company.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-cinematic-emerald-400" />
                <span className="text-sm font-medium text-gray-300">Status</span>
              </div>
              <p className="text-xl font-bold text-white">
                {company.approvedByDeveloper ? "Approved" : "Pending"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {company.approvedByDeveloper ? "Developer verified" : "Awaiting approval"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
