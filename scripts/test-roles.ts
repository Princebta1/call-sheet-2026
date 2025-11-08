import { db } from "~/server/db";
import { hashPassword, signToken, authenticateUser, checkPermission } from "~/server/utils/auth";
import { TRPCError } from "@trpc/server";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  error?: any;
}

const testResults: TestResult[] = [];

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.cyan);
}

function logSection(message: string) {
  log(`\n${"=".repeat(60)}`, colors.bold);
  log(message, colors.bold + colors.blue);
  log("=".repeat(60), colors.bold);
}

function addTestResult(name: string, passed: boolean, message: string, error?: any) {
  testResults.push({ name, passed, message, error });
  if (passed) {
    logSuccess(`${name}: ${message}`);
  } else {
    logError(`${name}: ${message}`);
    if (error) {
      console.error("  Error details:", error.message || error);
    }
  }
}

interface TestUser {
  id: number;
  name: string;
  email: string;
  token: string;
  role: string;
}

let testCompany: any;
let testShow: any;
let testProductionHouse: any;
let managerUser: TestUser;
let viewerUser: TestUser;
let testScene: any;

const TEST_COMPANY_EMAIL = "test-roles@callsheet.test";
const MANAGER_EMAIL = "manager@callsheet.test";
const VIEWER_EMAIL = "viewer@callsheet.test";
const TEST_PASSWORD = "TestPassword123!";

async function setupTestCompany() {
  logSection("Setting up test company and production house");

  // Check if test company already exists
  let company = await db.company.findFirst({
    where: { email: TEST_COMPANY_EMAIL },
  });

  if (company) {
    logInfo("Test company already exists, cleaning up old data...");
    
    // Clean up old test users
    await db.user.deleteMany({
      where: { companyId: company.id },
    });
    
    // Clean up old shows and related data
    await db.show.deleteMany({
      where: { companyId: company.id },
    });
    
    // Clean up production houses
    await db.productionHouse.deleteMany({
      where: { companyId: company.id },
    });
    
    logInfo("Old test data cleaned up");
  } else {
    // Create test company
    company = await db.company.create({
      data: {
        name: "Role Test Company",
        email: TEST_COMPANY_EMAIL,
        subscriptionTier: "Pro",
        isActive: true,
        approvedByDeveloper: true,
      },
    });
    logSuccess("Created test company");
  }

  testCompany = company;

  // Create test production house
  const productionHouse = await db.productionHouse.create({
    data: {
      companyId: company.id,
      name: "Test Production House",
      description: "Production house for role testing",
    },
  });
  testProductionHouse = productionHouse;
  logSuccess("Created test production house");
}

async function createTestUsers() {
  logSection("Creating test users");

  // Get Manager and Viewer role IDs
  const managerRole = await db.role.findFirst({
    where: {
      name: "Manager",
      isSystemRole: true,
    },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  const viewerRole = await db.role.findFirst({
    where: {
      name: "Viewer",
      isSystemRole: true,
    },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!managerRole || !viewerRole) {
    throw new Error("Manager or Viewer role not found in database");
  }

  logInfo(`Manager role has ${managerRole.rolePermissions.length} permissions`);
  logInfo(`Viewer role has ${viewerRole.rolePermissions.length} permissions`);

  const passwordHash = await hashPassword(TEST_PASSWORD);

  // Create Manager user
  const manager = await db.user.create({
    data: {
      name: "Test Manager",
      email: MANAGER_EMAIL,
      passwordHash,
      roleId: managerRole.id,
      companyId: testCompany.id,
      isActive: true,
      approvedByAdmin: true,
    },
  });

  const managerPermissions = managerRole.rolePermissions.map(rp => rp.permission.name);
  const managerToken = signToken({
    userId: manager.id,
    email: manager.email,
    role: "Manager",
    roleId: managerRole.id,
    companyId: testCompany.id,
    permissions: managerPermissions,
  });

  managerUser = {
    id: manager.id,
    name: manager.name,
    email: manager.email,
    token: managerToken,
    role: "Manager",
  };
  logSuccess(`Created Manager user: ${manager.email}`);

  // Create Viewer user
  const viewer = await db.user.create({
    data: {
      name: "Test Viewer",
      email: VIEWER_EMAIL,
      passwordHash,
      roleId: viewerRole.id,
      companyId: testCompany.id,
      isActive: true,
      approvedByAdmin: true,
    },
  });

  const viewerPermissions = viewerRole.rolePermissions.map(rp => rp.permission.name);
  const viewerToken = signToken({
    userId: viewer.id,
    email: viewer.email,
    role: "Viewer",
    roleId: viewerRole.id,
    companyId: testCompany.id,
    permissions: viewerPermissions,
  });

  viewerUser = {
    id: viewer.id,
    name: viewer.name,
    email: viewer.email,
    token: viewerToken,
    role: "Viewer",
  };
  logSuccess(`Created Viewer user: ${viewer.email}`);

  // Update production house admin to manager
  await db.productionHouse.update({
    where: { id: testProductionHouse.id },
    data: { adminId: manager.id },
  });
}

async function testShowManagement() {
  logSection("Testing Show Management");

  // Test Manager can create show
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "manage_shows");

    testShow = await db.show.create({
      data: {
        companyId: testCompany.id,
        title: "Test Show for Role Testing",
        productionHouseId: testProductionHouse.id,
        description: "A test show for verifying role permissions",
        status: "Pre-Production",
        createdBy: managerUser.id,
      },
    });

    addTestResult(
      "Manager Create Show",
      true,
      "Manager successfully created a show"
    );
  } catch (error) {
    addTestResult(
      "Manager Create Show",
      false,
      "Manager failed to create show",
      error
    );
  }

  // Test Viewer cannot create show
  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "manage_shows");

    // If we get here, the test failed (viewer shouldn't have permission)
    addTestResult(
      "Viewer Create Show (should fail)",
      false,
      "Viewer was incorrectly allowed to create show"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Viewer Create Show (should fail)",
        true,
        "Viewer correctly denied permission to create show"
      );
    } else {
      addTestResult(
        "Viewer Create Show (should fail)",
        false,
        "Unexpected error when testing viewer show creation",
        error
      );
    }
  }

  // Test both can view shows
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    const shows = await db.show.findMany({
      where: { companyId: testCompany.id },
    });
    addTestResult(
      "Manager View Shows",
      shows.length > 0,
      `Manager can view ${shows.length} show(s)`
    );
  } catch (error) {
    addTestResult("Manager View Shows", false, "Manager failed to view shows", error);
  }

  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    const shows = await db.show.findMany({
      where: { companyId: testCompany.id },
    });
    addTestResult(
      "Viewer View Shows",
      shows.length > 0,
      `Viewer can view ${shows.length} show(s)`
    );
  } catch (error) {
    addTestResult("Viewer View Shows", false, "Viewer failed to view shows", error);
  }

  // Test Manager can update show
  if (testShow) {
    try {
      const { user, payload } = await authenticateUser(managerUser.token);
      checkPermission(payload.permissions, "manage_shows");

      await db.show.update({
        where: { id: testShow.id },
        data: { description: "Updated by Manager" },
      });

      addTestResult(
        "Manager Update Show",
        true,
        "Manager successfully updated show"
      );
    } catch (error) {
      addTestResult(
        "Manager Update Show",
        false,
        "Manager failed to update show",
        error
      );
    }

    // Test Viewer cannot update show
    try {
      const { user, payload } = await authenticateUser(viewerUser.token);
      checkPermission(payload.permissions, "manage_shows");

      addTestResult(
        "Viewer Update Show (should fail)",
        false,
        "Viewer was incorrectly allowed to update show"
      );
    } catch (error) {
      if (error instanceof TRPCError && error.code === "FORBIDDEN") {
        addTestResult(
          "Viewer Update Show (should fail)",
          true,
          "Viewer correctly denied permission to update show"
        );
      } else {
        addTestResult(
          "Viewer Update Show (should fail)",
          false,
          "Unexpected error when testing viewer show update",
          error
        );
      }
    }
  }
}

async function testSceneManagement() {
  logSection("Testing Scene Management");

  if (!testShow) {
    logError("Test show not available, skipping scene tests");
    return;
  }

  // Test Manager can create scene
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "manage_scenes");

    testScene = await db.scene.create({
      data: {
        showId: testShow.id,
        companyId: testCompany.id,
        sceneNumber: "1A",
        title: "Test Scene",
        description: "A test scene for role permission testing",
        location: "Test Location",
        status: "Unshot",
      },
    });

    addTestResult(
      "Manager Create Scene",
      true,
      "Manager successfully created a scene"
    );
  } catch (error) {
    addTestResult(
      "Manager Create Scene",
      false,
      "Manager failed to create scene",
      error
    );
  }

  // Test Viewer cannot create scene
  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "manage_scenes");

    addTestResult(
      "Viewer Create Scene (should fail)",
      false,
      "Viewer was incorrectly allowed to create scene"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Viewer Create Scene (should fail)",
        true,
        "Viewer correctly denied permission to create scene"
      );
    } else {
      addTestResult(
        "Viewer Create Scene (should fail)",
        false,
        "Unexpected error when testing viewer scene creation",
        error
      );
    }
  }

  // Test both can view scenes
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    const scenes = await db.scene.findMany({
      where: { companyId: testCompany.id },
    });
    addTestResult(
      "Manager View Scenes",
      scenes.length > 0,
      `Manager can view ${scenes.length} scene(s)`
    );
  } catch (error) {
    addTestResult("Manager View Scenes", false, "Manager failed to view scenes", error);
  }

  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    const scenes = await db.scene.findMany({
      where: { companyId: testCompany.id },
    });
    addTestResult(
      "Viewer View Scenes",
      scenes.length > 0,
      `Viewer can view ${scenes.length} scene(s)`
    );
  } catch (error) {
    addTestResult("Viewer View Scenes", false, "Viewer failed to view scenes", error);
  }

  // Test Manager can update scene
  if (testScene) {
    try {
      const { user, payload } = await authenticateUser(managerUser.token);
      checkPermission(payload.permissions, "manage_scenes");

      await db.scene.update({
        where: { id: testScene.id },
        data: { description: "Updated by Manager" },
      });

      addTestResult(
        "Manager Update Scene",
        true,
        "Manager successfully updated scene"
      );
    } catch (error) {
      addTestResult(
        "Manager Update Scene",
        false,
        "Manager failed to update scene",
        error
      );
    }

    // Test Viewer cannot update scene
    try {
      const { user, payload } = await authenticateUser(viewerUser.token);
      checkPermission(payload.permissions, "manage_scenes");

      addTestResult(
        "Viewer Update Scene (should fail)",
        false,
        "Viewer was incorrectly allowed to update scene"
      );
    } catch (error) {
      if (error instanceof TRPCError && error.code === "FORBIDDEN") {
        addTestResult(
          "Viewer Update Scene (should fail)",
          true,
          "Viewer correctly denied permission to update scene"
        );
      } else {
        addTestResult(
          "Viewer Update Scene (should fail)",
          false,
          "Unexpected error when testing viewer scene update",
          error
        );
      }
    }

    // Test Manager can manage timers
    try {
      const { user, payload } = await authenticateUser(managerUser.token);
      checkPermission(payload.permissions, "manage_timers");

      addTestResult(
        "Manager Manage Timers",
        true,
        "Manager has permission to manage timers"
      );
    } catch (error) {
      addTestResult(
        "Manager Manage Timers",
        false,
        "Manager failed timer permission check",
        error
      );
    }

    // Test Viewer cannot manage timers
    try {
      const { user, payload } = await authenticateUser(viewerUser.token);
      checkPermission(payload.permissions, "manage_timers");

      addTestResult(
        "Viewer Manage Timers (should fail)",
        false,
        "Viewer was incorrectly allowed to manage timers"
      );
    } catch (error) {
      if (error instanceof TRPCError && error.code === "FORBIDDEN") {
        addTestResult(
          "Viewer Manage Timers (should fail)",
          true,
          "Viewer correctly denied permission to manage timers"
        );
      } else {
        addTestResult(
          "Viewer Manage Timers (should fail)",
          false,
          "Unexpected error when testing viewer timer management",
          error
        );
      }
    }

    // Test Manager can mark scene complete
    try {
      const { user, payload } = await authenticateUser(managerUser.token);
      checkPermission(payload.permissions, "mark_scene_complete");

      addTestResult(
        "Manager Mark Scene Complete",
        true,
        "Manager has permission to mark scenes complete"
      );
    } catch (error) {
      addTestResult(
        "Manager Mark Scene Complete",
        false,
        "Manager failed mark complete permission check",
        error
      );
    }

    // Test Viewer cannot mark scene complete
    try {
      const { user, payload } = await authenticateUser(viewerUser.token);
      checkPermission(payload.permissions, "mark_scene_complete");

      addTestResult(
        "Viewer Mark Scene Complete (should fail)",
        false,
        "Viewer was incorrectly allowed to mark scenes complete"
      );
    } catch (error) {
      if (error instanceof TRPCError && error.code === "FORBIDDEN") {
        addTestResult(
          "Viewer Mark Scene Complete (should fail)",
          true,
          "Viewer correctly denied permission to mark scenes complete"
        );
      } else {
        addTestResult(
          "Viewer Mark Scene Complete (should fail)",
          false,
          "Unexpected error when testing viewer mark complete",
          error
        );
      }
    }
  }
}

async function testReportManagement() {
  logSection("Testing Report Management");

  // Test Manager can manage reports
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "manage_reports");

    addTestResult(
      "Manager Manage Reports",
      true,
      "Manager has permission to manage reports"
    );
  } catch (error) {
    addTestResult(
      "Manager Manage Reports",
      false,
      "Manager failed report management permission check",
      error
    );
  }

  // Test Viewer cannot manage reports
  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "manage_reports");

    addTestResult(
      "Viewer Manage Reports (should fail)",
      false,
      "Viewer was incorrectly allowed to manage reports"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Viewer Manage Reports (should fail)",
        true,
        "Viewer correctly denied permission to manage reports"
      );
    } else {
      addTestResult(
        "Viewer Manage Reports (should fail)",
        false,
        "Unexpected error when testing viewer report management",
        error
      );
    }
  }

  // Test both can view reports
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "view_reports");

    addTestResult(
      "Manager View Reports",
      true,
      "Manager has permission to view reports"
    );
  } catch (error) {
    addTestResult(
      "Manager View Reports",
      false,
      "Manager failed view reports permission check",
      error
    );
  }

  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "view_reports");

    addTestResult(
      "Viewer View Reports",
      true,
      "Viewer has permission to view reports"
    );
  } catch (error) {
    addTestResult(
      "Viewer View Reports",
      false,
      "Viewer failed view reports permission check",
      error
    );
  }
}

async function testAnnouncementPermissions() {
  logSection("Testing Announcement Permissions");

  // Test Manager can send announcements
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "send_announcements");

    addTestResult(
      "Manager Send Announcements",
      true,
      "Manager has permission to send announcements"
    );
  } catch (error) {
    addTestResult(
      "Manager Send Announcements",
      false,
      "Manager failed send announcements permission check",
      error
    );
  }

  // Test Viewer cannot send announcements
  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "send_announcements");

    addTestResult(
      "Viewer Send Announcements (should fail)",
      false,
      "Viewer was incorrectly allowed to send announcements"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Viewer Send Announcements (should fail)",
        true,
        "Viewer correctly denied permission to send announcements"
      );
    } else {
      addTestResult(
        "Viewer Send Announcements (should fail)",
        false,
        "Unexpected error when testing viewer announcement sending",
        error
      );
    }
  }

  // Test both can view announcements
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "view_announcements");

    addTestResult(
      "Manager View Announcements",
      true,
      "Manager has permission to view announcements"
    );
  } catch (error) {
    addTestResult(
      "Manager View Announcements",
      false,
      "Manager failed view announcements permission check",
      error
    );
  }

  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "view_announcements");

    addTestResult(
      "Viewer View Announcements",
      true,
      "Viewer has permission to view announcements"
    );
  } catch (error) {
    addTestResult(
      "Viewer View Announcements",
      false,
      "Viewer failed view announcements permission check",
      error
    );
  }
}

async function testMessagingPermissions() {
  logSection("Testing Messaging Permissions");

  // Test Manager can send messages
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "send_messages");

    addTestResult(
      "Manager Send Messages",
      true,
      "Manager has permission to send messages"
    );
  } catch (error) {
    addTestResult(
      "Manager Send Messages",
      false,
      "Manager failed send messages permission check",
      error
    );
  }

  // Test Viewer cannot send messages
  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "send_messages");

    addTestResult(
      "Viewer Send Messages (should fail)",
      false,
      "Viewer was incorrectly allowed to send messages"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Viewer Send Messages (should fail)",
        true,
        "Viewer correctly denied permission to send messages"
      );
    } else {
      addTestResult(
        "Viewer Send Messages (should fail)",
        false,
        "Unexpected error when testing viewer message sending",
        error
      );
    }
  }

  // Test both can view messages
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "view_messages");

    addTestResult(
      "Manager View Messages",
      true,
      "Manager has permission to view messages"
    );
  } catch (error) {
    addTestResult(
      "Manager View Messages",
      false,
      "Manager failed view messages permission check",
      error
    );
  }

  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "view_messages");

    addTestResult(
      "Viewer View Messages",
      true,
      "Viewer has permission to view messages"
    );
  } catch (error) {
    addTestResult(
      "Viewer View Messages",
      false,
      "Viewer failed view messages permission check",
      error
    );
  }
}

async function testTeamManagement() {
  logSection("Testing Team Management");

  // Test Manager can manage team
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "manage_team");

    addTestResult(
      "Manager Manage Team",
      true,
      "Manager has permission to manage team"
    );
  } catch (error) {
    addTestResult(
      "Manager Manage Team",
      false,
      "Manager failed manage team permission check",
      error
    );
  }

  // Test Viewer cannot manage team
  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "manage_team");

    addTestResult(
      "Viewer Manage Team (should fail)",
      false,
      "Viewer was incorrectly allowed to manage team"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Viewer Manage Team (should fail)",
        true,
        "Viewer correctly denied permission to manage team"
      );
    } else {
      addTestResult(
        "Viewer Manage Team (should fail)",
        false,
        "Unexpected error when testing viewer team management",
        error
      );
    }
  }

  // Test both can view team
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "view_team");

    const users = await db.user.findMany({
      where: { companyId: testCompany.id },
    });

    addTestResult(
      "Manager View Team",
      users.length > 0,
      `Manager can view ${users.length} team member(s)`
    );
  } catch (error) {
    addTestResult(
      "Manager View Team",
      false,
      "Manager failed to view team",
      error
    );
  }

  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "view_team");

    const users = await db.user.findMany({
      where: { companyId: testCompany.id },
    });

    addTestResult(
      "Viewer View Team",
      users.length > 0,
      `Viewer can view ${users.length} team member(s)`
    );
  } catch (error) {
    addTestResult(
      "Viewer View Team",
      false,
      "Viewer failed to view team",
      error
    );
  }
}

async function testProductionHousePermissions() {
  logSection("Testing Production House Permissions");

  // Test Manager cannot manage production houses (only view)
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "manage_production_houses");

    addTestResult(
      "Manager Manage Production Houses (should fail)",
      false,
      "Manager was incorrectly allowed to manage production houses"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Manager Manage Production Houses (should fail)",
        true,
        "Manager correctly denied permission to manage production houses"
      );
    } else {
      addTestResult(
        "Manager Manage Production Houses (should fail)",
        false,
        "Unexpected error when testing manager production house management",
        error
      );
    }
  }

  // Test Viewer cannot manage production houses
  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "manage_production_houses");

    addTestResult(
      "Viewer Manage Production Houses (should fail)",
      false,
      "Viewer was incorrectly allowed to manage production houses"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Viewer Manage Production Houses (should fail)",
        true,
        "Viewer correctly denied permission to manage production houses"
      );
    } else {
      addTestResult(
        "Viewer Manage Production Houses (should fail)",
        false,
        "Unexpected error when testing viewer production house management",
        error
      );
    }
  }

  // Test both can view production houses
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "view_production_houses");

    const productionHouses = await db.productionHouse.findMany({
      where: { companyId: testCompany.id },
    });

    addTestResult(
      "Manager View Production Houses",
      productionHouses.length > 0,
      `Manager can view ${productionHouses.length} production house(s)`
    );
  } catch (error) {
    addTestResult(
      "Manager View Production Houses",
      false,
      "Manager failed to view production houses",
      error
    );
  }

  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "view_production_houses");

    const productionHouses = await db.productionHouse.findMany({
      where: { companyId: testCompany.id },
    });

    addTestResult(
      "Viewer View Production Houses",
      productionHouses.length > 0,
      `Viewer can view ${productionHouses.length} production house(s)`
    );
  } catch (error) {
    addTestResult(
      "Viewer View Production Houses",
      false,
      "Viewer failed to view production houses",
      error
    );
  }
}

async function testProfilePermissions() {
  logSection("Testing Profile Edit Permissions");

  // Test both can edit their own profile
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "edit_own_profile");

    addTestResult(
      "Manager Edit Own Profile",
      true,
      "Manager has permission to edit own profile"
    );
  } catch (error) {
    addTestResult(
      "Manager Edit Own Profile",
      false,
      "Manager failed edit own profile permission check",
      error
    );
  }

  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "edit_own_profile");

    addTestResult(
      "Viewer Edit Own Profile",
      true,
      "Viewer has permission to edit own profile"
    );
  } catch (error) {
    addTestResult(
      "Viewer Edit Own Profile",
      false,
      "Viewer failed edit own profile permission check",
      error
    );
  }
}

async function testCompanyAndRoleManagement() {
  logSection("Testing Company and Role Management");

  // Test Manager cannot manage company settings
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "manage_company");

    addTestResult(
      "Manager Manage Company (should fail)",
      false,
      "Manager was incorrectly allowed to manage company"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Manager Manage Company (should fail)",
        true,
        "Manager correctly denied permission to manage company"
      );
    } else {
      addTestResult(
        "Manager Manage Company (should fail)",
        false,
        "Unexpected error when testing manager company management",
        error
      );
    }
  }

  // Test Viewer cannot manage company settings
  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "manage_company");

    addTestResult(
      "Viewer Manage Company (should fail)",
      false,
      "Viewer was incorrectly allowed to manage company"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Viewer Manage Company (should fail)",
        true,
        "Viewer correctly denied permission to manage company"
      );
    } else {
      addTestResult(
        "Viewer Manage Company (should fail)",
        false,
        "Unexpected error when testing viewer company management",
        error
      );
    }
  }

  // Test Manager cannot manage roles
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "manage_roles");

    addTestResult(
      "Manager Manage Roles (should fail)",
      false,
      "Manager was incorrectly allowed to manage roles"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Manager Manage Roles (should fail)",
        true,
        "Manager correctly denied permission to manage roles"
      );
    } else {
      addTestResult(
        "Manager Manage Roles (should fail)",
        false,
        "Unexpected error when testing manager role management",
        error
      );
    }
  }

  // Test Viewer cannot manage roles
  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "manage_roles");

    addTestResult(
      "Viewer Manage Roles (should fail)",
      false,
      "Viewer was incorrectly allowed to manage roles"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Viewer Manage Roles (should fail)",
        true,
        "Viewer correctly denied permission to manage roles"
      );
    } else {
      addTestResult(
        "Viewer Manage Roles (should fail)",
        false,
        "Unexpected error when testing viewer role management",
        error
      );
    }
  }

  // Test Manager cannot manage recipient groups
  try {
    const { user, payload } = await authenticateUser(managerUser.token);
    checkPermission(payload.permissions, "manage_recipient_groups");

    addTestResult(
      "Manager Manage Recipient Groups (should fail)",
      false,
      "Manager was incorrectly allowed to manage recipient groups"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Manager Manage Recipient Groups (should fail)",
        true,
        "Manager correctly denied permission to manage recipient groups"
      );
    } else {
      addTestResult(
        "Manager Manage Recipient Groups (should fail)",
        false,
        "Unexpected error when testing manager recipient group management",
        error
      );
    }
  }

  // Test Viewer cannot manage recipient groups
  try {
    const { user, payload } = await authenticateUser(viewerUser.token);
    checkPermission(payload.permissions, "manage_recipient_groups");

    addTestResult(
      "Viewer Manage Recipient Groups (should fail)",
      false,
      "Viewer was incorrectly allowed to manage recipient groups"
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      addTestResult(
        "Viewer Manage Recipient Groups (should fail)",
        true,
        "Viewer correctly denied permission to manage recipient groups"
      );
    } else {
      addTestResult(
        "Viewer Manage Recipient Groups (should fail)",
        false,
        "Unexpected error when testing viewer recipient group management",
        error
      );
    }
  }
}

async function printTestSummary() {
  logSection("Test Summary");

  const totalTests = testResults.length;
  const passedTests = testResults.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;

  log(`\nTotal Tests: ${totalTests}`, colors.bold);
  log(`Passed: ${passedTests}`, colors.green);
  log(`Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.green);
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`, colors.cyan);

  if (failedTests > 0) {
    logSection("Failed Tests");
    testResults
      .filter((r) => !r.passed)
      .forEach((result) => {
        logError(`${result.name}: ${result.message}`);
        if (result.error) {
          console.error("  Error:", result.error.message || result.error);
        }
      });
  }

  logSection("Test User Credentials");
  log(`\nManager Account:`, colors.bold);
  log(`  Email: ${MANAGER_EMAIL}`, colors.cyan);
  log(`  Password: ${TEST_PASSWORD}`, colors.cyan);
  log(`  Role: Manager`, colors.cyan);

  log(`\nViewer Account:`, colors.bold);
  log(`  Email: ${VIEWER_EMAIL}`, colors.cyan);
  log(`  Password: ${TEST_PASSWORD}`, colors.cyan);
  log(`  Role: Viewer`, colors.cyan);

  log(`\nCompany:`, colors.bold);
  log(`  Name: ${testCompany.name}`, colors.cyan);
  log(`  Email: ${TEST_COMPANY_EMAIL}`, colors.cyan);

  log(`\n${colors.yellow}Note: Test users and data have been created and can be used for manual testing.${colors.reset}`);
  log(`${colors.yellow}To clean up, you can run this script again or manually delete the test company.${colors.reset}\n`);
}

async function cleanup() {
  logSection("Cleanup Options");
  log("\nTest data has been preserved for manual testing.", colors.yellow);
  log("To clean up test data, uncomment the cleanup section in the script.\n", colors.yellow);

  // Uncomment the following to automatically clean up test data:
  /*
  logInfo("Cleaning up test data...");
  
  if (testCompany) {
    await db.user.deleteMany({
      where: { companyId: testCompany.id },
    });
    
    await db.show.deleteMany({
      where: { companyId: testCompany.id },
    });
    
    await db.productionHouse.deleteMany({
      where: { companyId: testCompany.id },
    });
    
    await db.company.delete({
      where: { id: testCompany.id },
    });
    
    logSuccess("Test data cleaned up successfully");
  }
  */
}

async function runTests() {
  try {
    log(`\n${colors.bold}${colors.blue}╔${"═".repeat(58)}╗${colors.reset}`);
    log(`${colors.bold}${colors.blue}║${" ".repeat(58)}║${colors.reset}`);
    log(`${colors.bold}${colors.blue}║${" ".repeat(10)}MANAGER AND VIEWER ROLE TESTS${" ".repeat(17)}║${colors.reset}`);
    log(`${colors.bold}${colors.blue}║${" ".repeat(58)}║${colors.reset}`);
    log(`${colors.bold}${colors.blue}╚${"═".repeat(58)}╝${colors.reset}\n`);

    await setupTestCompany();
    await createTestUsers();
    await testShowManagement();
    await testSceneManagement();
    await testReportManagement();
    await testAnnouncementPermissions();
    await testMessagingPermissions();
    await testTeamManagement();
    await testProductionHousePermissions();
    await testProfilePermissions();
    await testCompanyAndRoleManagement();
    await printTestSummary();
    await cleanup();

    const failedTests = testResults.filter((r) => !r.passed).length;
    process.exit(failedTests > 0 ? 1 : 0);
  } catch (error) {
    logError("\nFatal error during test execution:");
    console.error(error);
    process.exit(1);
  }
}

runTests();
