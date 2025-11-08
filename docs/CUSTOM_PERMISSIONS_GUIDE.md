# Custom Permissions & Role Management Guide

## Overview

The application now features an advanced Role-Based Access Control (RBAC) system that allows you to create highly customized permission sets for different team members based on their specific responsibilities in your production.

## Key Features

### 1. Granular Permissions

Permissions are now organized into detailed categories:

- **Scenes**: Manage scenes, timers, completion status, scene details, and scheduling
- **Team**: Manage team members, approvals, contact information
- **Reports**: Generate, view, export reports, and configure automation
- **Shows**: Create, edit, approve shows, and assign users
- **Production Houses**: Manage production houses and their members
- **Company**: Manage company settings, roles, and recipient groups
- **Communication**: Send and manage announcements and messages
- **Call Sheets**: Create, generate, view, and distribute call sheets
- **Actors & Casting**: Manage actors, character roles, and casting
- **Crew Management**: Manage crew members, positions, and availability
- **Departments & Positions**: Create and manage departments and crew positions
- **Calendar & Scheduling**: Manage production calendar, shooting days, and conflicts

### 2. Role Templates

Pre-configured role templates for common production positions:

#### Creative Roles
- **Director**: Full creative control over scenes, actors, and artistic decisions
- **Director of Photography**: Camera and lighting department head
- **Production Designer**: Art department oversight
- **Script Supervisor**: Continuity and scene tracking
- **Casting Director**: Actor management and casting

#### Production Roles
- **1st Assistant Director**: Day-to-day operations, scheduling, and logistics
- **2nd Assistant Director**: Call sheets, cast/crew coordination
- **Line Producer**: Budget, schedule, and production management
- **Production Coordinator**: Administrative tasks and communications
- **Production Assistant**: Entry-level support with basic access

#### Technical Roles
- **Department Head**: Specific department leadership (Camera, Sound, Art, etc.)

#### Administrative Roles
- **Studio Executive**: Oversight with view access to reports and high-level information

### 3. Role Cloning

Quickly create variations of existing roles:
- Clone any system role or custom role
- Automatically generates a unique name
- Preserves all permissions from the source role
- Customize after cloning as needed

## How to Use

### Creating a Custom Role

#### Option 1: Start from Scratch
1. Navigate to **Settings** → **Custom Roles**
2. Click **Create Role**
3. Enter a role name and description
4. Select permissions by category
5. Click **Create Role**

#### Option 2: Use a Template
1. Navigate to **Settings** → **Custom Roles**
2. Click **Use Template**
3. Browse templates by category
4. Select a template that matches your needs
5. Customize the name, description, and permissions
6. Click **Create Role**

#### Option 3: Clone an Existing Role
1. Navigate to **Settings** → **Custom Roles**
2. Find the role you want to copy
3. Click **Clone** next to the role
4. A new role is created with the same permissions
5. Edit the cloned role to customize it

### Assigning Roles to Users

1. Navigate to **Settings** → **User Roles**
2. Find the user you want to assign
3. Select their role from the dropdown
4. Changes are saved automatically

**Bulk Assignment:**
1. Check the boxes next to multiple users
2. Select a role from the bulk actions dropdown
3. Click **Apply to Selected**

### Managing Permissions

#### Understanding Permission Categories

**Manage vs. View Permissions:**
- **Manage** permissions include create, edit, and delete capabilities
- **View** permissions provide read-only access
- Most features have both manage and view permissions

**Permission Dependencies:**
Some permissions work best together:
- If you grant `manage_scenes`, users typically also need `view_scenes`
- If you grant `generate_call_sheets`, users need `view_call_sheets` to see them
- If you grant `manage_actors`, users need `view_actors` to see the actor list

#### Recommended Permission Sets

**For Production Coordinators:**
- View scenes, team, reports, shows
- Manage announcements and communications
- View and distribute call sheets
- View actors and crew

**For Department Heads:**
- View scenes and scene details
- View and manage crew within their department
- Send messages and view announcements
- View call sheets and calendar

**For Actors:**
- View scenes they're involved in
- View call sheets and calendar
- View announcements and messages
- Edit own profile

**For Crew Members:**
- View scenes, actors, and crew
- View call sheets and calendar
- Send and view messages
- View announcements

## Best Practices

### 1. Start with Templates
Use role templates as starting points rather than building from scratch. Templates are designed by production professionals and include commonly needed permissions.

### 2. Use Descriptive Names
Name roles based on the actual job title or responsibility:
- ✅ "1st AD - Drama Series"
- ✅ "Camera Department Head"
- ❌ "Role 1"
- ❌ "Custom Role"

### 3. Add Detailed Descriptions
Include what the role is responsible for:
```
"Manages day-to-day production operations, creates call sheets, 
coordinates cast and crew, and maintains shooting schedule"
```

### 4. Review Permissions Regularly
As your production evolves, review and update roles:
- Remove permissions that are no longer needed
- Add permissions for new responsibilities
- Clone and modify roles rather than changing roles with many assigned users

### 5. Use Role Hierarchy
Create a clear hierarchy of roles:
- **Admin/Developer**: Full access
- **Line Producer/Production Manager**: Broad management access
- **Department Heads**: Department-specific management
- **Crew/Cast**: View and communication access

### 6. Test Roles Before Assignment
1. Create the role
2. Temporarily assign it to a test user (or yourself)
3. Verify the user can access what they need
4. Adjust permissions as needed
5. Assign to production users

## Common Scenarios

### Scenario 1: New Show with Small Team
**Solution:** Use system roles
- Assign "Admin" to producers
- Assign "Manager" to ADs and coordinators
- Assign "Crew" to crew members
- Assign "Actor" to cast

### Scenario 2: Large Production with Multiple Departments
**Solution:** Create department-specific roles
1. Clone "Manager" role
2. Customize for each department:
   - "Camera Department Manager"
   - "Art Department Manager"
   - "Sound Department Manager"
3. Adjust permissions to focus on their department

### Scenario 3: Freelance Coordinators
**Solution:** Create limited coordinator role
1. Start with "Production Coordinator" template
2. Remove management permissions
3. Keep view and communication permissions
4. Add specific permissions they need

### Scenario 4: Studio Executives
**Solution:** Create executive oversight role
1. Start with "Studio Executive" template
2. Add `approve_shows` permission
3. Add `view_reports` and `export_reports`
4. Remove all management permissions

## Troubleshooting

### Users Can't Access a Feature
1. Check their assigned role in **Settings** → **User Roles**
2. View the role's permissions in **Settings** → **Custom Roles**
3. Verify the required permission is enabled
4. If needed, add the permission or assign a different role

### Role Can't Be Deleted
Roles with assigned users cannot be deleted:
1. Go to **Settings** → **User Roles**
2. Reassign all users from that role to another role
3. Return to **Settings** → **Custom Roles**
4. Delete the now-empty role

### Too Many Custom Roles
Consolidate similar roles:
1. Review all custom roles
2. Identify roles with similar permissions
3. Clone the most comprehensive one
4. Reassign users from similar roles
5. Delete unused roles

## Security Considerations

### Principle of Least Privilege
Only grant permissions that users actively need:
- Don't grant `manage_company` unless they need to change company settings
- Don't grant `manage_roles` unless they need to create/edit roles
- Don't grant `approve_team_members` unless they should approve registrations

### Sensitive Permissions
Be cautious with these permissions:
- `manage_company`: Can change subscription and company settings
- `manage_roles`: Can create roles and grant themselves more permissions
- `approve_shows`: Can approve or reject show requests
- `manage_team`: Can invite and remove team members

### Regular Audits
Periodically review:
1. Who has admin/management roles
2. Custom roles and their permissions
3. Users with access to sensitive features
4. Inactive users who still have access

## API for Developers

### Checking Permissions in Code

**Frontend (React):**
```typescript
import { usePermissions } from "~/hooks/usePermissions";

function MyComponent() {
  const permissions = usePermissions();
  
  if (permissions.canManageScenes()) {
    // Show scene management UI
  }
  
  if (permissions.canGenerateCallSheets()) {
    // Show call sheet generation button
  }
}
```

**Backend (tRPC):**
```typescript
import { checkPermission } from "~/server/utils/auth";

// In your procedure
const { user, payload } = await authenticateUser(input.token);
checkPermission(payload.permissions, "manage_scenes");
```

## Support

For assistance with role management:
1. Review this guide
2. Check the RBAC documentation
3. Test with role templates first
4. Contact your system administrator

## Changelog

### Version 2.0 (Current)
- Added 60+ granular permissions across 11 categories
- Added 12 role templates for common production positions
- Added role cloning functionality
- Enhanced permission descriptions
- Improved role management UI

### Version 1.0
- Basic role system with 6 system roles
- Core permissions for scenes, team, reports, shows
