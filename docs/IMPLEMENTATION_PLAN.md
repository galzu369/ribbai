# RIBBAI OPS Implementation Plan

This plan starts from the current foundation scaffold. It intentionally avoids feature implementation until the project can install, validate, build, and test reliably.

## Phase 1

### Foundation Validation

**Goal**  
Make the existing architecture scaffold executable, verifiable, and ready for feature development.

**Dependencies**  
Current scaffold, package configuration, Prisma schema, architecture documentation.

**Estimated Complexity**  
Medium

**Files Affected**  
`README.md`, `.env.example`, `.gitignore`, `next-env.d.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/db/*`, `lib/env/*`, `prisma/schema.prisma`, `prisma/seeds/index.ts`, `tests/setup.ts`, `.husky/*`, CI workflow files, docs.

**Success Criteria**

- Dependencies install successfully.
- Prisma schema validates.
- Initial migration can be generated against a development database.
- Type-checking passes.
- Linting and formatting checks pass.
- Unit test runner starts successfully.
- Playwright can discover tests without configuration errors.
- Next.js build succeeds with a minimal shell.
- Environment variables are documented and validated.

## Phase 2

### Authentication

**Goal**  
Implement secure authentication, session management, and role-aware access control foundations.

**Dependencies**  
Phase 1, validated Prisma schema, environment validation, database client.

**Estimated Complexity**  
High

**Files Affected**  
`lib/auth/*`, `app/api/auth/*`, `server/middleware/*`, `middleware.ts`, `features/authentication/*`, `features/users/*`, `features/settings/*`, `prisma/schema.prisma`, `types/*`, tests.

**Success Criteria**

- Auth.js is configured with Prisma adapter.
- Login/logout/session flows work.
- Protected routes reject unauthenticated access.
- Roles and permissions are modeled in code.
- Auth audit events are recorded.
- Authentication tests cover successful and failed flows.

## Phase 3

### Dashboard

**Goal**  
Create the authenticated operational shell and dashboard foundation without deep business workflows.

**Dependencies**  
Phase 2.

**Estimated Complexity**  
Medium

**Files Affected**  
`app/(dashboard)/*`, `components/layout/*`, `components/ui/*`, `components/charts/*`, `features/analytics/*`, `lib/navigation/*`, tests.

**Success Criteria**

- Authenticated users land in a dashboard shell.
- Navigation reflects available domains and permissions.
- Empty-state dashboard panels are present.
- Layout works across desktop and mobile breakpoints.
- No business CRUD workflows are introduced prematurely.

## Phase 4

### Employees

**Goal**  
Implement employee profile management foundations and establish reusable domain patterns.

**Dependencies**  
Phases 1-3, authorization model, database baseline.

**Estimated Complexity**  
High

**Files Affected**  
`features/employees/*`, `server/repositories/employees*`, `server/services/employees*`, `server/actions/employees*`, `lib/validations/*`, `types/features/*`, `prisma/schema.prisma`, tests.

**Success Criteria**

- Employee repository, service, validation, and action patterns are established.
- Employee records can be created, viewed, updated, soft deleted, and audited.
- Access rules protect sensitive employee data.
- Tests validate employee domain behavior and permissions.

## Phase 5

### Shifts

**Goal**  
Implement shift planning primitives and prepare scheduling workflows.

**Dependencies**  
Phase 4.

**Estimated Complexity**  
High

**Files Affected**  
`features/shifts/*`, `server/repositories/shifts*`, `server/services/shifts*`, `server/actions/shifts*`, `components/calendar-or-scheduling/*`, `prisma/schema.prisma`, tests.

**Success Criteria**

- Shifts can be assigned to employees.
- Shift status lifecycle is enforced.
- Schedule conflicts are detected.
- Shift operations are permission-controlled and audited.
- Tests cover scheduling constraints.

## Phase 6

### Attendance

**Goal**  
Implement attendance tracking against scheduled shifts.

**Dependencies**  
Phase 5.

**Estimated Complexity**  
High

**Files Affected**  
`features/attendance/*`, `server/repositories/attendance*`, `server/services/attendance*`, `server/actions/attendance*`, `prisma/schema.prisma`, tests.

**Success Criteria**

- Attendance records link reliably to shifts and employees.
- Clock-in and clock-out lifecycle is defined.
- Late, absent, early-leave, and verification states are handled.
- Attendance changes are audited.
- Tests cover status transitions and time calculations.

## Phase 7

### Inventory

**Goal**  
Implement inventory master data, supplier links, and transaction-based stock movement.

**Dependencies**  
Phases 1-3, authentication and authorization, database baseline.

**Estimated Complexity**  
High

**Files Affected**  
`features/inventory/*`, `features/suppliers/*`, `server/repositories/inventory*`, `server/repositories/suppliers*`, `server/services/inventory*`, `server/actions/inventory*`, `prisma/schema.prisma`, tests.

**Success Criteria**

- Inventory items and suppliers are managed through validated domain services.
- Stock changes occur through immutable transactions.
- Current stock is updated consistently.
- Low stock rules can be evaluated.
- Inventory actions are audited.

## Phase 8

### Weekly Inventory Workflow

**Goal**  
Implement the weekly physical inventory count and approval workflow.

**Dependencies**  
Phase 7.

**Estimated Complexity**  
High

**Files Affected**  
`features/inventory/*`, `features/reports/*`, `server/services/weekly-inventory*`, `server/actions/weekly-inventory*`, `prisma/schema.prisma`, tests.

**Success Criteria**

- Weekly inventory sessions can be opened, counted, submitted, approved, and closed.
- Variances are calculated at item and session level.
- Count records reconcile with inventory transactions.
- Approval rules are enforced.
- Tests cover variance and approval behavior.

## Phase 9

### Reports

**Goal**  
Create report generation services and reusable report definitions.

**Dependencies**  
Phases 4-8.

**Estimated Complexity**  
High

**Files Affected**  
`features/reports/*`, `reports/templates/*`, `server/repositories/reports*`, `server/services/reports*`, `server/actions/reports*`, `prisma/schema.prisma`, tests.

**Success Criteria**

- Weekly and monthly reports can be generated from operational data.
- Report outputs are persisted with status and metadata.
- Report calculations are covered by unit tests.
- Report access is permission-controlled.

## Phase 10

### PDF Engine

**Goal**  
Implement reliable PDF rendering and storage for generated reports and documents.

**Dependencies**  
Phase 9, Supabase storage configuration.

**Estimated Complexity**  
Medium to High

**Files Affected**  
`pdf/templates/*`, `components/pdf/*`, `config/pdf/*`, `server/services/pdf*`, `features/reports/*`, `features/documents/*`, tests.

**Success Criteria**

- PDF templates render consistently.
- Puppeteer generation works in local and deployed environments.
- Generated PDFs are stored in Supabase Storage.
- PDF metadata is linked to reports or documents.
- Failures are logged and surfaced clearly.

## Phase 11

### Analytics

**Goal**  
Build KPI calculation and visualization foundations.

**Dependencies**  
Phases 4-10.

**Estimated Complexity**  
High

**Files Affected**  
`features/analytics/*`, `analytics/dashboards/*`, `components/charts/*`, `server/services/analytics*`, `server/repositories/analytics*`, `prisma/schema.prisma`, tests.

**Success Criteria**

- Core KPIs are defined centrally.
- Dashboard data is loaded through analytics services.
- Charts render from typed metric contracts.
- Expensive calculations are isolated and cache-ready.
- Tests cover metric calculations.

## Phase 12

### Checklists

**Goal**  
Implement operational checklist templates, scheduled instances, and completion tracking.

**Dependencies**  
Phases 2-4, notification foundations if required.

**Estimated Complexity**  
Medium

**Files Affected**  
`features/checklists/*`, `server/repositories/checklists*`, `server/services/checklists*`, `server/actions/checklists*`, `prisma/schema.prisma`, tests.

**Success Criteria**

- Checklist templates can define recurring operational tasks.
- Checklist instances can be scheduled and completed.
- Completion rates are calculated.
- Overdue or missed checklists can trigger notifications.
- Tests cover task completion and recurrence behavior.

## Phase 13

### Incidents

**Goal**  
Implement incident reporting, investigation, and resolution tracking.

**Dependencies**  
Phases 2-4, Document Center if attachments are required immediately.

**Estimated Complexity**  
Medium to High

**Files Affected**  
`features/incidents/*`, `server/repositories/incidents*`, `server/services/incidents*`, `server/actions/incidents*`, `features/notifications/*`, `prisma/schema.prisma`, tests.

**Success Criteria**

- Incidents can be reported with type, severity, description, and timeline data.
- Investigation, corrective action, and resolution lifecycle is enforced.
- Sensitive incident data is permission-controlled.
- Incident activity is audited.
- Tests cover lifecycle transitions.

## Phase 14

### Document Center

**Goal**  
Implement secure document storage, metadata, versioning, and access control.

**Dependencies**  
Phase 2, Supabase storage configuration, optionally Phase 13 for incident attachments.

**Estimated Complexity**  
High

**Files Affected**  
`features/documents/*`, `server/repositories/documents*`, `server/services/documents*`, `server/actions/documents*`, `lib/storage/*`, `config/*`, `prisma/schema.prisma`, tests.

**Success Criteria**

- Documents upload to Supabase Storage.
- Metadata, category, version, expiry, and access rules are persisted.
- Download access is permission-controlled.
- Document updates preserve version history.
- Tests cover upload metadata and authorization.

## Phase 15

### AI Layer

**Goal**  
Introduce AI-ready data pipelines, forecasts, and operational insights without disrupting core workflows.

**Dependencies**  
Phases 7-11, stable historical operational data, analytics services.

**Estimated Complexity**  
Very High

**Files Affected**  
`features/ai-intelligence/*`, `server/services/ai*`, `analytics/*`, `prisma/schema.prisma`, `scripts/*`, external AI service integration files, tests.

**Success Criteria**

- Forecast and insight records can be generated, stored, reviewed, and dismissed.
- AI outputs are clearly separated from authoritative operational data.
- Forecast confidence and accuracy can be tracked.
- Model inputs and outputs are auditable.
- AI recommendations never mutate operational state without explicit user action.
