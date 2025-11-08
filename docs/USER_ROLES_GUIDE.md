# User Roles Guide

This guide explains the role-based access control system in the Call Sheet production management application.

## Overview

The application uses a hierarchical role-based access control (RBAC) system to manage user permissions. Each user is assigned a role that determines what features and data they can access.

## System Roles

### 1. Developer
**Purpose:** Full system access for application developers and system administrators.

**Permissions:** All permissions (complete access to all features)

**Key Capabilities:**
- Full access to all company data and settings
- Can manage all users and roles
- Access to developer dashboard
- Can approve new companies
- Complete control over production houses, shows, scenes, and reports

**Typical Use Case:** System administrators and application developers who need unrestricted access for maintenance and support.

---

### 2. Admin
**Purpose:** Company administrators with full access to manage their organization.

**Permissions:** All permissions (complete access to all features)

**Key Capabilities:**
- Manage company settings (name, email, subscription)
- Create and manage custom roles
- Invite and manage all team members
- Full access to production houses, shows, scenes, and reports
- Send announcements and messages
- Generate call sheets and reports
- Manage departments and positions

**Typical Use Case:** Production company owners, executive producers, or operations managers who need complete control over their organization.

---

### 3. Manager
**Purpose:** Production managers who oversee day-to-day operations.

**Permissions:**
- ✅ Manage scenes (create, edit, delete)
- ✅ View scenes
- ✅ Manage scene timers (start/stop)
- ✅ Mark scenes complete
- ✅ Manage team (invite, edit, remove members)
- ✅ View team information
- ✅ Manage reports (generate and edit)
- ✅ View reports
- ✅ Manage shows (create, edit, delete)
- ✅ View shows
- ✅ View production houses
- ✅ Send announcements
- ✅ View announcements
- ✅ Send messages
- ✅ View messages
- ✅ Edit own profile

**Cannot Do:**
- ❌ Manage company settings
- ❌ Manage production houses (create, edit, delete)
- ❌ Create or edit custom roles
- ❌ Change subscription tiers

**Typical Use Case:** Line producers, production managers, 1st ADs, and unit production managers who handle daily production operations but don't need company-wide administrative access.

---

### 4. Viewer
**Purpose:** Read-only access for stakeholders who need to monitor production progress.

**Permissions:**
- ✅ View scenes
- ✅ View team information
- ✅ View reports
- ✅ View shows
- ✅ View production houses
- ✅ View announcements
- ✅ View messages
- ✅ Edit own profile

**Cannot Do:**
- ❌ Create, edit, or delete any production data
- ❌ Manage timers or mark scenes complete
- ❌ Invite or manage team members
- ❌ Send announcements or messages
- ❌ Generate reports or call sheets

**Typical Use Case:** Studio executives, investors, network representatives, or other stakeholders who need visibility into production progress without the ability to make changes.

---

### 5. Actor
**Purpose:** Cast members who need limited access to their scenes and schedules.

**Permissions:**
- ✅ View scenes (their assignments)
- ✅ View shows
- ✅ View production houses
- ✅ View announcements
- ✅ View messages
- ✅ Edit own profile

**Cannot Do:**
- ❌ Manage any production data
- ❌ View team members (except as listed in scenes)
- ❌ Access reports
- ❌ Send announcements
- ❌ Manage scenes or timers

**Typical Use Case:** Actors and performers who need to see their call times, scene assignments, and receive production updates.

---

### 6. Crew
**Purpose:** Crew members who need to view production information and communicate with the team.

**Permissions:**
- ✅ View scenes
- ✅ View team information
- ✅ View shows
- ✅ View production houses
- ✅ View announcements
- ✅ View messages
- ✅ Send messages
- ✅ Edit own profile

**Cannot Do:**
- ❌ Manage any production data
- ❌ Manage timers or mark scenes complete
- ❌ Invite or manage team members
- ❌ Send announcements
- ❌ Generate reports or call sheets

**Typical Use Case:** Department heads, camera operators, grips, electricians, and other crew members who need to coordinate with the team and stay informed about production schedules.

---

## Role Hierarchy

```
Developer (System Admin)
    ↓
Admin (Company Owner)
    ↓
Manager (Production Manager)
    ↓
Viewer (Stakeholder)
    ↓
Crew (Department Heads/Crew)
    ↓
Actor (Cast)
```

## Custom Roles

In addition to system roles, Admins and Developers can create **custom roles** with specific permission combinations.

### Creating Custom Roles

1. Navigate to **Settings → Custom Roles**
2. Click **Create Role**
3. Enter a name and description
4. Select the specific permissions needed
5. Click **Save**

### Custom Role Use Cases

- **Assistant Director:** Manager permissions minus team management
- **Script Supervisor:** View all + mark scenes complete
- **Location Manager:** View all + manage specific location data
- **Post-Production Supervisor:** View reports + specific scene data

---

## Managing User Roles

### Inviting New Users

1. Navigate to **Team Management**
2. Click **Invite Member**
3. Enter user details
4. Select the appropriate role
5. Choose whether to approve immediately
6. Click **Invite**

### Changing User Roles

1. Navigate to **Team Management**
2. Find the user you want to update
3. Click the **Edit Role** button
4. Select the new role
5. Click **Update Role**

**Note:** Users cannot change their own role. This must be done by another admin.

### Bulk Inviting Users

1. Navigate to **Team Management**
2. Click **Bulk Invite**
3. Add multiple users with their roles
4. Click **Invite [N] Members**

---

## Permission Categories

Permissions are organized into the following categories:

### Scenes
- `manage_scenes` - Create, edit, and delete scenes
- `view_scenes` - View scene information
- `manage_timers` - Start and stop scene timers
- `mark_scene_complete` - Mark scenes as complete

### Team
- `manage_team` - Invite, edit, and remove team members
- `view_team` - View team member information
- `edit_own_profile` - Edit your own profile information

### Reports
- `manage_reports` - Generate and manage production reports
- `view_reports` - View production reports

### Shows
- `manage_shows` - Create, edit, and delete shows
- `view_shows` - View show information

### Production Houses
- `manage_production_houses` - Create, edit, and delete production houses
- `view_production_houses` - View production house information

### Company
- `manage_company` - Edit company settings
- `manage_roles` - Create and edit custom roles
- `manage_recipient_groups` - Create and edit email recipient groups

### Communication
- `send_announcements` - Send announcements to cast and crew
- `view_announcements` - View announcements
- `send_messages` - Send messages in production messaging
- `view_messages` - View and receive messages

---

## Best Practices

### Role Assignment Guidelines

1. **Start with the least privilege:** Assign the minimum role needed for each user's responsibilities
2. **Use custom roles for specific needs:** Create custom roles for unique workflows
3. **Regular audits:** Periodically review user roles and permissions
4. **Immediate removal:** Deactivate users immediately when they leave the production
5. **Manager for production staff:** Most production team members should be Managers
6. **Viewer for stakeholders:** Use Viewer role for anyone who just needs visibility
7. **Admin sparingly:** Limit Admin role to key decision-makers

### Security Considerations

- **Protect Admin accounts:** Use strong passwords for Admin users
- **Monitor access:** Review who has access to sensitive production data
- **Temporary access:** Use the "approve immediately" option carefully
- **Deactivate, don't delete:** Deactivate users instead of deleting to maintain audit trails
- **Custom roles for contractors:** Create specific custom roles for temporary contractors

---

## Frequently Asked Questions

### Can a user have multiple roles?
No, each user has exactly one role. If a user needs a unique combination of permissions, create a custom role.

### Can I edit system roles?
No, system roles (Developer, Admin, Manager, Viewer, Actor, Crew) cannot be modified. However, you can create custom roles with any permission combination.

### What happens if I remove a user?
The user is removed from the system and loses all access. Their historical data (scenes they worked on, messages sent, etc.) is preserved for record-keeping.

### Can Managers invite other Managers?
Yes, users with the `manage_team` permission (including Managers) can invite users and assign any available role, including Manager.

### How do I restrict access to specific shows?
Currently, roles apply company-wide. For show-specific access control, consider creating custom roles or using production houses to segment access.

### Can Viewers see financial information?
No, Viewers can see production progress, scenes, and reports, but not company settings or financial information like subscription tiers.

---

## Migration from Old Roles

If you're upgrading from an older version with deprecated roles (1st AD, 2nd AD, Director), these roles have been replaced:

- **1st AD / 2nd AD → Manager:** Full production management capabilities
- **Director → Manager or Custom Role:** Depending on needs, assign Manager or create a custom role

Existing users with deprecated roles will continue to function, but new users cannot be assigned these roles. Contact your administrator to update to the new role structure.

---

## Support

For questions about role-based access control or permission issues, contact your system administrator or refer to the main application documentation.
