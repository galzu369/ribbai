# RIBBAI OPS - System Architecture

**Version:** 1.0  
**Last Updated:** June 2026  
**Status:** Foundation Phase

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Principles](#architecture-principles)
4. [Domain Architecture](#domain-architecture)
5. [Database Design](#database-design)
6. [Security Architecture](#security-architecture)
7. [Reporting Architecture](#reporting-architecture)
8. [PDF Generation Architecture](#pdf-generation-architecture)
9. [Analytics Architecture](#analytics-architecture)
10. [AI Intelligence Architecture](#ai-intelligence-architecture)
11. [Deployment Architecture](#deployment-architecture)
12. [Scalability Considerations](#scalability-considerations)

---

## System Overview

### Purpose

RIBBAI OPS is an enterprise-grade restaurant operations management platform designed to streamline and optimize all operational aspects of the RIBBAI restaurant. The system handles staff management, inventory control, reporting, analytics, and predictive intelligence.

### Core Objectives

- **Operational Excellence:** Automate and optimize daily operations
- **Data-Driven Decisions:** Provide actionable insights through analytics
- **Compliance & Auditability:** Maintain comprehensive audit trails
- **Scalability:** Support growth from single to multi-location operations
- **Intelligence:** Leverage AI for forecasting and optimization

### System Boundaries

**In Scope:**
- Staff and shift management
- Attendance tracking
- Inventory management and control
- Weekly/monthly reporting
- Document management
- Incident tracking
- Checklist management
- Analytics and dashboards
- AI-powered forecasting
- PDF generation
- Role-based access control

**Out of Scope (Current Phase):**
- Point of Sale (POS) integration
- Customer relationship management
- Online ordering
- Table reservation system
- Payment processing

---

## Technology Stack

### Frontend Layer

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.7+
- **UI Library:** React 19
- **Styling:** TailwindCSS 3.4
- **Component Library:** shadcn/ui (Radix UI primitives)
- **Icons:** Lucide Icons
- **State Management:** Zustand + React Query
- **Forms:** React Hook Form + Zod validation

### Backend Layer

- **Runtime:** Node.js 20+
- **API:** Next.js API Routes + Server Actions
- **Database:** PostgreSQL 15+
- **ORM:** Prisma 6
- **Authentication:** Auth.js (NextAuth v5)
- **File Storage:** Supabase Storage

### Infrastructure Layer

- **Hosting:** Vercel (Edge Network)
- **Database Hosting:** Vercel Postgres / Supabase
- **CDN:** Vercel Edge Network
- **Storage:** Supabase Storage
- **Monitoring:** Vercel Analytics

### Development & Quality

- **Testing:** Vitest (unit) + Playwright (E2E)
- **Code Quality:** ESLint + Prettier
- **Git Hooks:** Husky + lint-staged
- **CI/CD:** Vercel (automated)
- **Documentation:** Markdown + TypeDoc

---

## Architecture Principles

### 1. Domain-Driven Design (DDD)

The system is organized into clear domain boundaries:
- Each domain has its own folder with features, types, and logic
- Domains are loosely coupled
- Cross-domain communication through well-defined interfaces

### 2. Separation of Concerns

```
├── app/              → Routing & UI pages (presentation)
├── features/         → Domain-specific business logic
├── server/           → Server-side logic
│   ├── actions/      → Server Actions (API layer)
│   ├── repositories/ → Data access layer
│   └── services/     → Business logic layer
├── components/       → Reusable UI components
├── lib/              → Shared utilities
└── types/            → Type definitions
```

### 3. Server-First Architecture

- Leverage Next.js Server Components by default
- Use Client Components only when necessary (interactivity)
- Implement Server Actions for mutations
- API routes for external integrations only

### 4. Type Safety

- Strict TypeScript configuration
- Zod schemas for runtime validation
- Prisma for type-safe database access
- End-to-end type safety from database to UI

### 5. Security by Design

- Authentication at the edge
- Authorization on every data access
- SQL injection prevention (Prisma)
- XSS prevention (React)
- CSRF protection (built-in)
- Audit logging on sensitive operations

### 6. Performance Optimization

- Server-side rendering (SSR) for SEO
- Static generation where possible
- Incremental Static Regeneration (ISR)
- Image optimization (Next.js)
- Code splitting (automatic)
- Database query optimization (Prisma)

---

## Domain Architecture

### 1. Authentication & Authorization

**Responsibility:**  
User authentication, session management, and role-based access control.

**Key Features:**
- Multi-provider authentication (email/password, OAuth)
- Session management
- Role-based permissions
- User suspension/activation

**Dependencies:**
- User domain
- Employee domain

**Data Ownership:**
- Users
- Sessions
- Accounts
- Roles
- Permissions

**Scalability:**
- JWT tokens for stateless sessions
- Role caching
- Permission evaluation at edge

---

### 2. Employee Management

**Responsibility:**  
Complete employee lifecycle management.

**Key Features:**
- Employee profiles
- Contract management
- Document storage
- Emergency contacts
- Employment status tracking

**Dependencies:**
- User domain (optional user account linkage)
- Document domain

**Data Ownership:**
- Employees
- Personal information
- Employment records

**Scalability:**
- Support multi-location employees
- Historical record retention
- Performance tracking

---

### 3. Shift & Attendance

**Responsibility:**  
Shift scheduling and time tracking.

**Key Features:**
- Shift planning (daily/weekly/monthly)
- Shift types (morning, evening, split)
- Clock in/out tracking
- Overtime calculation
- Absence management

**Dependencies:**
- Employee domain
- Notification domain

**Data Ownership:**
- Shifts
- Attendance records
- Clock-in/out data

**Scalability:**
- Recurring shift templates
- Bulk shift creation
- Conflict detection
- Real-time availability

---

### 4. Inventory Management

**Responsibility:**  
Complete inventory lifecycle and stock control.

**Key Features:**
- Item master data
- Stock tracking
- Supplier management
- Transaction history
- Reorder point alerts
- Wastage tracking

**Dependencies:**
- Supplier domain
- Notification domain
- Audit log domain

**Data Ownership:**
- Inventory items
- Transactions (IN/OUT/ADJUSTMENT/WASTAGE)
- Current stock levels
- Suppliers

**Scalability:**
- Multi-location stock
- Batch operations
- Historical analysis
- Cost tracking

---

### 5. Weekly Inventory

**Responsibility:**  
Physical stock counting and variance analysis.

**Key Features:**
- Weekly count scheduling
- Item-by-item counting
- Variance calculation
- Value calculation
- Approval workflow

**Dependencies:**
- Inventory domain
- Employee domain
- Report domain

**Data Ownership:**
- Weekly inventory sessions
- Count records
- Variance reports

**Scalability:**
- Multi-user counting
- Section-based counting
- Historical comparisons
- Trend analysis

---

### 6. Reports

**Responsibility:**  
Business intelligence reporting and PDF generation.

**Key Features:**
- Weekly operational reports
- Monthly performance reports
- Inventory valuation reports
- Staff performance reports
- Custom report builder

**Dependencies:**
- All operational domains
- PDF engine
- Analytics domain

**Data Ownership:**
- Report definitions
- Generated reports
- Report schedules

**Scalability:**
- Scheduled generation
- Report caching
- Template system
- Export formats

---

### 7. Analytics

**Responsibility:**  
Data analysis and visualization.

**Key Features:**
- Real-time dashboards
- KPI tracking
- Trend analysis
- Comparative analysis
- Custom metrics

**Dependencies:**
- All operational domains

**Data Ownership:**
- Dashboard configurations
- Metric definitions
- Calculated aggregations

**Scalability:**
- Pre-computed aggregations
- Time-series optimization
- Dashboard caching
- Real-time updates

---

### 8. Checklists

**Responsibility:**  
Task and procedure compliance.

**Key Features:**
- Template management
- Task scheduling
- Completion tracking
- Recurring checklists
- Multi-step workflows

**Dependencies:**
- Employee domain
- Notification domain

**Data Ownership:**
- Checklist templates
- Checklist instances
- Task completion records

**Scalability:**
- Dynamic task generation
- Conditional logic
- Bulk creation
- Historical compliance

---

### 9. Incidents

**Responsibility:**  
Incident tracking and resolution.

**Key Features:**
- Incident reporting
- Severity classification
- Investigation tracking
- Root cause analysis
- Corrective actions
- Document attachments

**Dependencies:**
- Employee domain
- Document domain
- Notification domain

**Data Ownership:**
- Incidents
- Investigation records
- Resolution history

**Scalability:**
- Incident patterns
- Recurring prevention
- Statistical analysis
- Risk assessment

---

### 10. Documents

**Responsibility:**  
Document management and version control.

**Key Features:**
- Document upload/download
- Category management
- Version control
- Access control
- Expiry tracking
- Search functionality

**Dependencies:**
- Storage service (Supabase)
- User domain

**Data Ownership:**
- Document metadata
- File references
- Version history

**Scalability:**
- CDN delivery
- Large file handling
- Bulk operations
- Archive management

---

### 11. Notifications

**Responsibility:**  
Multi-channel notification delivery.

**Key Features:**
- In-app notifications
- Email notifications
- SMS alerts (future)
- Push notifications (future)
- Notification preferences

**Dependencies:**
- All domains (consumers)
- User domain

**Data Ownership:**
- Notification records
- Delivery status
- User preferences

**Scalability:**
- Queue-based delivery
- Batch processing
- Template system
- Delivery tracking

---

### 12. Audit Logs

**Responsibility:**  
System-wide audit trail.

**Key Features:**
- Action logging
- Change tracking
- User activity monitoring
- Compliance reporting

**Dependencies:**
- All domains (logging points)

**Data Ownership:**
- Audit records
- Change history

**Scalability:**
- High-volume ingestion
- Efficient querying
- Retention policies
- Archive strategy

---

### 13. AI Intelligence (Future)

**Responsibility:**  
Predictive analytics and optimization.

**Key Features:**
- Demand forecasting
- Staff requirement prediction
- Wastage prediction
- Anomaly detection
- Optimization recommendations

**Dependencies:**
- All operational domains
- Analytics domain

**Data Ownership:**
- Forecasts
- Model metadata
- Training data references
- Insights

**Scalability:**
- Batch predictions
- Model versioning
- A/B testing
- Feedback loops

---

## Database Design

### Design Philosophy

1. **Normalization:** 3rd normal form where appropriate
2. **Audit Trail:** Every table includes created/updated timestamps
3. **Soft Deletes:** `deletedAt` for non-permanent deletion
4. **Optimistic Locking:** Version control where needed
5. **Indexing Strategy:** Indexes on foreign keys and query columns

### Entity Relationships

```
User ──┬─→ Role
       ├─→ Employee (optional)
       ├─→ Sessions
       ├─→ Accounts
       └─→ AuditLogs

Employee ──┬─→ Shifts
           ├─→ Attendance
           ├─→ PerformanceMetrics
           └─→ Incidents

Shift ──→ Attendance (1:1)

InventoryItem ──┬─→ Supplier
                ├─→ InventoryTransactions
                └─→ WeeklyInventoryItems

WeeklyInventory ──→ WeeklyInventoryItems ──→ InventoryItem

Report ──→ User (creator)

ChecklistTemplate ──→ Checklists

Document ──→ User (owner)
```

### Data Retention

- **Operational Data:** 7 years (compliance)
- **Audit Logs:** 10 years
- **Deleted Records:** Soft delete, purge after 2 years
- **Sessions:** Auto-expire based on configuration
- **Reports:** Archive after 3 years

### Backup Strategy

- **Frequency:** Daily automated backups
- **Retention:** 30 daily, 12 monthly, 7 yearly
- **Point-in-time Recovery:** Available
- **Disaster Recovery:** Cross-region replication

---

## Security Architecture

### Authentication Flow

```
User Login
    ↓
Auth.js Validation
    ↓
Session Creation (JWT)
    ↓
Role & Permission Loading
    ↓
Secure Cookie Storage
```

### Authorization Model

**Role-Based Access Control (RBAC):**

- **Super Admin:** Full system access
- **Manager:** Operational management
- **Supervisor:** Team oversight
- **Staff:** Limited operational access
- **Read-Only:** View-only access

**Permission Structure:**
```json
{
  "domain": "inventory",
  "actions": ["create", "read", "update", "delete"],
  "conditions": {
    "own_location": true
  }
}
```

### Data Protection

- **Encryption at Rest:** Database-level encryption
- **Encryption in Transit:** TLS 1.3
- **Sensitive Data:** Additional encryption for PII
- **Password Hashing:** bcrypt (10 rounds)
- **API Security:** Rate limiting, CORS, CSP

### Security Monitoring

- Failed login tracking
- Suspicious activity detection
- Audit log analysis
- Regular security reviews

---

## Reporting Architecture

### Report Types

1. **Weekly Operational Report**
   - Staff attendance summary
   - Inventory movements
   - Incident summary
   - Checklist completion rates

2. **Monthly Performance Report**
   - Financial metrics
   - Staff performance
   - Inventory valuation
   - Key trends

3. **Inventory Valuation Report**
   - Stock levels
   - Cost analysis
   - Variance analysis
   - Reorder recommendations

4. **Staff Performance Report**
   - Attendance rates
   - Punctuality metrics
   - Task completion
   - Performance ratings

### Report Generation Pipeline

```
Trigger (scheduled/manual)
    ↓
Data Collection (repositories)
    ↓
Data Transformation (services)
    ↓
Report Composition (JSON structure)
    ↓
PDF Generation (Puppeteer)
    ↓
Storage (Supabase)
    ↓
Notification (email/in-app)
```

### Performance Optimization

- Background job processing
- Data pre-aggregation
- Caching intermediate results
- Incremental computation

---

## PDF Generation Architecture

### Technology

- **Engine:** Puppeteer (headless Chrome)
- **Templates:** HTML + TailwindCSS
- **Rendering:** Server-side

### PDF Generation Flow

```
Report Data
    ↓
HTML Template Selection
    ↓
Data Injection (template engine)
    ↓
CSS Styling (TailwindCSS)
    ↓
Puppeteer Rendering
    ↓
PDF Output
    ↓
Storage (Supabase)
    ↓
URL Generation
```

### Template Structure

```
pdf/
├── templates/
│   ├── weekly-report.html
│   ├── monthly-report.html
│   ├── inventory-report.html
│   └── staff-report.html
├── styles/
│   └── pdf-styles.css
└── utils/
    ├── renderer.ts
    └── template-engine.ts
```

### Optimization

- Template caching
- Asset inlining
- Parallel generation
- Queue management

---

## Analytics Architecture

### Analytics Stack

- **Data Source:** PostgreSQL (operational data)
- **Visualization:** Recharts
- **Dashboards:** Custom React components
- **Caching:** React Query + in-memory

### Dashboard Types

1. **Executive Dashboard**
   - High-level KPIs
   - Trend charts
   - Alerts and notifications

2. **Operations Dashboard**
   - Real-time metrics
   - Staff overview
   - Inventory status

3. **Financial Dashboard**
   - Cost analysis
   - Waste tracking
   - Budget vs. actual

4. **Staff Dashboard**
   - Attendance trends
   - Performance metrics
   - Schedule overview

### Metrics Architecture

```typescript
interface Metric {
  id: string;
  name: string;
  category: string;
  calculation: MetricCalculation;
  refresh: RefreshStrategy;
  visualization: VisualizationType;
}
```

### Data Refresh Strategies

- **Real-time:** WebSocket updates
- **Near real-time:** Polling (30s interval)
- **Periodic:** Scheduled refresh (5-15 min)
- **On-demand:** Manual refresh

---

## AI Intelligence Architecture

### AI Capabilities (Planned)

1. **Demand Forecasting**
   - Historical sales analysis
   - Seasonal patterns
   - Event-based adjustments

2. **Staff Optimization**
   - Shift demand prediction
   - Skill-based scheduling
   - Cost optimization

3. **Inventory Optimization**
   - Reorder point calculation
   - Waste reduction
   - Supplier performance

4. **Anomaly Detection**
   - Unusual patterns
   - Fraud detection
   - Quality issues

### Architecture

```
Data Collection Layer
    ↓
Feature Engineering
    ↓
Model Training (offline)
    ↓
Model Serving (inference)
    ↓
Prediction Storage
    ↓
Action Recommendations
    ↓
Feedback Loop
```

### Technology Stack (Future)

- **ML Framework:** Python-based (separate service)
- **Model Storage:** Cloud storage
- **Inference:** API-based
- **Monitoring:** Model performance tracking

### Integration Points

- Data export for training
- Prediction import
- Feedback collection
- A/B testing framework

---

## Deployment Architecture

### Environment Strategy

1. **Development**
   - Local development (localhost)
   - Feature branches
   - Database: Local PostgreSQL

2. **Staging**
   - Preview deployments (Vercel)
   - PR-based environments
   - Database: Staging instance

3. **Production**
   - Main branch auto-deploy
   - Edge network (Vercel)
   - Database: Production cluster

### CI/CD Pipeline

```
Git Push
    ↓
GitHub Actions (lint, test)
    ↓
Vercel Build
    ↓
Database Migration
    ↓
Deploy to Edge
    ↓
Health Check
    ↓
Notification
```

### Monitoring & Observability

- **Uptime Monitoring:** Vercel Analytics
- **Error Tracking:** Built-in error boundaries
- **Performance:** Web Vitals tracking
- **Logs:** Structured logging
- **Alerts:** Critical error notifications

### Disaster Recovery

- **Backup Frequency:** Daily
- **Recovery Time Objective (RTO):** 4 hours
- **Recovery Point Objective (RPO):** 24 hours
- **Failover Strategy:** Automatic (Vercel)

---

## Scalability Considerations

### Current Architecture (Phase 1)

- **Capacity:** Single restaurant location
- **Users:** 50-100 concurrent users
- **Data:** < 100GB
- **Traffic:** < 10K requests/day

### Growth Path

#### Phase 2: Multi-Location (Year 1-2)
- **Changes:**
  - Add location dimension to all entities
  - Multi-tenant data isolation
  - Location-based dashboards
  - Consolidated reporting

#### Phase 3: Enterprise (Year 2-3)
- **Changes:**
  - Microservices extraction
  - Dedicated analytics database
  - Advanced caching (Redis)
  - CDN optimization

#### Phase 4: Scale (Year 3-5)
- **Changes:**
  - Event-driven architecture
  - Dedicated job queue
  - Real-time data pipeline
  - ML model deployment

### Performance Targets

| Metric | Target | Threshold |
|--------|--------|-----------|
| Page Load | < 2s | < 3s |
| API Response | < 500ms | < 1s |
| Database Query | < 100ms | < 300ms |
| PDF Generation | < 10s | < 30s |
| Uptime | 99.5% | 99% |

### Database Scaling

- **Vertical Scaling:** Upgrade instance size
- **Read Replicas:** Add for analytics queries
- **Connection Pooling:** PgBouncer
- **Query Optimization:** Regular review
- **Archival:** Move old data to cold storage

### Application Scaling

- **Serverless:** Auto-scaling (Vercel)
- **Edge Caching:** Static assets
- **Code Splitting:** Lazy loading
- **Image Optimization:** Next.js built-in

---

## Appendix

### Glossary

- **SKU:** Stock Keeping Unit
- **RBAC:** Role-Based Access Control
- **KPI:** Key Performance Indicator
- **RPO:** Recovery Point Objective
- **RTO:** Recovery Time Objective
- **SSR:** Server-Side Rendering
- **ISR:** Incremental Static Regeneration

### References

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Auth.js Documentation](https://authjs.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

---

**Document Control:**  
This document is maintained by the Engineering Team and should be reviewed quarterly or when significant architectural changes are proposed.
