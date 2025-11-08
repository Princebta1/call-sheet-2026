import {
  createCallerFactory,
  createTRPCRouter,
} from "~/server/trpc/main";

// Auth procedures
import { register } from "~/server/trpc/procedures/register";
import { login } from "~/server/trpc/procedures/login";
import { sendTemporaryResetPassword } from "~/server/trpc/procedures/sendTemporaryResetPassword";
import { requestPasswordReset } from "~/server/trpc/procedures/requestPasswordReset";
import { resetPassword } from "~/server/trpc/procedures/resetPassword";
import { getCurrentUser } from "~/server/trpc/procedures/getCurrentUser";
import { getDashboardStats } from "~/server/trpc/procedures/getDashboardStats";
import { getCompanyDashboardStats } from "~/server/trpc/procedures/getCompanyDashboardStats";

// Search procedures
import { searchAll } from "~/server/trpc/procedures/searchAll";

// Show procedures
import { getShows } from "~/server/trpc/procedures/getShows";
import { createShow } from "~/server/trpc/procedures/createShow";
import { updateShow } from "~/server/trpc/procedures/updateShow";
import { deleteShow } from "~/server/trpc/procedures/deleteShow";
import { getPendingShows } from "~/server/trpc/procedures/getPendingShows";
import { approveShow } from "~/server/trpc/procedures/approveShow";
import { rejectShow } from "~/server/trpc/procedures/rejectShow";

// Production House procedures
import { getProductionHouses } from "~/server/trpc/procedures/getProductionHouses";
import { getPublicProductionHouses } from "~/server/trpc/procedures/getPublicProductionHouses";
import { createProductionHouse } from "~/server/trpc/procedures/createProductionHouse";
import { createProductionHouseSimple } from "~/server/trpc/procedures/createProductionHouseSimple";
import { updateProductionHouse } from "~/server/trpc/procedures/updateProductionHouse";
import { deleteProductionHouse } from "~/server/trpc/procedures/deleteProductionHouse";
import { getProductionHouseMembers } from "~/server/trpc/procedures/getProductionHouseMembers";
import { addProductionHouseMember } from "~/server/trpc/procedures/addProductionHouseMember";
import { updateProductionHouseMemberRole } from "~/server/trpc/procedures/updateProductionHouseMemberRole";
import { removeProductionHouseMember } from "~/server/trpc/procedures/removeProductionHouseMember";

// Scene procedures
import { getScenes } from "~/server/trpc/procedures/getScenes";
import { getAllScenes } from "~/server/trpc/procedures/getAllScenes";
import { createScene } from "~/server/trpc/procedures/createScene";
import { updateScene } from "~/server/trpc/procedures/updateScene";
import { deleteScene } from "~/server/trpc/procedures/deleteScene";
import { startSceneTimer } from "~/server/trpc/procedures/startSceneTimer";
import { stopSceneTimer } from "~/server/trpc/procedures/stopSceneTimer";
import { markSceneComplete } from "~/server/trpc/procedures/markSceneComplete";
import { checkSceneConflicts } from "~/server/trpc/procedures/checkSceneConflicts";
import { getScenesWithConflicts } from "~/server/trpc/procedures/getScenesWithConflicts";

// Team procedures
import { getCompanyUsers } from "~/server/trpc/procedures/getCompanyUsers";
import { inviteUser } from "~/server/trpc/procedures/inviteUser";
import { inviteBulkUsers } from "~/server/trpc/procedures/inviteBulkUsers";
import { updateUserRole } from "~/server/trpc/procedures/updateUserRole";
import { updateUserStatus } from "~/server/trpc/procedures/updateUserStatus";
import { updateActorProfile } from "~/server/trpc/procedures/updateActorProfile";
import { removeUser } from "~/server/trpc/procedures/removeUser";
import { updateUserPresence } from "~/server/trpc/procedures/updateUserPresence";

// User-Show Assignment procedures
import { assignUserToShow } from "~/server/trpc/procedures/assignUserToShow";
import { removeUserFromShow } from "~/server/trpc/procedures/removeUserFromShow";

// Character Role procedures
import { getCharacterRoles } from "~/server/trpc/procedures/getCharacterRoles";
import { createCharacterRole } from "~/server/trpc/procedures/createCharacterRole";
import { updateCharacterRole } from "~/server/trpc/procedures/updateCharacterRole";
import { deleteCharacterRole } from "~/server/trpc/procedures/deleteCharacterRole";
import { assignActorToCharacter } from "~/server/trpc/procedures/assignActorToCharacter";
import { removeActorFromCharacter } from "~/server/trpc/procedures/removeActorFromCharacter";

// Department and Position procedures
import { getDepartments } from "~/server/trpc/procedures/getDepartments";
import { createDepartment } from "~/server/trpc/procedures/createDepartment";
import { updateDepartment } from "~/server/trpc/procedures/updateDepartment";
import { deleteDepartment } from "~/server/trpc/procedures/deleteDepartment";
import { createPosition } from "~/server/trpc/procedures/createPosition";
import { updatePosition } from "~/server/trpc/procedures/updatePosition";
import { deletePosition } from "~/server/trpc/procedures/deletePosition";

// Crew Assignment procedures
import { getCrewAssignments } from "~/server/trpc/procedures/getCrewAssignments";
import { assignCrewToPosition } from "~/server/trpc/procedures/assignCrewToPosition";
import { removeCrewAssignment } from "~/server/trpc/procedures/removeCrewAssignment";

// Call sheet procedures
import { generateCallSheet } from "~/server/trpc/procedures/generateCallSheet";
import { createManualCallSheet } from "~/server/trpc/procedures/createManualCallSheet";
import { getCallSheets } from "~/server/trpc/procedures/getCallSheets";
import { getMinioBaseUrl } from "~/server/trpc/procedures/getMinioBaseUrl";

// Report procedures
import { getReports } from "~/server/trpc/procedures/getReports";
import { generateReport } from "~/server/trpc/procedures/generateReport";
import { autoGenerateReportsForCompany } from "~/server/trpc/procedures/autoGenerateReportsForCompany";
import { sendTestReportEmail } from "~/server/trpc/procedures/sendTestReportEmail";

// Recipient group procedures
import { getRecipientGroups } from "~/server/trpc/procedures/getRecipientGroups";
import { createRecipientGroup } from "~/server/trpc/procedures/createRecipientGroup";
import { updateRecipientGroup } from "~/server/trpc/procedures/updateRecipientGroup";
import { deleteRecipientGroup } from "~/server/trpc/procedures/deleteRecipientGroup";

// Role procedures
import { getPermissions } from "~/server/trpc/procedures/getPermissions";
import { getRoles } from "~/server/trpc/procedures/getRoles";
import { getRoleTemplates } from "~/server/trpc/procedures/getRoleTemplates";
import { createRole } from "~/server/trpc/procedures/createRole";
import { updateRole } from "~/server/trpc/procedures/updateRole";
import { deleteRole } from "~/server/trpc/procedures/deleteRole";
import { cloneRole } from "~/server/trpc/procedures/cloneRole";

// Settings procedures
import { updateCompanySettings } from "~/server/trpc/procedures/updateCompanySettings";
import { updateUserProfile } from "~/server/trpc/procedures/updateUserProfile";
import { changePassword } from "~/server/trpc/procedures/changePassword";
import { generateAvatarUploadUrl } from "~/server/trpc/procedures/generateAvatarUploadUrl";
import { generateProductionHouseLogoUploadUrl } from "~/server/trpc/procedures/generateProductionHouseLogoUploadUrl";
import { generateShowThumbnailUploadUrl } from "~/server/trpc/procedures/generateShowThumbnailUploadUrl";

// Developer procedures
import { getSystemHealth } from "~/server/trpc/procedures/getSystemHealth";
import { getUsageStatistics } from "~/server/trpc/procedures/getUsageStatistics";
import { getAllCompanies } from "~/server/trpc/procedures/getAllCompanies";
import { createCompanyAndAdmin } from "~/server/trpc/procedures/createCompanyAndAdmin";

// Announcement procedures
import { createAnnouncement } from "~/server/trpc/procedures/createAnnouncement";
import { getAnnouncements } from "~/server/trpc/procedures/getAnnouncements";
import { markAnnouncementRead } from "~/server/trpc/procedures/markAnnouncementRead";
import { getAnnouncementStats } from "~/server/trpc/procedures/getAnnouncementStats";

// Messaging procedures
import { createMessage } from "~/server/trpc/procedures/createMessage";
import { getMessages } from "~/server/trpc/procedures/getMessages";
import { messageStream } from "~/server/trpc/procedures/messageStream";
import { generateMessageImageUploadUrl } from "~/server/trpc/procedures/generateMessageImageUploadUrl";
import { getMessageStats } from "~/server/trpc/procedures/getMessageStats";
import { markMessageAsRead } from "~/server/trpc/procedures/markMessageAsRead";
import { sendTypingStatus } from "~/server/trpc/procedures/sendTypingStatus";
import { typingStatusStream } from "~/server/trpc/procedures/typingStatusStream";

export const appRouter = createTRPCRouter({
  // Auth
  register,
  login,
  getCurrentUser,
  getDashboardStats,
  getCompanyDashboardStats,
  
  // Search
  searchAll,
  
  // Shows
  getShows,
  createShow,
  updateShow,
  deleteShow,
  getPendingShows,
  approveShow,
  rejectShow,
  
  // Production Houses
  getProductionHouses,
  getPublicProductionHouses,
  createProductionHouse,
  createProductionHouseSimple,
  updateProductionHouse,
  deleteProductionHouse,
  getProductionHouseMembers,
  addProductionHouseMember,
  updateProductionHouseMemberRole,
  removeProductionHouseMember,
  
  // Scenes
  getScenes,
  getAllScenes,
  createScene,
  updateScene,
  deleteScene,
  startSceneTimer,
  stopSceneTimer,
  markSceneComplete,
  checkSceneConflicts,
  getScenesWithConflicts,
  
  // Team
  getCompanyUsers,
  inviteUser,
  inviteBulkUsers,
  updateUserRole,
  updateUserStatus,
  updateActorProfile,
  removeUser,
  updateUserPresence,
  
  // User-Show Assignments
  assignUserToShow,
  removeUserFromShow,
  
  // Character Roles
  getCharacterRoles,
  createCharacterRole,
  updateCharacterRole,
  deleteCharacterRole,
  assignActorToCharacter,
  removeActorFromCharacter,
  
  // Departments & Positions
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createPosition,
  updatePosition,
  deletePosition,
  
  // Crew Assignments
  getCrewAssignments,
  assignCrewToPosition,
  removeCrewAssignment,
  
  // Call Sheets
  generateCallSheet,
  createManualCallSheet,
  getCallSheets,
  getMinioBaseUrl,
  
  // Reports
  getReports,
  generateReport,
  autoGenerateReportsForCompany,
  sendTestReportEmail,
  
  // Recipient Groups
  getRecipientGroups,
  createRecipientGroup,
  updateRecipientGroup,
  deleteRecipientGroup,
  
  // Roles
  getPermissions,
  getRoles,
  getRoleTemplates,
  createRole,
  updateRole,
  deleteRole,
  cloneRole,
  
  // Settings
  updateCompanySettings,
  updateUserProfile,
  changePassword,
  sendTemporaryResetPassword,
  requestPasswordReset,
  resetPassword,
  generateAvatarUploadUrl,
  generateProductionHouseLogoUploadUrl,
  generateShowThumbnailUploadUrl,
  
  // Developer
  getSystemHealth,
  getUsageStatistics,
  getAllCompanies,
  createCompanyAndAdmin,
  
  // Announcements
  createAnnouncement,
  getAnnouncements,
  markAnnouncementRead,
  getAnnouncementStats,
  
  // Messaging
  createMessage,
  getMessages,
  messageStream,
  generateMessageImageUploadUrl,
  getMessageStats,
  markMessageAsRead,
  sendTypingStatus,
  typingStatusStream,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
