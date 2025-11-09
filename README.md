# 🎬 Call Sheet - Production Management Platform

A professional-grade production management platform for film and video teams to coordinate shoots, scenes, actors, and production progress in real-time.

## ✨ Features

### 🔐 Authentication & Authorization
- **Multi-workspace setup** - Each production company operates as a separate workspace
- **Role-based access control** with 7 distinct roles:
  - Developer (platform admin)
  - Admin (company admin)
  - 1st AD & 2nd AD (assistant directors)
  - Director
  - Crew
  - Actor
- **Secure JWT authentication** with 30-day token expiration
- **User approval workflow** - First user becomes admin, others require approval

### 🎞️ Show Management
- Create and manage multiple film/video productions
- Track show status (Pre-Production, Shooting, Wrapped)
- View scene counts and production timelines
- Beautiful card-based interface with status indicators

### 🎬 Scene Management with Live Timers
- **Real-time scene timer functionality** - Key differentiator feature
  - Start/stop timers (Admin & AD only)
  - Live elapsed time display with HH:MM:SS format
  - Auto-calculate duration on timer stop
  - Visual indicators for scene status (Gray = Unshot, Orange = In Progress, Green = Complete)
- Scene details including:
  - Scene number, title, description
  - Location and scheduled time
  - Assigned actors and crew
  - Notes and duration tracking
- **Director approval workflow** - Only Directors can mark scenes complete
- Role-based scene visibility (Actors only see their assigned scenes)

### 🎨 Design
- **Cinematic Dark Mode Theme** with professional aesthetics
- **Custom color palette**:
  - Gold accents for primary actions and branding
  - Blue for information and status
  - Emerald for success states
- Responsive layout for mobile, tablet, and desktop
- Smooth animations and transitions
- Glass-morphism effects and gradient backgrounds

### 📊 Dashboard
- Real-time production statistics
- Quick action buttons
- Recent shows overview
- Role-based dashboard views

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Docker and Docker Compose
- PostgreSQL (via Docker)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development environment:
   ```bash
   pnpm run dev
   ```

This will:
- Start PostgreSQL in Docker
- Run database migrations
- Seed demo data
- Start the development server

### Demo Credentials

The application comes with pre-seeded demo data:

```
Email: demo@callsheet.app
Password: demo123
```

The demo account includes:
- A production company (Apex Productions)
- Two shows (one in production, one in pre-production)
- Multiple scenes with various statuses
- One scene with an active timer to demonstrate the feature

## 🏗️ Technical Stack

### Frontend
- **React** with TypeScript
- **TanStack Router** for routing
- **TanStack Query** for data fetching
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Hook Form** with Zod validation
- **Zustand** with persistence for state management

### Backend
- **tRPC** for type-safe API
- **Prisma ORM** for database
- **PostgreSQL** database
- **JWT** for authentication
- **bcryptjs** for password hashing

## 📁 Project Structure

```
src/
├── components/          # Reusable React components
│   ├── AuthLayout.tsx   # Authentication page wrapper
│   └── DashboardLayout.tsx  # Main app layout with sidebar
├── routes/              # TanStack Router pages
│   ├── login/           # Login page
│   ├── register/        # Registration page
│   ├── dashboard/       # Main dashboard
│   ├── shows/           # Show management
│   ├── scenes/          # Scene management
│   └── ...
├── server/              # Backend code
│   ├── trpc/            # tRPC configuration and procedures
│   │   ├── procedures/  # Individual API endpoints
│   │   └── root.ts      # Router registration
│   ├── utils/           # Utility functions (auth, etc.)
│   └── scripts/         # Setup and seed scripts
├── stores/              # Zustand stores
│   └── authStore.ts     # Authentication state
└── styles.css           # Global styles and theme
```

## 🔑 Key Features Implemented (Backend)

The following features have **full backend implementation**:

1. ✅ **User Authentication**
   - Registration with company creation
   - Login with JWT tokens
   - Password hashing with bcryptjs
   - Token verification

2. ✅ **Show Management**
   - Create shows
   - List shows by company
   - Show details with scene counts

3. ✅ **Scene Timer System** (Core Feature)
   - Start scene timer (sets status to "In Progress")
   - Stop scene timer (calculates duration)
   - Mark scene complete (Director only)
   - Real-time timer display on frontend

4. ✅ **Scene Management**
   - Create scenes with details
   - List scenes by show
   - Role-based scene filtering

5. ✅ **Role-Based Permissions**
   - Permission checks in backend procedures
   - Different access levels for different roles

## 🎯 Features with Frontend-Only Implementation

The following features have **beautiful UI but will need backend implementation**:

- Calendar view with drag-and-drop scheduling
- Team management and user approval
- Automated reports and analytics
- Call sheet PDF generation
- Notifications and reminders
- Subscription tier enforcement

These are designed as placeholders showing "Feature in Development" to demonstrate the complete vision of the platform.

## 🔒 Environment Variables

The application requires the following environment variables to be configured in the `.env` file:

### Required Variables

```bash
# Environment
NODE_ENV=development  # or production

# Database
DATABASE_URL=postgresql://postgres:postgres@postgres/app

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_PASSWORD=admin123

# Email Configuration (Resend)
# Sign up at https://resend.com to get your API key
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@callsheet.app

# MinIO Configuration
MINIO_BUCKET=PSM Studios
```

### Setup Instructions

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the values as needed:
   - `JWT_SECRET`: Change to a secure random string for production
   - `ADMIN_PASSWORD`: Set a strong password for the initial admin user
   - `RESEND_API_KEY`: Get your API key from [Resend](https://resend.com) if you need email functionality
   - `FROM_EMAIL`: Update to your verified sender email

**Note:** The default values in `.env.example` are suitable for development. For production deployments, these should be changed to secure values.

## 🎭 Role Permissions

| Feature | Developer | Admin | 1st/2nd AD | Director | Crew | Actor |
|---------|-----------|-------|------------|----------|------|-------|
| Create Shows | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Scenes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Start/Stop Timers | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mark Complete | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| View All Scenes | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Assigned Scenes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## 🎨 Design Highlights

- **Cinematic color scheme** with gold, blue, and emerald accents
- **Glass-morphism** effects for depth and modern aesthetics
- **Smooth animations** for state transitions
- **Live timer display** with pulsing animation for active scenes
- **Status-based color coding** for instant visual feedback
- **Responsive grid layouts** that adapt to all screen sizes
- **Professional typography** with clear hierarchy

## 📝 Notes for Development

- The timer functionality is the **core differentiator** and is fully implemented
- All tRPC procedures follow type-safe patterns
- Authentication tokens are stored in localStorage via Zustand persist
- The app uses autoincrement integer primary keys for all models
- Database migrations are handled automatically via `prisma db push`

## 🚀 Future Enhancements

- WebSocket support for real-time updates across multiple users
- Call sheet PDF generation with MinIO storage
- Email notifications for scene reminders
- Calendar integration with external services
- Advanced reporting with charts and analytics
- Mobile app for on-set access

---

**Built with ❤️ for film production teams**
# call-sheet-2026
