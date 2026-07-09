# PDF Design System

## Purpose

The RIBBAI OPS PDF system defines the visual and structural standards for management reports. Reports must feel professional, minimalist, executive, and aligned with luxury hospitality.

The PDF system supports:

- Weekly Operations Reports
- Monthly Operations Reports
- Future executive summaries
- Future action plan exports
- Future operational review packs

## Design Principles

- Minimalist, not empty.
- Executive clarity before decoration.
- Hospitality warmth with consulting-grade precision.
- Strong hierarchy, generous spacing, restrained color.
- Every page should communicate a decision, a signal, or an action.
- Reports must be readable when printed in color or grayscale.

## Visual Personality

RIBBAI OPS reports should feel:

- Calm
- Premium
- Trustworthy
- Structured
- Operationally sharp
- Suitable for management and administration

Avoid:

- Dashboard clutter
- Excessive colors
- Decorative charts without insight
- Dense tables without summary
- Inventory-led report styling

## Page System

### Page Size

- Standard: A4 portrait
- Optional appendix: A4 landscape for wide tables
- Margins: 18mm top, 16mm left/right, 18mm bottom

### Grid

- 12-column conceptual grid
- Main content width: full page width within margins
- Card gap: 8-12px
- Section spacing: 24-32px
- Paragraph spacing: 8-12px

### Page Header

Header should include:

- Report title
- Reporting period
- Restaurant name
- Confidentiality label if required

### Page Footer

Footer should include:

- Report name
- Page number
- Generated timestamp
- RIBBAI OPS identifier

## Typography

### Primary Font

Recommended:

- Inter
- Arial as fallback for PDF reliability

### Type Scale

| Usage | Size | Weight | Notes |
| --- | --- | --- | --- |
| Cover title | 36-44pt | 700 | Tight line height |
| Report title | 24-30pt | 700 | Used on internal title pages |
| Section heading | 16-18pt | 650 | Clear page hierarchy |
| Subsection heading | 11-13pt | 650 | Used inside report sections |
| Body text | 9.5-10.5pt | 400 | Comfortable reading |
| Table text | 8.5-9.5pt | 400 | Compact but legible |
| Captions | 8pt | 400 | Muted, supporting text |
| KPI values | 20-28pt | 700 | Large and direct |

### Typography Rules

- Use sentence case for headings.
- Avoid all caps except small labels.
- Use bold only for hierarchy and key findings.
- Keep body line height between 1.45 and 1.6.

## Color System

### Core Palette

| Token | Color | Usage |
| --- | --- | --- |
| Ink | `#172033` | Primary text |
| Muted | `#5D667A` | Supporting text |
| Line | `#D9DDE7` | Borders and dividers |
| Surface | `#F6F7FA` | Cards and table headers |
| White | `#FFFFFF` | Page background |
| RIBBAI Orange | `#F97316` | Primary accent |
| Dark Orange | `#9A3412` | Section accents |
| Success | `#15803D` | Positive status |
| Warning | `#A16207` | Watch status |
| Risk | `#B91C1C` | High risk status |

### Color Rules

- Use orange sparingly as a brand accent.
- Use gray structure for most tables and cards.
- Use status colors only when they communicate meaning.
- Never use red for normal variance; reserve it for real risk.

## Cover Page

### Required Elements

- Report type
- RIBBAI OPS
- Restaurant: RIBBAI
- Reporting period
- Prepared by
- Submitted to
- Generated date
- Status

### Layout

- Large title in upper third.
- Executive subtitle below.
- Metadata card in lower half.
- Optional confidentiality note at bottom.

### Example Structure

```text
Weekly Operations Report
RIBBAI OPS

Restaurant: RIBBAI
Prepared by: Filipe Catalão
Submitted to: Luís, Paulo, Francisco
Period: Week 24, 2026
Status: Submitted
```

## KPI Cards

### Purpose

KPI cards communicate headline metrics quickly.

### Required Fields

- Label
- Value
- Unit
- Trend indicator
- Previous period comparison
- Status
- Optional short note

### Layout

- 2, 3, or 4 cards per row.
- Minimum card height: 70px.
- Value must be visually dominant.
- Trend should be secondary.

### Status Rules

- Excellent: green accent
- Stable: gray/neutral
- Watch: amber
- At risk: red

## Charts

### Approved Chart Types

- Line chart for trends.
- Bar chart for weekly comparisons.
- Stacked bar for category breakdown.
- Donut chart only for simple composition with less than five categories.
- Risk matrix for risks.

### Chart Rules

- Every chart must have a title and interpretation note.
- Avoid 3D charts.
- Avoid decorative gradients.
- Use direct labels when possible.
- Keep axis labels readable.

### Chart Caption Format

```text
Insight: Overtime increased in Week 3 due to two absence-related coverage gaps.
```

## Tables

### Table Types

- Executive summary table
- Exception table
- Action plan table
- Risk table
- Management request table
- KPI evolution table

### Table Rules

- Use tables for structured decision support, not raw dumps.
- Keep rows concise.
- Highlight only exceptions.
- Use row grouping for priority or severity.
- Repeat table headers across pages.

### Recommended Columns

Action plan:

- Action
- Owner
- Priority
- Due date
- Status
- Expected outcome

Risk table:

- Risk
- Likelihood
- Impact
- Mitigation
- Owner
- Management support needed

## Recommendation Blocks

### Purpose

Recommendation blocks connect evidence to management decisions.

### Required Fields

- Recommendation title
- Evidence
- Expected impact
- Required decision
- Owner
- Suggested deadline
- Priority

### Layout

- Left accent border.
- Recommendation headline.
- Evidence and decision sections.
- Status or priority badge.

## Action Plans

### Purpose

Action plans turn findings into accountability.

### Required Fields

- Action
- Source finding
- Owner
- Due date
- Status
- Expected outcome
- Required support

### Status Labels

- Not started
- In progress
- Completed
- Blocked
- Deferred

### Display Rules

- Separate blocked items from normal action list.
- Carryover items should be marked clearly.
- Completed items should remain visible in weekly reports for accountability.

## Signature Sections

### Purpose

Signature sections create formal acknowledgement for management and administration.

### Weekly Report Signatures

- Prepared by: Filipe Catalão
- Reviewed by: Luís
- Reviewed by: Paulo
- Acknowledged by: Francisco, when relevant

### Monthly Report Signatures

- Prepared by
- Reviewed by Luís
- Reviewed by Paulo
- Acknowledged by Francisco

### Signature Fields

- Name
- Role
- Signature line
- Date
- Comment or decision note

## Report Component Library

| Component | Used In | Purpose |
| --- | --- | --- |
| CoverPage | Weekly, monthly | Executive report identity |
| MetadataPanel | Weekly, monthly | Period and submission context |
| KpiCard | Weekly, monthly | Headline metrics |
| KpiGrid | Weekly, monthly | Metric groups |
| ExecutiveSummaryBlock | Weekly, monthly | Management overview |
| NarrativeBlock | Weekly, monthly | Context and interpretation |
| EvidenceList | Weekly, monthly | Source-backed claims |
| RiskMatrix | Weekly, monthly | Likelihood/impact view |
| ActionPlanTable | Weekly, monthly | Accountability |
| ManagementRequestBlock | Weekly, monthly | Decision requests |
| RecommendationBlock | Monthly | Executive recommendations |
| SignatureSection | Weekly, monthly | Formal acknowledgement |

## Weekly Report PDF Layout

Recommended sequence:

1. Cover page
2. Executive summary
3. Team performance
4. Service performance
5. Operational challenges and implemented solutions
6. Service improvements and team feedback
7. Incident and inventory summary
8. Risks for next week
9. Management requests
10. Action plan
11. Signatures

## Monthly Report PDF Layout

Recommended sequence:

1. Cover page
2. Executive summary
3. KPI evolution
4. Attendance and overtime trends
5. Service improvements and operational excellence
6. Operational challenges and risk review
7. Cost analysis
8. Inventory trend context
9. Recommendations
10. Management actions
11. Signatures
12. Appendix if needed

## PDF Generation Requirements

- Use Puppeteer for rendering.
- Use HTML/CSS templates for deterministic output.
- Store generated PDFs in Supabase Storage.
- Preserve report snapshots and PDF URLs.
- Track generation status and failure reasons.
- Keep templates versioned.

## Accessibility and Print Rules

- Minimum body text size: 9pt.
- Sufficient color contrast.
- Do not rely only on color for status.
- Include labels for all charts.
- Avoid tiny tables that cannot be read when printed.

## Quality Checklist

- Does the report answer what management needs to know?
- Are findings connected to evidence?
- Are actions connected to owners and deadlines?
- Are risks visible before they become incidents?
- Is inventory included only where operationally relevant?
- Can the report be understood in under five minutes?
- Does the PDF feel suitable for a luxury hospitality business?
