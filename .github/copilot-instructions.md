# GitHub Copilot Instructions for Call Sheet 2026

## Project Overview

Call Sheet is a professional-grade production management platform for film and video teams to coordinate shoots, scenes, actors, and production progress in real-time. The application features a **real-time scene timer** as its core differentiator, enabling production teams to track scene shooting duration live.

## Technology Stack

### Frontend
- **React 19** with TypeScript
- **TanStack Router** for routing (with file-based routing)
- **TanStack Query** for data fetching and caching
- **Tailwind CSS** for styling with a cinematic dark mode theme
- **Lucide React** for icons
- **React Hook Form** with Zod validation for forms
- **Zustand** with persistence for state management

### Backend
- **tRPC** for type-safe API communication
- **Prisma ORM** for database operations
- **PostgreSQL** database (Docker-based in development)
- **JWT** authentication with 30-day token expiration
- **bcryptjs** for password hashing

### Build Tools
- **Vinxi** as the meta-framework (similar to Next.js)
- **Vite** as the underlying bundler
- **ESLint** for linting with strict configuration
- **Prettier** for code formatting
- **TypeScript** for type safety

## Development Commands

### Setup and Installation
```bash
pnpm install              # Install dependencies (also runs postinstall: prisma generate && tsr generate)
```

### Development
```bash
pnpm run dev             # Start development server (http://localhost:3000)
```

### Building
```bash
pnpm run build           # Build for production
pnpm run start           # Start production server
```

### Code Quality
```bash
pnpm run typecheck       # Run TypeScript type checking (tsc --noEmit)
pnpm run lint            # Run ESLint with --max-warnings 0
pnpm run format          # Format code with Prettier
```

### Database
```bash
pnpm run db:generate     # Generate and apply Prisma migrations
pnpm run db:migrate      # Deploy migrations (production)
pnpm run db:push         # Push schema changes without migrations (development)
pnpm run db:studio       # Open Prisma Studio for database GUI
```

## Project Structure

```
/home/runner/work/call-sheet-2026/call-sheet-2026/
├── .github/             # GitHub configuration and Copilot instructions
├── src/
│   ├── routes/          # TanStack Router file-based routes
│   │   ├── login/       # Authentication pages
│   │   ├── register/
│   │   ├── dashboard/   # Main dashboard
│   │   ├── shows/       # Show management
│   │   └── scenes/      # Scene management with timer feature
│   ├── components/      # Reusable React components
│   │   ├── AuthLayout.tsx
│   │   └── DashboardLayout.tsx
│   ├── server/          # Backend code
│   │   ├── trpc/        # tRPC configuration and routers
│   │   │   ├── procedures/  # Individual API endpoints
│   │   │   └── root.ts      # Router registration
│   │   ├── utils/       # Utility functions (auth, permissions)
│   │   └── scripts/     # Setup and seed scripts
│   ├── stores/          # Zustand state management
│   │   └── authStore.ts # Authentication state with persistence
│   └── styles.css       # Global styles and theme variables
├── prisma/
│   └── schema.prisma    # Database schema (autoincrement integer PKs)
├── public/              # Static assets
├── docker/              # Docker configuration for PostgreSQL
└── scripts/             # Build and deployment scripts
```

## Code Style and Best Practices

### TypeScript
- **Always use TypeScript** with strict typing
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use proper null safety with optional chaining (`?.`) and nullish coalescing (`??`)
- Avoid `any` type; use `unknown` if needed and narrow with type guards

### React Components
- Use **functional components** with hooks
- Prefer **named exports** for components
- Keep components focused and single-responsibility
- Use TypeScript for prop types (no PropTypes)
- Follow existing component patterns in `/src/components/`

### Styling
- Use **Tailwind CSS** utility classes exclusively
- Follow the cinematic dark mode theme with gold, blue, and emerald accents
- Use existing color variables from `styles.css`
- Maintain responsive design patterns (mobile-first approach)
- Use glass-morphism effects for depth (see existing components for patterns)

### State Management
- Use **TanStack Query** for server state (data fetching, caching, mutations)
- Use **Zustand** for client state (auth, UI state)
- Keep state as close to where it's used as possible
- Use Zustand persist middleware for data that should survive page reloads

### tRPC Procedures
- All backend logic goes in `/src/server/trpc/procedures/`
- Use `protectedProcedure` for authenticated endpoints
- Validate input with Zod schemas
- Follow existing permission check patterns for role-based access
- Return type-safe responses that match frontend expectations

### Database (Prisma)
- Use **autoincrement integer primary keys** for all models
- Always run `prisma generate` after schema changes
- Use `db:push` in development, `db:migrate` for production
- Follow existing model patterns in `schema.prisma`
- Include proper relations and indexes

## Authentication and Authorization

### Role Hierarchy (from highest to lowest privileges)
1. `DEVELOPER` - Platform admin
2. `ADMIN` - Company admin
3. `FIRST_AD`, `SECOND_AD` - Assistant Directors
4. `DIRECTOR`
5. `CREW`
6. `ACTOR` - Most limited access

### Permission Patterns
- Verify JWT token in all protected procedures
- Check role-based permissions using utility functions in `/src/server/utils/`
- Actors only see scenes they're assigned to
- Only ADMIN/AD roles can start/stop timers
- Only DIRECTOR role can mark scenes complete
- Always validate company/workspace access

## Key Features and Workflows

### Scene Timer (Core Feature)
- Timer start: Sets scene status to "In Progress", records start time
- Timer stop: Calculates duration, keeps status as "In Progress"
- Complete scene: Only Directors can mark complete (requires timer to be stopped)
- Frontend shows live elapsed time with HH:MM:SS format
- Use pulsing animation for active timers (see existing implementations)

### Multi-workspace Setup
- Each production company is a separate workspace
- Users belong to one company
- All data (shows, scenes) is scoped to company
- First user in company becomes ADMIN, others require approval

## Testing Guidelines

- Currently no test infrastructure exists
- When adding tests in the future:
  - Use a testing framework consistent with the stack (e.g., Vitest, React Testing Library)
  - Test tRPC procedures independently
  - Mock database calls with Prisma
  - Test authentication flows thoroughly

## Security Requirements

### Critical Security Rules
- **Never commit secrets** to the repository
- Store sensitive data in environment variables (`.env` file, gitignored)
- Always hash passwords with bcryptjs (never store plaintext)
- Validate JWT tokens on every protected endpoint
- Sanitize user input to prevent XSS/injection attacks
- Use Zod schemas to validate all API inputs
- Check authorization (role + company access) on every data access

### Environment Variables
Required in `.env`:
```
JWT_SECRET=<secure-random-string>
ADMIN_PASSWORD=<secure-password>
DATABASE_URL=<postgres-connection-string>
```

## Linting and Formatting

### ESLint
- Configuration: `eslint.config.mjs`
- Run: `pnpm run lint`
- Must pass with **zero warnings** (`--max-warnings 0`)
- Fix auto-fixable issues before committing

### Prettier
- Configuration: `prettier.config.mjs`
- Run: `pnpm run format`
- Includes Tailwind CSS plugin for class sorting
- Format before committing

### TypeScript
- Run: `pnpm run typecheck`
- Must pass with no errors
- `tsconfig.json` has strict mode enabled

## Common Patterns and Idioms

### TanStack Router Routes
- File-based routing in `/src/routes/`
- Use `createFileRoute` for route definitions
- Access route params via `Route.useParams()`
- Use `Route.useSearch()` for query params
- Navigate with `useNavigate()` hook

### TanStack Query with tRPC
```typescript
// Query
const { data, isLoading } = trpc.shows.list.useQuery();

// Mutation
const mutation = trpc.shows.create.useMutation({
  onSuccess: () => {
    queryClient.invalidateQueries(['shows']);
  }
});
```

### Form Handling
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1) });
const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema)
});
```

## Documentation

- Update README.md when adding major features
- Document complex business logic with inline comments
- Keep this copilot-instructions.md file updated with architectural changes
- Use JSDoc for complex function signatures when helpful

## Git Workflow

- Work on feature branches
- Write descriptive commit messages
- Keep commits focused and atomic
- Don't commit build artifacts (`dist/`, `node_modules/`)
- Don't commit environment files (`.env`)

## Common Issues and Solutions

### Build Failures
- Run `pnpm install` to ensure dependencies are current
- Run `prisma generate` if database types are missing
- Check that PostgreSQL is running (Docker)
- Clear `.vinxi` cache if experiencing weird build issues

### Type Errors
- Regenerate types: `pnpm run postinstall`
- Check that Prisma schema is in sync: `prisma generate`
- Verify TanStack Router types: `tsr generate`

### Database Issues
- Reset database: `prisma db push --force-reset`
- Check connection string in `.env`
- Ensure PostgreSQL container is running

## Design Principles

1. **Type Safety First**: Leverage TypeScript and tRPC for end-to-end type safety
2. **Cinematic UX**: Maintain the professional, dark mode aesthetic with gold accents
3. **Real-time Focus**: The timer feature is the core differentiator - preserve its accuracy
4. **Role-Based Security**: Always enforce permission checks
5. **Minimal Dependencies**: Only add libraries when absolutely necessary
6. **Performance**: Use TanStack Query caching effectively
7. **Responsive**: Support mobile, tablet, and desktop viewports

## AI Assistant Guidelines

When working on this codebase:
1. Always run `pnpm run typecheck && pnpm run lint` before considering a change complete
2. Preserve the existing architectural patterns (TanStack Router, tRPC procedures, etc.)
3. Don't modify working code unless necessary for the task
4. Test changes in the browser when possible
5. Respect the role-based permission system
6. Maintain the cinematic design aesthetic
7. Keep changes minimal and focused
8. Update documentation when making significant changes
