import { useAuthStore } from "~/stores/authStore";

export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  // Ensure permissions is always an array, even if user.permissions is null, undefined, or not an array
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const role = user?.role;

  // Generic permission check
  const hasPermission = (permissionName: string): boolean => {
    return permissions.includes(permissionName);
  };

  // Check if user has any of the allowed permissions
  const hasAnyPermission = (permissionNames: string[]): boolean => {
    return permissionNames.some((perm) => permissions.includes(perm));
  };

  // Permission helper functions
  const canManageScenes = (): boolean => {
    return hasPermission("manage_scenes");
  };

  const canViewScenes = (): boolean => {
    return hasPermission("view_scenes");
  };

  const canManageTimers = (): boolean => {
    return hasPermission("manage_timers");
  };

  const canMarkSceneComplete = (): boolean => {
    return hasPermission("mark_scene_complete");
  };

  const canManageTeam = (): boolean => {
    return hasPermission("manage_team");
  };

  const canViewTeam = (): boolean => {
    return hasPermission("view_team");
  };

  const canManageCompany = (): boolean => {
    return hasPermission("manage_company");
  };

  const canManageReports = (): boolean => {
    return hasPermission("manage_reports");
  };

  const canViewReports = (): boolean => {
    return hasPermission("view_reports");
  };

  const canInviteUsers = (): boolean => {
    return hasPermission("manage_team");
  };

  const canManageShows = (): boolean => {
    return hasPermission("manage_shows");
  };

  const canViewShows = (): boolean => {
    return hasPermission("view_shows");
  };

  const canViewTeamPage = (): boolean => {
    return hasPermission("manage_team") || hasPermission("view_team");
  };

  const canViewReportsPage = (): boolean => {
    return hasPermission("manage_reports") || hasPermission("view_reports");
  };

  const canAccessRecipientGroups = (): boolean => {
    return hasPermission("manage_recipient_groups");
  };

  const canManageRoles = (): boolean => {
    return hasPermission("manage_roles");
  };

  const canSendAnnouncements = (): boolean => {
    return hasPermission("send_announcements");
  };

  const canViewAnnouncements = (): boolean => {
    return hasPermission("view_announcements");
  };

  const canSendMessages = (): boolean => {
    return hasPermission("send_messages");
  };

  const canViewMessages = (): boolean => {
    return hasPermission("view_messages");
  };

  const canManageProductionHouses = (): boolean => {
    return hasPermission("manage_production_houses");
  };

  const canViewProductionHouses = (): boolean => {
    return hasPermission("view_production_houses");
  };

  // Scene permissions
  const canEditSceneDetails = (): boolean => {
    return hasPermission("edit_scene_details");
  };

  const canManageSceneScheduling = (): boolean => {
    return hasPermission("manage_scene_scheduling");
  };

  // Team permissions
  const canApproveTeamMembers = (): boolean => {
    return hasPermission("approve_team_members");
  };

  const canViewTeamContactInfo = (): boolean => {
    return hasPermission("view_team_contact_info");
  };

  const canEditOwnProfile = (): boolean => {
    return hasPermission("edit_own_profile");
  };

  // Report permissions
  const canExportReports = (): boolean => {
    return hasPermission("export_reports");
  };

  const canConfigureReportAutomation = (): boolean => {
    return hasPermission("configure_report_automation");
  };

  // Show permissions
  const canApproveShows = (): boolean => {
    return hasPermission("approve_shows");
  };

  const canAssignUsersToShows = (): boolean => {
    return hasPermission("assign_users_to_shows");
  };

  // Production House permissions
  const canManageProductionHouseMembers = (): boolean => {
    return hasPermission("manage_production_house_members");
  };

  const canAssignProductionHouseRoles = (): boolean => {
    return hasPermission("assign_production_house_roles");
  };

  // Company permissions
  const canViewCompanySettings = (): boolean => {
    return hasPermission("view_company_settings");
  };

  // Communication permissions
  const canManageAnnouncements = (): boolean => {
    return hasPermission("manage_announcements");
  };

  // Call Sheet permissions
  const canManageCallSheets = (): boolean => {
    return hasPermission("manage_call_sheets");
  };

  const canViewCallSheets = (): boolean => {
    return hasPermission("view_call_sheets");
  };

  const canGenerateCallSheets = (): boolean => {
    return hasPermission("generate_call_sheets");
  };

  const canDistributeCallSheets = (): boolean => {
    return hasPermission("distribute_call_sheets");
  };

  // Actor & Casting permissions
  const canManageActors = (): boolean => {
    return hasPermission("manage_actors");
  };

  const canViewActors = (): boolean => {
    return hasPermission("view_actors");
  };

  const canManageCharacterRoles = (): boolean => {
    return hasPermission("manage_character_roles");
  };

  const canAssignActorsToCharacters = (): boolean => {
    return hasPermission("assign_actors_to_characters");
  };

  // Crew Management permissions
  const canManageCrew = (): boolean => {
    return hasPermission("manage_crew");
  };

  const canViewCrew = (): boolean => {
    return hasPermission("view_crew");
  };

  const canAssignCrewPositions = (): boolean => {
    return hasPermission("assign_crew_positions");
  };

  const canManageCrewAvailability = (): boolean => {
    return hasPermission("manage_crew_availability");
  };

  // Department & Position permissions
  const canManageDepartments = (): boolean => {
    return hasPermission("manage_departments");
  };

  const canViewDepartments = (): boolean => {
    return hasPermission("view_departments");
  };

  const canManagePositions = (): boolean => {
    return hasPermission("manage_positions");
  };

  const canViewPositions = (): boolean => {
    return hasPermission("view_positions");
  };

  // Calendar & Scheduling permissions
  const canManageCalendar = (): boolean => {
    return hasPermission("manage_calendar");
  };

  const canViewCalendar = (): boolean => {
    return hasPermission("view_calendar");
  };

  const canManageShootingDays = (): boolean => {
    return hasPermission("manage_shooting_days");
  };

  const canCheckConflicts = (): boolean => {
    return hasPermission("check_conflicts");
  };

  const isActor = (): boolean => {
    return role === "Actor";
  };

  const isDeveloper = (): boolean => {
    return role === "Developer";
  };

  const isAdmin = (): boolean => {
    return role === "Admin";
  };

  const isManager = (): boolean => {
    return role === "Manager";
  };

  const isViewer = (): boolean => {
    return role === "Viewer";
  };

  // For backward compatibility - check if user has a specific role name
  const hasRole = (allowedRoles: string[]): boolean => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  return {
    role,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasRole,
    // Scene permissions
    canManageScenes,
    canViewScenes,
    canManageTimers,
    canMarkSceneComplete,
    canEditSceneDetails,
    canManageSceneScheduling,
    // Team permissions
    canManageTeam,
    canViewTeam,
    canApproveTeamMembers,
    canViewTeamContactInfo,
    canEditOwnProfile,
    // Report permissions
    canManageReports,
    canViewReports,
    canExportReports,
    canConfigureReportAutomation,
    // Show permissions
    canManageShows,
    canViewShows,
    canApproveShows,
    canAssignUsersToShows,
    // Production House permissions
    canManageProductionHouses,
    canViewProductionHouses,
    canManageProductionHouseMembers,
    canAssignProductionHouseRoles,
    // Company permissions
    canManageCompany,
    canViewCompanySettings,
    canManageRoles,
    canAccessRecipientGroups,
    // Communication permissions
    canSendAnnouncements,
    canViewAnnouncements,
    canManageAnnouncements,
    canSendMessages,
    canViewMessages,
    // Call Sheet permissions
    canManageCallSheets,
    canViewCallSheets,
    canGenerateCallSheets,
    canDistributeCallSheets,
    // Actor & Casting permissions
    canManageActors,
    canViewActors,
    canManageCharacterRoles,
    canAssignActorsToCharacters,
    // Crew Management permissions
    canManageCrew,
    canViewCrew,
    canAssignCrewPositions,
    canManageCrewAvailability,
    // Department & Position permissions
    canManageDepartments,
    canViewDepartments,
    canManagePositions,
    canViewPositions,
    // Calendar & Scheduling permissions
    canManageCalendar,
    canViewCalendar,
    canManageShootingDays,
    canCheckConflicts,
    // Helper functions
    canInviteUsers,
    canViewTeamPage,
    canViewReportsPage,
    // Role checks
    isActor,
    isDeveloper,
    isAdmin,
    isManager,
    isViewer,
  };
}
