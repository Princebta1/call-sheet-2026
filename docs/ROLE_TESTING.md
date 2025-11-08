# Role-Based Access Control Testing

This document describes the automated testing system for verifying that Manager and Viewer roles work correctly with their appropriate access levels.

## Overview

The role testing system creates test users with Manager and Viewer roles and verifies that they have the correct permissions to access different features of the application. The tests cover both backend permission checks and ensure that the role-based access control (RBAC) system is functioning as designed.

## Test Coverage

The test suite verifies access control for the following areas:

### 1. Show Management
- **Manager**: Can create, update, and view shows
- **Viewer**: Can only view shows (cannot create or update)

### 2. Scene Management
- **Manager**: Can create, update, view, manage timers, and mark scenes complete
- **Viewer**: Can only view scenes (cannot create, update, manage timers, or mark complete)

### 3. Report Management
- **Manager**: Can generate and view reports
- **Viewer**: Can only view reports (cannot generate)

### 4. Announcements
- **Manager**: Can send and view announcements
- **Viewer**: Can only view announcements (cannot send)

### 5. Messaging
- **Manager**: Can send and view messages
- **Viewer**: Can only view messages (cannot send)

### 6. Team Management
- **Manager**: Can manage team (invite, edit roles, remove members) and view team
- **Viewer**: Can only view team (cannot manage)

### 7. Production Houses
- **Manager**: Can only view production houses (cannot manage)
- **Viewer**: Can only view production houses (cannot manage)
- **Note**: Only Admin and Developer roles can manage production houses

### 8. Profile Management
- **Manager**: Can edit their own profile
- **Viewer**: Can edit their own profile
- **Note**: Both roles have this permission

### 9. Company & Role Management
- **Manager**: Cannot manage company settings, roles, or recipient groups
- **Viewer**: Cannot manage company settings, roles, or recipient groups
- **Note**: Only Admin and Developer roles have these permissions

## Permission Breakdown

### Manager Role Permissions

The Manager role has the following permissions:

| Permission | Description |
|------------|-------------|
| `manage_scenes` | Create, edit, and delete scenes |
| `view_scenes` | View scene information |
| `manage_timers` | Start and stop scene timers |
| `mark_scene_complete` | Mark scenes as complete |
| `manage_team` | Invite, edit, and remove team members |
| `view_team` | View team member information |
| `manage_reports` | Generate and manage production reports |
| `view_reports` | View production reports |
| `manage_shows` | Create, edit, and delete shows |
| `view_shows` | View show information |
| `view_production_houses` | View production house information |
| `send_announcements` | Send announcements to cast and crew |
| `view_announcements` | View announcements |
| `send_messages` | Send messages in production messaging |
| `view_messages` | View and receive messages |
| `edit_own_profile` | Edit your own profile information |

**Total: 16 permissions**

### Viewer Role Permissions

The Viewer role has the following permissions:

| Permission | Description |
|------------|-------------|
| `view_scenes` | View scene information |
| `view_team` | View team member information |
| `view_reports` | View production reports |
| `view_shows` | View show information |
| `view_production_houses` | View production house information |
| `view_announcements` | View announcements |
| `view_messages` | View and receive messages |
| `edit_own_profile` | Edit your own profile information |

**Total: 8 permissions**

### Key Differences

| Feature | Manager | Viewer |
|---------|---------|--------|
| Create/Edit Shows | ✅ Yes | ❌ No |
| Create/Edit Scenes | ✅ Yes | ❌ No |
| Manage Scene Timers | ✅ Yes | ❌ No |
| Mark Scenes Complete | ✅ Yes | ❌ No |
| Generate Reports | ✅ Yes | ❌ No |
| Send Announcements | ✅ Yes | ❌ No |
| Send Messages | ✅ Yes | ❌ No |
| Manage Team | ✅ Yes | ❌ No |
| View All Content | ✅ Yes | ✅ Yes |
| Edit Own Profile | ✅ Yes | ✅ Yes |

## Running the Tests

### Prerequisites

1. Ensure the application is set up and the database is running
2. Run the setup script to seed roles and permissions:
   ```bash
   npm run dev
   ```
   (This will automatically run `src/server/scripts/setup.ts`)

### Execute the Test Suite

Run the role testing script using:

```bash
tsx scripts/test-roles.ts
```

Or if using the npm scripts:

```bash
npm run test:roles
```

### Expected Output

The test script will:

1. Create a test company called "Role Test Company"
2. Create two test users:
   - Manager: `manager@callsheet.test`
   - Viewer: `viewer@callsheet.test`
3. Run 44 individual permission tests
4. Display results with color-coded output:
   - ✅ Green checkmarks for passed tests
   - ❌ Red X marks for failed tests
5. Show a summary with:
   - Total tests run
   - Number passed/failed
   - Success rate percentage
6. Display test user credentials for manual testing

### Sample Output

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║          MANAGER AND VIEWER ROLE TESTS                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

============================================================
Setting up test company and production house
============================================================
✓ Created test company
✓ Created test production house

============================================================
Creating test users
============================================================
ℹ Manager role has 16 permissions
ℹ Viewer role has 8 permissions
✓ Created Manager user: manager@callsheet.test
✓ Created Viewer user: viewer@callsheet.test

============================================================
Testing Show Management
============================================================
✓ Manager Create Show: Manager successfully created a show
✓ Viewer Create Show (should fail): Viewer correctly denied permission to create show
✓ Manager View Shows: Manager can view 1 show(s)
✓ Viewer View Shows: Viewer can view 1 show(s)
✓ Manager Update Show: Manager successfully updated show
✓ Viewer Update Show (should fail): Viewer correctly denied permission to update show

... (more tests)

============================================================
Test Summary
============================================================

Total Tests: 44
Passed: 44
Failed: 0
Success Rate: 100.0%

============================================================
Test User Credentials
============================================================

Manager Account:
  Email: manager@callsheet.test
  Password: TestPassword123!
  Role: Manager

Viewer Account:
  Email: viewer@callsheet.test
  Password: TestPassword123!
  Role: Viewer

Company:
  Name: Role Test Company
  Email: test-roles@callsheet.test

Note: Test users and data have been created and can be used for manual testing.
To clean up, you can run this script again or manually delete the test company.
```

## Manual Testing with Test Accounts

After running the automated tests, you can use the created test accounts for manual testing in the application UI.

### Test Account Credentials

**Manager Account:**
- Email: `manager@callsheet.test`
- Password: `TestPassword123!`
- Company: Role Test Company

**Viewer Account:**
- Email: `viewer@callsheet.test`
- Password: `TestPassword123!`
- Company: Role Test Company

### Manual Testing Checklist

#### As Manager

1. **Dashboard**
   - [ ] Can access dashboard
   - [ ] Can see all navigation links

2. **Shows**
   - [ ] Can view all shows
   - [ ] Can create new show
   - [ ] Can edit existing show
   - [ ] Can see "New Show" button

3. **Scenes**
   - [ ] Can view all scenes
   - [ ] Can create new scene
   - [ ] Can edit scene details
   - [ ] Can start/stop scene timer
   - [ ] Can mark scene as complete
   - [ ] Can see all action buttons

4. **Calendar**
   - [ ] Can view calendar
   - [ ] Can drag and drop to reschedule scenes
   - [ ] Can create scenes from calendar

5. **Reports**
   - [ ] Can view reports
   - [ ] Can generate new report
   - [ ] Can see "Generate Report" button

6. **Announcements**
   - [ ] Can view announcements
   - [ ] Can send new announcement
   - [ ] Can see "Send Announcement" button

7. **Messages**
   - [ ] Can view messages
   - [ ] Can send messages
   - [ ] Message input is enabled

8. **Team**
   - [ ] Can view team members
   - [ ] Can invite new members
   - [ ] Can edit member roles
   - [ ] Can see management buttons

9. **Production Houses**
   - [ ] Can view production houses
   - [ ] Cannot create/edit/delete production houses (no buttons)

10. **Settings**
    - [ ] Can view company settings (read-only)
    - [ ] Can edit own profile
    - [ ] Cannot access custom roles tab
    - [ ] Cannot access recipient groups tab

#### As Viewer

1. **Dashboard**
   - [ ] Can access dashboard
   - [ ] Can see limited navigation links

2. **Shows**
   - [ ] Can view all shows
   - [ ] Cannot create new show (no button)
   - [ ] Cannot edit shows (no edit button)

3. **Scenes**
   - [ ] Can view all scenes
   - [ ] Cannot create scene (no button)
   - [ ] Cannot edit scenes (no edit button)
   - [ ] Cannot start/stop timers (no buttons)
   - [ ] Cannot mark complete (no button)

4. **Calendar**
   - [ ] Can view calendar
   - [ ] Cannot drag and drop scenes
   - [ ] Cannot create scenes

5. **Reports**
   - [ ] Can view reports
   - [ ] Cannot generate reports (no button)

6. **Announcements**
   - [ ] Can view announcements
   - [ ] Cannot send announcements (no button)

7. **Messages**
   - [ ] Can view messages
   - [ ] Cannot send messages (input disabled or hidden)

8. **Team**
   - [ ] Can view team members
   - [ ] Cannot invite members (no button)
   - [ ] Cannot edit members (no buttons)

9. **Production Houses**
   - [ ] Can view production houses
   - [ ] Cannot create/edit/delete (no buttons)

10. **Settings**
    - [ ] Can view company settings (read-only)
    - [ ] Can edit own profile
    - [ ] Cannot access custom roles tab
    - [ ] Cannot access recipient groups tab

## Cleaning Up Test Data

### Automatic Cleanup

To automatically clean up test data, uncomment the cleanup section at the end of `scripts/test-roles.ts`:

```typescript
async function cleanup() {
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
}
```

Then run the script again to clean up.

### Manual Cleanup

You can also manually delete the test company using Prisma Studio:

```bash
npm run db:studio
```

1. Navigate to the `Company` model
2. Find "Role Test Company" (email: `test-roles@callsheet.test`)
3. Delete the company (this will cascade delete all related data)

### Re-running Tests

The test script is designed to be idempotent. Running it multiple times will:
1. Detect existing test company
2. Clean up old test data
3. Create fresh test users and data
4. Run all tests again

## Troubleshooting

### Test Failures

If tests fail, check:

1. **Database Connection**: Ensure PostgreSQL is running
2. **Permissions Setup**: Verify that `src/server/scripts/setup.ts` has been run
3. **Role Definitions**: Check that Manager and Viewer roles exist in the database
4. **Permission Assignments**: Verify that roles have the correct permissions

### Common Issues

**Issue**: "Manager or Viewer role not found in database"
- **Solution**: Run the application setup: `npm run dev` (this runs setup.ts)

**Issue**: Permission tests failing unexpectedly
- **Solution**: Check `src/server/scripts/setup.ts` to verify permission assignments match the test expectations

**Issue**: Cannot authenticate test users
- **Solution**: Verify JWT_SECRET is set in environment variables

**Issue**: Database constraint errors
- **Solution**: Clean up existing test data before running tests

### Debugging

To see detailed error information:

1. Check the console output for error details
2. Failed tests will show the error message
3. Use Prisma Studio to inspect database state:
   ```bash
   npm run db:studio
   ```

## Integration with CI/CD

To run these tests in a CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Role Tests
  run: tsx scripts/test-roles.ts
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

The script exits with:
- Exit code `0` if all tests pass
- Exit code `1` if any test fails

This allows CI/CD systems to fail the build if role permissions are not working correctly.

## Related Documentation

- [Role-Based Access Control](./ROLE_BASED_ACCESS_CONTROL.md) - Overview of the RBAC system
- [User Roles Guide](./USER_ROLES_GUIDE.md) - Guide for all user roles in the system
- [Setup Guide](./SETUP.md) - Application setup instructions

## Maintenance

When adding new features or permissions:

1. Update `src/server/scripts/setup.ts` with new permissions
2. Assign permissions to appropriate roles
3. Add tests to `scripts/test-roles.ts` for the new permissions
4. Update this documentation with the new permission details
5. Run the test suite to verify everything works

## Summary

This testing system ensures that:
- Manager users have appropriate management permissions
- Viewer users have read-only access
- Permission boundaries are enforced correctly
- Both frontend and backend access controls work as designed

The automated tests provide confidence that role-based access control is functioning correctly and help catch permission-related bugs early in development.
