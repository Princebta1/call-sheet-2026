import { db } from "~/server/db";
import { hashPassword } from "~/server/utils/auth";
import { minioClient } from "~/server/minio";

async function setup() {
  console.log("Running setup...");

  // RAW SQL MIGRATION: Ensure adminId column exists in ProductionHouse table
  console.log("Checking if adminId column exists in ProductionHouse table...");
  try {
    // Check if the column exists
    const columnCheck = await db.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ProductionHouse' 
      AND column_name = 'adminId'
    `;

    if (columnCheck.length === 0) {
      console.log("adminId column does not exist. Adding it as nullable...");
      
      // Add the column as nullable
      await db.$executeRaw`
        ALTER TABLE "ProductionHouse" 
        ADD COLUMN "adminId" INTEGER NULL
      `;
      
      console.log("adminId column added successfully");
    } else {
      console.log("adminId column already exists");
    }
  } catch (error) {
    console.error("Error checking/adding adminId column:", error);
    // Continue with setup even if this fails
  }

  // MIGRATION: Assign admins to production houses without adminId
  console.log("Checking for production houses without admin assignments...");
  try {
    const productionHousesWithoutAdmin = await db.productionHouse.findMany({
      where: {
        adminId: null,
      },
      include: {
        company: true,
      },
    });

    if (productionHousesWithoutAdmin.length > 0) {
      console.log(`Found ${productionHousesWithoutAdmin.length} production houses without an admin. Assigning admins...`);
      
      // Group production houses by company
      const housesByCompany = new Map<number, typeof productionHousesWithoutAdmin>();
      for (const house of productionHousesWithoutAdmin) {
        const companyHouses = housesByCompany.get(house.companyId) || [];
        companyHouses.push(house);
        housesByCompany.set(house.companyId, companyHouses);
      }

      // For each company, find an admin user and assign to production houses
      for (const [companyId, houses] of housesByCompany) {
        const company = houses[0]!.company;
        
        // Find an admin user in this company
        const adminUser = await db.user.findFirst({
          where: {
            companyId: companyId,
            isActive: true,
            approvedByAdmin: true,
          },
          include: {
            role: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        if (!adminUser) {
          console.log(`Warning: No active approved user found for company ${company.name}. Skipping production house admin assignment.`);
          continue;
        }

        console.log(`Assigning ${adminUser.name} as admin for ${houses.length} production house(s) in company: ${company.name}`);
        
        // Assign this user as admin to all production houses in this company
        for (const house of houses) {
          await db.productionHouse.update({
            where: { id: house.id },
            data: { adminId: adminUser.id },
          });
          console.log(`Assigned admin to production house: ${house.name}`);
        }
      }

      console.log("Production house admin assignment completed successfully!");
    } else {
      console.log("All production houses have admin assignments");
    }
  } catch (error) {
    console.error("Error during production house admin assignment:", error);
    // Continue with setup even if migration fails
  }

  // MIGRATION: Fix shows with NULL productionHouseId
  console.log("Checking for shows with NULL productionHouseId...");
  try {
    const showsWithoutProductionHouse = await db.show.findMany({
      where: {
        productionHouseId: null,
      },
      include: {
        company: true,
      },
    });

    if (showsWithoutProductionHouse.length > 0) {
      console.log(`Found ${showsWithoutProductionHouse.length} shows without a production house. Migrating...`);
      
      // Group shows by company
      const showsByCompany = new Map<number, typeof showsWithoutProductionHouse>();
      for (const show of showsWithoutProductionHouse) {
        const companyShows = showsByCompany.get(show.companyId) || [];
        companyShows.push(show);
        showsByCompany.set(show.companyId, companyShows);
      }

      // For each company, create or get a default production house and assign shows to it
      for (const [companyId, shows] of showsByCompany) {
        const company = shows[0]!.company;
        
        // Check if a default production house exists
        let defaultProductionHouse = await db.productionHouse.findFirst({
          where: {
            companyId: companyId,
            name: "Default Production House",
          },
        });

        // Create it if it doesn't exist
        if (!defaultProductionHouse) {
          console.log(`Creating default production house for company: ${company.name}`);
          defaultProductionHouse = await db.productionHouse.create({
            data: {
              companyId: companyId,
              name: "Default Production House",
              description: "Automatically created for existing shows without a production house",
            },
          });
        }

        // Assign all shows to the default production house
        for (const show of shows) {
          await db.show.update({
            where: { id: show.id },
            data: { productionHouseId: defaultProductionHouse.id },
          });
          console.log(`Assigned show "${show.title}" to default production house`);
        }
      }

      console.log("Migration completed successfully!");
    } else {
      console.log("No shows with NULL productionHouseId found");
    }
  } catch (error) {
    console.error("Error during productionHouseId migration:", error);
    // Continue with setup even if migration fails
  }

  // MIGRATION: Set approvalStatus for existing shows
  console.log("Checking for shows without approvalStatus set...");
  try {
    // Check if the column exists
    const columnCheck = await db.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Show' 
      AND column_name = 'approvalStatus'
    `;

    if (columnCheck.length > 0) {
      // Column exists, update existing shows that might not have the field set
      const result = await db.$executeRaw`
        UPDATE "Show" 
        SET "approvalStatus" = 'approved' 
        WHERE "approvalStatus" IS NULL OR "approvalStatus" = ''
      `;
      
      if (result > 0) {
        console.log(`Updated ${result} existing show(s) to approved status`);
      } else {
        console.log("All shows already have approvalStatus set");
      }
    } else {
      console.log("approvalStatus column does not exist yet (will be created by Prisma migration)");
    }
  } catch (error) {
    console.error("Error during approvalStatus migration:", error);
    // Continue with setup even if migration fails
  }

  // Setup MinIO buckets
  console.log("Setting up MinIO buckets...");
  try {
    // Call sheets bucket
    const callSheetsBucket = "call-sheets";
    const callSheetsExists = await minioClient.bucketExists(callSheetsBucket);
    
    if (!callSheetsExists) {
      await minioClient.makeBucket(callSheetsBucket);
      console.log(`Created bucket: ${callSheetsBucket}`);
      
      // Set bucket policy to allow public read access
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${callSheetsBucket}/*`],
          },
        ],
      };
      
      await minioClient.setBucketPolicy(callSheetsBucket, JSON.stringify(policy));
      console.log(`Set public read policy for bucket: ${callSheetsBucket}`);
    } else {
      console.log(`Bucket ${callSheetsBucket} already exists`);
    }

    // Avatars bucket
    const avatarsBucket = "avatars";
    const avatarsExists = await minioClient.bucketExists(avatarsBucket);
    
    if (!avatarsExists) {
      await minioClient.makeBucket(avatarsBucket);
      console.log(`Created bucket: ${avatarsBucket}`);
      
      // Set bucket policy to allow public read access for public/ prefix
      const avatarsPolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${avatarsBucket}/public/*`],
          },
        ],
      };
      
      await minioClient.setBucketPolicy(avatarsBucket, JSON.stringify(avatarsPolicy));
      console.log(`Set public read policy for bucket: ${avatarsBucket}`);
    } else {
      console.log(`Bucket ${avatarsBucket} already exists`);
    }

    // Message attachments bucket
    const messageAttachmentsBucket = "message-attachments";
    const messageAttachmentsExists = await minioClient.bucketExists(messageAttachmentsBucket);
    
    if (!messageAttachmentsExists) {
      await minioClient.makeBucket(messageAttachmentsBucket);
      console.log(`Created bucket: ${messageAttachmentsBucket}`);
      
      // Set bucket policy to allow public read access
      const messageAttachmentsPolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${messageAttachmentsBucket}/*`],
          },
        ],
      };
      
      await minioClient.setBucketPolicy(messageAttachmentsBucket, JSON.stringify(messageAttachmentsPolicy));
      console.log(`Set public read policy for bucket: ${messageAttachmentsBucket}`);
    } else {
      console.log(`Bucket ${messageAttachmentsBucket} already exists`);
    }

    // Production house logos bucket
    const productionHouseLogosBucket = "production-house-logos";
    const productionHouseLogosExists = await minioClient.bucketExists(productionHouseLogosBucket);
    
    if (!productionHouseLogosExists) {
      await minioClient.makeBucket(productionHouseLogosBucket);
      console.log(`Created bucket: ${productionHouseLogosBucket}`);
      
      // Set bucket policy to allow public read access
      const productionHouseLogosPolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${productionHouseLogosBucket}/*`],
          },
        ],
      };
      
      await minioClient.setBucketPolicy(productionHouseLogosBucket, JSON.stringify(productionHouseLogosPolicy));
      console.log(`Set public read policy for bucket: ${productionHouseLogosBucket}`);
    } else {
      console.log(`Bucket ${productionHouseLogosBucket} already exists`);
    }
  } catch (error) {
    console.error("Error setting up MinIO buckets:", error);
  }

  // Seed permissions if they don't exist
  console.log("Seeding permissions...");
  const permissions = [
    // Scene permissions
    { name: "manage_scenes", displayName: "Manage Scenes", description: "Create, edit, and delete scenes", category: "Scenes" },
    { name: "view_scenes", displayName: "View Scenes", description: "View scene information", category: "Scenes" },
    { name: "manage_timers", displayName: "Manage Scene Timers", description: "Start and stop scene timers", category: "Scenes" },
    { name: "mark_scene_complete", displayName: "Mark Scenes Complete", description: "Mark scenes as complete", category: "Scenes" },
    { name: "edit_scene_details", displayName: "Edit Scene Details", description: "Edit advanced scene details like camera setup, lighting, VFX notes", category: "Scenes" },
    { name: "manage_scene_scheduling", displayName: "Manage Scene Scheduling", description: "Schedule and reschedule scenes", category: "Scenes" },
    
    // Team permissions
    { name: "manage_team", displayName: "Manage Team", description: "Invite, edit, and remove team members", category: "Team" },
    { name: "view_team", displayName: "View Team", description: "View team member information", category: "Team" },
    { name: "edit_own_profile", displayName: "Edit Own Profile", description: "Edit your own profile information", category: "Team" },
    { name: "approve_team_members", displayName: "Approve Team Members", description: "Approve pending team member registrations", category: "Team" },
    { name: "view_team_contact_info", displayName: "View Team Contact Info", description: "View phone numbers and personal contact information", category: "Team" },
    
    // Report permissions
    { name: "manage_reports", displayName: "Manage Reports", description: "Generate and manage production reports", category: "Reports" },
    { name: "view_reports", displayName: "View Reports", description: "View production reports", category: "Reports" },
    { name: "export_reports", displayName: "Export Reports", description: "Export reports to PDF or other formats", category: "Reports" },
    { name: "configure_report_automation", displayName: "Configure Report Automation", description: "Set up automated report generation and distribution", category: "Reports" },
    
    // Show permissions
    { name: "manage_shows", displayName: "Manage Shows", description: "Create, edit, and delete shows", category: "Shows" },
    { name: "view_shows", displayName: "View Shows", description: "View show information", category: "Shows" },
    { name: "approve_shows", displayName: "Approve Shows", description: "Approve or reject show requests", category: "Shows" },
    { name: "assign_users_to_shows", displayName: "Assign Users to Shows", description: "Add or remove users from show teams", category: "Shows" },
    
    // Production House permissions
    { name: "manage_production_houses", displayName: "Manage Production Houses", description: "Create, edit, and delete production houses", category: "Production Houses" },
    { name: "view_production_houses", displayName: "View Production Houses", description: "View production house information", category: "Production Houses" },
    { name: "manage_production_house_members", displayName: "Manage Production House Members", description: "Add or remove members from production houses", category: "Production Houses" },
    { name: "assign_production_house_roles", displayName: "Assign Production House Roles", description: "Assign roles to production house members", category: "Production Houses" },
    
    // Company permissions
    { name: "manage_company", displayName: "Manage Company", description: "Edit company settings and subscription", category: "Company" },
    { name: "manage_roles", displayName: "Manage Roles", description: "Create and edit custom roles", category: "Company" },
    { name: "manage_recipient_groups", displayName: "Manage Recipient Groups", description: "Create and edit email recipient groups", category: "Company" },
    { name: "view_company_settings", displayName: "View Company Settings", description: "View company information and settings", category: "Company" },
    
    // Announcement permissions
    { name: "send_announcements", displayName: "Send Announcements", description: "Send announcements to cast and crew", category: "Communication" },
    { name: "view_announcements", displayName: "View Announcements", description: "View announcements", category: "Communication" },
    { name: "manage_announcements", displayName: "Manage Announcements", description: "Edit and delete announcements", category: "Communication" },
    
    // Messaging permissions
    { name: "send_messages", displayName: "Send Messages", description: "Send messages in production messaging", category: "Communication" },
    { name: "view_messages", displayName: "View Messages", description: "View and receive messages in production messaging", category: "Communication" },
    
    // Call Sheet permissions
    { name: "manage_call_sheets", displayName: "Manage Call Sheets", description: "Create, edit, and delete call sheets", category: "Call Sheets" },
    { name: "view_call_sheets", displayName: "View Call Sheets", description: "View and download call sheets", category: "Call Sheets" },
    { name: "generate_call_sheets", displayName: "Generate Call Sheets", description: "Generate automated call sheets", category: "Call Sheets" },
    { name: "distribute_call_sheets", displayName: "Distribute Call Sheets", description: "Send call sheets to cast and crew", category: "Call Sheets" },
    
    // Actor & Casting permissions
    { name: "manage_actors", displayName: "Manage Actors", description: "Add, edit, and remove actors", category: "Actors & Casting" },
    { name: "view_actors", displayName: "View Actors", description: "View actor information and profiles", category: "Actors & Casting" },
    { name: "manage_character_roles", displayName: "Manage Character Roles", description: "Create and edit character roles", category: "Actors & Casting" },
    { name: "assign_actors_to_characters", displayName: "Assign Actors to Characters", description: "Cast actors in character roles", category: "Actors & Casting" },
    
    // Crew Management permissions
    { name: "manage_crew", displayName: "Manage Crew", description: "Add, edit, and remove crew members", category: "Crew Management" },
    { name: "view_crew", displayName: "View Crew", description: "View crew member information", category: "Crew Management" },
    { name: "assign_crew_positions", displayName: "Assign Crew Positions", description: "Assign crew to departments and positions", category: "Crew Management" },
    { name: "manage_crew_availability", displayName: "Manage Crew Availability", description: "Track and manage crew availability", category: "Crew Management" },
    
    // Department & Position permissions
    { name: "manage_departments", displayName: "Manage Departments", description: "Create, edit, and delete departments", category: "Departments & Positions" },
    { name: "view_departments", displayName: "View Departments", description: "View department information", category: "Departments & Positions" },
    { name: "manage_positions", displayName: "Manage Positions", description: "Create, edit, and delete positions within departments", category: "Departments & Positions" },
    { name: "view_positions", displayName: "View Positions", description: "View position information", category: "Departments & Positions" },
    
    // Calendar & Scheduling permissions
    { name: "manage_calendar", displayName: "Manage Calendar", description: "Edit production calendar and scheduling", category: "Calendar & Scheduling" },
    { name: "view_calendar", displayName: "View Calendar", description: "View production calendar and schedule", category: "Calendar & Scheduling" },
    { name: "manage_shooting_days", displayName: "Manage Shooting Days", description: "Plan and organize shooting days", category: "Calendar & Scheduling" },
    { name: "check_conflicts", displayName: "Check Scheduling Conflicts", description: "View and resolve scheduling conflicts", category: "Calendar & Scheduling" },
  ];

  const createdPermissions: Record<string, number> = {};
  for (const perm of permissions) {
    const existing = await db.permission.findUnique({
      where: { name: perm.name },
    });
    
    if (!existing) {
      const created = await db.permission.create({ data: perm });
      createdPermissions[perm.name] = created.id;
      console.log(`Created permission: ${perm.name}`);
    } else {
      createdPermissions[perm.name] = existing.id;
    }
  }

  // Clean up deprecated system roles
  console.log("Cleaning up deprecated system roles...");
  const deprecatedRoleNames = ["1st AD", "2nd AD", "Director"];
  
  for (const roleName of deprecatedRoleNames) {
    const deprecatedRole = await db.role.findFirst({
      where: {
        name: roleName,
        isSystemRole: true,
        companyId: null,
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (deprecatedRole) {
      if (deprecatedRole._count.users > 0) {
        console.log(`Warning: Cannot delete deprecated role "${roleName}" - it has ${deprecatedRole._count.users} assigned user(s)`);
      } else {
        // Delete role permissions first (cascade should handle this, but being explicit)
        await db.rolePermission.deleteMany({
          where: { roleId: deprecatedRole.id },
        });
        
        // Delete the role
        await db.role.delete({
          where: { id: deprecatedRole.id },
        });
        
        console.log(`Deleted deprecated system role: ${roleName}`);
      }
    }
  }

  // Seed system roles if they don't exist
  console.log("Seeding system roles...");
  const systemRoles = [
    {
      name: "Developer",
      description: "Full system access with all permissions",
      permissions: Object.keys(createdPermissions), // All permissions
    },
    {
      name: "Admin",
      description: "Company administrator with full access to all features and settings",
      permissions: Object.keys(createdPermissions), // All permissions
    },
    {
      name: "Manager",
      description: "Production manager with access to manage shows, scenes, and teams",
      permissions: [
        "manage_scenes",
        "view_scenes",
        "manage_timers",
        "mark_scene_complete",
        "edit_scene_details",
        "manage_scene_scheduling",
        "manage_team",
        "view_team",
        "approve_team_members",
        "view_team_contact_info",
        "manage_reports",
        "view_reports",
        "export_reports",
        "manage_shows",
        "view_shows",
        "assign_users_to_shows",
        "view_production_houses",
        "manage_production_house_members",
        "view_company_settings",
        "send_announcements",
        "view_announcements",
        "manage_announcements",
        "send_messages",
        "view_messages",
        "manage_call_sheets",
        "view_call_sheets",
        "generate_call_sheets",
        "distribute_call_sheets",
        "manage_actors",
        "view_actors",
        "manage_character_roles",
        "assign_actors_to_characters",
        "manage_crew",
        "view_crew",
        "assign_crew_positions",
        "manage_crew_availability",
        "manage_departments",
        "view_departments",
        "manage_positions",
        "view_positions",
        "manage_calendar",
        "view_calendar",
        "manage_shooting_days",
        "check_conflicts",
        "edit_own_profile",
      ],
    },
    {
      name: "Viewer",
      description: "Read-only access to view productions, scenes, and reports",
      permissions: [
        "view_scenes",
        "view_team",
        "view_reports",
        "view_shows",
        "view_production_houses",
        "view_company_settings",
        "view_announcements",
        "view_messages",
        "view_call_sheets",
        "view_actors",
        "view_crew",
        "view_departments",
        "view_positions",
        "view_calendar",
        "edit_own_profile",
      ],
    },
    {
      name: "Actor",
      description: "Actor with limited view access and communication",
      permissions: [
        "view_scenes",
        "edit_own_profile",
        "view_shows",
        "view_production_houses",
        "view_announcements",
        "view_messages",
        "view_call_sheets",
        "view_calendar",
      ],
    },
    {
      name: "Crew",
      description: "Crew member with view and communication access",
      permissions: [
        "view_scenes",
        "edit_own_profile",
        "view_shows",
        "view_production_houses",
        "view_announcements",
        "view_messages",
        "send_messages",
        "view_team",
        "view_call_sheets",
        "view_actors",
        "view_crew",
        "view_calendar",
      ],
    },
  ];

  const createdRoles: Record<string, number> = {};
  for (const roleData of systemRoles) {
    const existing = await db.role.findFirst({
      where: {
        name: roleData.name,
        isSystemRole: true,
        companyId: null,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    let roleId: number;

    if (!existing) {
      const role = await db.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          isSystemRole: true,
          companyId: null,
        },
      });

      // Add permissions to role
      for (const permName of roleData.permissions) {
        await db.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: createdPermissions[permName]!,
          },
        });
      }

      roleId = role.id;
      console.log(`Created system role: ${roleData.name} with ${roleData.permissions.length} permissions`);
    } else {
      roleId = existing.id;
      
      // Sync permissions for existing role
      const currentPermissions = existing.rolePermissions.map((rp) => rp.permission.name);
      const expectedPermissions = roleData.permissions;
      
      // Find permissions to add (in expected but not in current)
      const permissionsToAdd = expectedPermissions.filter(
        (perm) => !currentPermissions.includes(perm)
      );
      
      // Find permissions to remove (in current but not in expected)
      const permissionsToRemove = currentPermissions.filter(
        (perm) => !expectedPermissions.includes(perm)
      );
      
      // Add missing permissions
      for (const permName of permissionsToAdd) {
        await db.rolePermission.create({
          data: {
            roleId: existing.id,
            permissionId: createdPermissions[permName]!,
          },
        });
      }
      
      // Remove extra permissions
      for (const permName of permissionsToRemove) {
        const rolePermission = existing.rolePermissions.find(
          (rp) => rp.permission.name === permName
        );
        if (rolePermission) {
          await db.rolePermission.delete({
            where: { id: rolePermission.id },
          });
        }
      }
      
      if (permissionsToAdd.length > 0 || permissionsToRemove.length > 0) {
        console.log(
          `Synced permissions for system role: ${roleData.name} (added: ${permissionsToAdd.length}, removed: ${permissionsToRemove.length})`
        );
      } else {
        console.log(`System role ${roleData.name} permissions are up to date`);
      }
    }

    createdRoles[roleData.name] = roleId;
  }

  // Create or reset Prince Madikazi developer account
  console.log("Setting up Prince Madikazi developer account...");
  const princeMadikaziEmail = "prince@madikazi.co.za";
  const developerPassword = "Developer2024!";
  const princeMadikaziPasswordHash = await hashPassword(developerPassword);
  
  let princeMadikaziUser = await db.user.findUnique({
    where: { email: princeMadikaziEmail },
  });

  if (!princeMadikaziUser) {
    // Check if company exists
    let princeMadikaziCompany = await db.company.findFirst({
      where: { email: princeMadikaziEmail },
    });

    if (!princeMadikaziCompany) {
      // Create company for Prince Madikazi
      console.log("Creating company for Prince Madikazi...");
      princeMadikaziCompany = await db.company.create({
        data: {
          name: "Prince Madikazi",
          email: princeMadikaziEmail,
          subscriptionTier: "Enterprise",
          isActive: true,
          approvedByDeveloper: true,
          subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
      });
      console.log("Company created for Prince Madikazi");
    } else {
      // Update existing company to ensure correct settings
      princeMadikaziCompany = await db.company.update({
        where: { id: princeMadikaziCompany.id },
        data: {
          subscriptionTier: "Enterprise",
          isActive: true,
          approvedByDeveloper: true,
          subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
      });
      console.log("Company updated for Prince Madikazi");
    }

    // Create developer user
    princeMadikaziUser = await db.user.create({
      data: {
        name: "Prince Madikazi",
        email: princeMadikaziEmail,
        passwordHash: princeMadikaziPasswordHash,
        roleId: createdRoles["Developer"]!,
        companyId: princeMadikaziCompany.id,
        isActive: true,
        approvedByAdmin: true,
      },
    });
    
    console.log("Prince Madikazi developer account created");
  } else {
    // Account exists - reset password and ensure Developer role is assigned
    await db.user.update({
      where: { id: princeMadikaziUser.id },
      data: {
        passwordHash: princeMadikaziPasswordHash,
        roleId: createdRoles["Developer"]!,
        isActive: true,
        approvedByAdmin: true,
      },
    });
    console.log("Prince Madikazi developer account has been updated with Developer role and password reset");
  }

  console.log("\n=== Prince Madikazi Developer Account ===");
  console.log("Email: prince@madikazi.co.za");
  console.log("Password: Developer2024!");
  console.log("Role: Developer (Full system access with all permissions)");
  console.log("Status: Account configured with Developer role and password reset");
  console.log("IMPORTANT: Please change this password after login for security");
  console.log("==========================================\n");

  // Clean up all users except Prince Madikazi and Lihle Madikazi
  console.log("\n=== Cleaning up users ===");
  const princeEmail = "prince@madikazi.co.za";
  const lihleEmail = "lihle@madikazi.co.za";
  
  // Get all users except Prince and Lihle
  const usersToDelete = await db.user.findMany({
    where: {
      email: {
        notIn: [princeEmail, lihleEmail],
      },
    },
  });

  if (usersToDelete.length > 0) {
    console.log(`Found ${usersToDelete.length} users to remove...`);
    
    // Delete related records first to avoid foreign key constraints
    for (const userToDelete of usersToDelete) {
      // Delete user's production house memberships
      await db.productionHouseMember.deleteMany({
        where: { userId: userToDelete.id },
      });
      
      // Delete user's show assignments
      await db.userShow.deleteMany({
        where: { userId: userToDelete.id },
      });
      
      // Delete user's actor character assignments
      await db.actorCharacter.deleteMany({
        where: { userId: userToDelete.id },
      });
      
      // Delete user's crew assignments
      await db.crewAssignment.deleteMany({
        where: { userId: userToDelete.id },
      });
      
      // Delete user's recipient group memberships
      await db.recipientGroupMember.deleteMany({
        where: { userId: userToDelete.id },
      });
      
      // Delete user's announcement recipients
      await db.announcementRecipient.deleteMany({
        where: { userId: userToDelete.id },
      });
      
      // Delete user's message read receipts
      await db.messageReadReceipt.deleteMany({
        where: { userId: userToDelete.id },
      });
      
      // Update production houses where this user is admin (set to null)
      await db.productionHouse.updateMany({
        where: { adminId: userToDelete.id },
        data: { adminId: null },
      });
      
      // Delete the user
      await db.user.delete({
        where: { id: userToDelete.id },
      });
      
      console.log(`Deleted user: ${userToDelete.name} (${userToDelete.email})`);
    }
    
    console.log(`Successfully removed ${usersToDelete.length} users`);
  } else {
    console.log("No users to remove");
  }

  // Set up or update Lihle Madikazi as Production Admin
  console.log("\nSetting up Lihle Madikazi as Production Admin...");
  const lihlePassword = "ProductionAdmin2024!";
  const lihlePasswordHash = await hashPassword(lihlePassword);
  
  let lihleMadikaziUser = await db.user.findUnique({
    where: { email: lihleEmail },
  });

  if (!lihleMadikaziUser) {
    // Use Prince's company for Lihle
    const princeMadikaziCompany = await db.company.findFirst({
      where: { email: princeEmail },
    });

    if (!princeMadikaziCompany) {
      console.error("Error: Prince Madikazi's company not found. Cannot create Lihle's account.");
    } else {
      // Create Lihle's account with Admin role
      lihleMadikaziUser = await db.user.create({
        data: {
          name: "Lihle Madikazi",
          email: lihleEmail,
          passwordHash: lihlePasswordHash,
          roleId: createdRoles["Admin"]!,
          companyId: princeMadikaziCompany.id,
          isActive: true,
          approvedByAdmin: true,
        },
      });
      
      console.log("Lihle Madikazi account created as Production Admin");
    }
  } else {
    // Account exists - update password and ensure Admin role is assigned
    await db.user.update({
      where: { id: lihleMadikaziUser.id },
      data: {
        passwordHash: lihlePasswordHash,
        roleId: createdRoles["Admin"]!,
        isActive: true,
        approvedByAdmin: true,
      },
    });
    console.log("Lihle Madikazi account updated with Admin role and password reset");
  }

  console.log("\n=== Lihle Madikazi Production Admin Account ===");
  console.log("Email: lihle@madikazi.co.za");
  console.log("Password: ProductionAdmin2024!");
  console.log("Role: Admin (Production Admin with full company management access)");
  console.log("Status: Account configured with Admin role and password reset");
  console.log("IMPORTANT: Please change this password after login for security");
  console.log("================================================\n");

  // Check if demo data already exists
  const existingDemoUser = await db.user.findUnique({
    where: { email: "demo@callsheet.app" },
  });

  const existingDemoCompany = await db.company.findFirst({
    where: { email: "demo@callsheet.app" },
  });

  // Ensure demo company exists (even if user exists)
  let company = existingDemoCompany;
  if (!company) {
    console.log("Creating demo company...");
    company = await db.company.create({
      data: {
        name: "Apex Productions",
        email: "demo@callsheet.app",
        subscriptionTier: "Pro",
        isActive: true,
        approvedByDeveloper: true,
        subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      },
    });
  } else {
    console.log("Demo company already exists");
    // Ensure the company is active
    if (!company.isActive) {
      company = await db.company.update({
        where: { id: company.id },
        data: { isActive: true },
      });
      console.log("Activated demo company");
    }
  }

  // Create or update demo user
  const passwordHash = await hashPassword("demo123");
  let user = existingDemoUser;
  
  if (!user) {
    console.log("Creating demo user...");
    user = await db.user.create({
      data: {
        name: "Alex Director",
        email: "demo@callsheet.app",
        passwordHash,
        phone: "+1 (555) 123-4567",
        roleId: createdRoles["Developer"]!,
        companyId: company.id,
        isActive: true,
        approvedByAdmin: true,
      },
    });
  } else {
    console.log("Demo user already exists, updating...");
    user = await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        roleId: createdRoles["Developer"]!,
        companyId: company.id,
        isActive: true,
        approvedByAdmin: true,
      },
    });
  }

  // Create or get a default production house for demo shows (MOVED BEFORE EARLY RETURN)
  console.log("Setting up production house for demo shows...");
  let demoProductionHouse = await db.productionHouse.findFirst({
    where: {
      companyId: company.id,
      name: "Apex Studios",
    },
  });

  if (!demoProductionHouse) {
    demoProductionHouse = await db.productionHouse.create({
      data: {
        companyId: company.id,
        adminId: user.id,
        name: "Apex Studios",
        description: "Main production studio for Apex Productions",
        contactEmail: "studio@apexproductions.com",
      },
    });
    console.log("Created demo production house: Apex Studios");
  } else {
    // Update existing production house to ensure it has an admin
    if (!demoProductionHouse.adminId) {
      demoProductionHouse = await db.productionHouse.update({
        where: { id: demoProductionHouse.id },
        data: { adminId: user.id },
      });
      console.log("Updated demo production house with admin assignment");
    } else {
      console.log("Demo production house already exists: Apex Studios");
    }
  }

  // If both demo company and user exist, skip the rest of seeding
  if (existingDemoCompany && existingDemoUser) {
    console.log("Demo data already exists, skipping remaining seed");
    return;
  }

  // Seed departments and positions for the demo company
  console.log("Seeding departments and positions...");
  const departmentsData = [
    {
      name: "Camera",
      description: "Camera and cinematography department",
      positions: [
        { name: "Director of Photography", description: "Head of camera department" },
        { name: "Camera Operator", description: "Operates the camera" },
        { name: "1st AC (Focus Puller)", description: "Manages focus during shots" },
        { name: "2nd AC (Clapper Loader)", description: "Handles slate and loading film/media" },
        { name: "DIT (Digital Imaging Technician)", description: "Manages digital workflow" },
      ],
    },
    {
      name: "Lighting",
      description: "Lighting and electrical department",
      positions: [
        { name: "Gaffer", description: "Chief lighting technician" },
        { name: "Best Boy Electric", description: "Assistant to gaffer" },
        { name: "Electrician", description: "Sets up and operates lighting equipment" },
        { name: "Board Operator", description: "Controls lighting board" },
      ],
    },
    {
      name: "Grip",
      description: "Grip and rigging department",
      positions: [
        { name: "Key Grip", description: "Head of grip department" },
        { name: "Best Boy Grip", description: "Assistant to key grip" },
        { name: "Dolly Grip", description: "Operates camera dolly" },
        { name: "Grip", description: "Handles rigging and support equipment" },
      ],
    },
    {
      name: "Sound",
      description: "Sound recording department",
      positions: [
        { name: "Sound Mixer", description: "Manages sound recording" },
        { name: "Boom Operator", description: "Operates boom microphone" },
        { name: "Sound Utility", description: "Assists with sound equipment" },
      ],
    },
    {
      name: "Art Department",
      description: "Production design and art department",
      positions: [
        { name: "Production Designer", description: "Overall visual design" },
        { name: "Art Director", description: "Executes production design" },
        { name: "Set Decorator", description: "Decorates sets" },
        { name: "Props Master", description: "Manages props" },
        { name: "Set Dresser", description: "Dresses sets with props" },
      ],
    },
    {
      name: "Costumes",
      description: "Costume and wardrobe department",
      positions: [
        { name: "Costume Designer", description: "Designs costumes" },
        { name: "Costume Supervisor", description: "Manages costume department" },
        { name: "Wardrobe Supervisor", description: "Manages wardrobe on set" },
        { name: "Costumer", description: "Assists with costumes" },
      ],
    },
    {
      name: "Hair & Makeup",
      description: "Hair and makeup department",
      positions: [
        { name: "Key Makeup Artist", description: "Head of makeup department" },
        { name: "Makeup Artist", description: "Applies makeup" },
        { name: "Key Hair Stylist", description: "Head of hair department" },
        { name: "Hair Stylist", description: "Styles hair" },
      ],
    },
    {
      name: "Production",
      description: "Production management",
      positions: [
        { name: "Production Manager", description: "Manages production logistics" },
        { name: "Production Coordinator", description: "Coordinates production activities" },
        { name: "Production Assistant", description: "Assists production team" },
        { name: "Script Supervisor", description: "Maintains script continuity" },
      ],
    },
    {
      name: "Locations",
      description: "Location management",
      positions: [
        { name: "Location Manager", description: "Manages filming locations" },
        { name: "Location Scout", description: "Scouts potential locations" },
        { name: "Location Assistant", description: "Assists with location logistics" },
      ],
    },
    {
      name: "Transportation",
      description: "Transportation department",
      positions: [
        { name: "Transportation Coordinator", description: "Manages transportation" },
        { name: "Driver", description: "Drives vehicles" },
        { name: "Picture Car Coordinator", description: "Manages picture vehicles" },
      ],
    },
  ];

  for (const deptData of departmentsData) {
    const existingDept = await db.department.findFirst({
      where: {
        companyId: company.id,
        name: deptData.name,
      },
    });

    if (!existingDept) {
      const dept = await db.department.create({
        data: {
          companyId: company.id,
          name: deptData.name,
          description: deptData.description,
        },
      });

      // Create positions for this department
      for (const posData of deptData.positions) {
        await db.position.create({
          data: {
            departmentId: dept.id,
            name: posData.name,
            description: posData.description,
          },
        });
      }

      console.log(`Created department: ${deptData.name} with ${deptData.positions.length} positions`);
    }
  }

  // Check if demo shows already exist
  const existingShows = await db.show.findMany({
    where: { companyId: company.id },
  });

  if (existingShows.length > 0) {
    console.log("Demo shows already exist, skipping show and scene creation");
    return;
  }

  // Create demo show
  console.log("Creating demo show...");
  const show = await db.show.create({
    data: {
      title: "The Last Frame",
      description:
        "A gripping thriller about a photographer who discovers a dark secret through their lens.",
      status: "Shooting",
      startDate: new Date("2024-01-15"),
      endDate: new Date("2024-03-30"),
      companyId: company.id,
      productionHouseId: demoProductionHouse.id,
      createdBy: user.id,
    },
  });

  // Create demo scenes
  console.log("Creating demo scenes...");
  const scenes = [
    {
      sceneNumber: "1A",
      title: "Opening - City Street",
      description:
        "Establishing shot of the bustling city streets at golden hour. Our protagonist walks through the crowd with camera in hand.",
      location: "Downtown Los Angeles",
      status: "Complete",
      scheduledTime: new Date("2024-01-20T09:00:00"),
      durationMinutes: 45,
    },
    {
      sceneNumber: "2B",
      title: "Photography Studio - Discovery",
      description:
        "Close-up shots of developing photographs. The protagonist notices something unusual in one of the images.",
      location: "Studio Lot - Building 3",
      status: "Complete",
      scheduledTime: new Date("2024-01-21T14:00:00"),
      durationMinutes: 62,
    },
    {
      sceneNumber: "3A",
      title: "Confrontation Scene",
      description:
        "Intense dialogue between protagonist and antagonist. Multiple camera angles required.",
      location: "Warehouse District",
      status: "In Progress",
      scheduledTime: new Date("2024-01-22T10:00:00"),
      timerStart: new Date(Date.now() - 15 * 60 * 1000), // Started 15 minutes ago
    },
    {
      sceneNumber: "4C",
      title: "Chase Sequence",
      description:
        "High-energy chase through narrow alleyways. Requires stunt coordination and multiple takes.",
      location: "Old Town District",
      status: "Unshot",
      scheduledTime: new Date("2024-01-23T08:00:00"),
    },
    {
      sceneNumber: "5A",
      title: "Rooftop Finale",
      description:
        "Climactic confrontation on a downtown rooftop at sunset. Weather-dependent shoot.",
      location: "Downtown Rooftop",
      status: "Unshot",
      scheduledTime: new Date("2024-01-24T17:30:00"),
    },
  ];

  for (const sceneData of scenes) {
    await db.scene.create({
      data: {
        ...sceneData,
        showId: show.id,
        companyId: company.id,
      },
    });
  }

  // Create a second show
  console.log("Creating second demo show...");
  await db.show.create({
    data: {
      title: "Midnight Cafe",
      description:
        "A heartwarming story about connections made in a 24-hour diner.",
      status: "Pre-Production",
      startDate: new Date("2024-04-01"),
      companyId: company.id,
      productionHouseId: demoProductionHouse.id,
      createdBy: user.id,
    },
  });

  console.log("Demo data setup completed successfully!");
  console.log("\n=== Demo Login Credentials ===");
  console.log("Email: demo@callsheet.app");
  console.log("Password: demo123");
  console.log("Role: Developer (Full system access)");
  console.log("==============================\n");
}

setup()
  .then(() => {
    console.log("setup.ts complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
