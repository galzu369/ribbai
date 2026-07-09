-- CreateTable
CREATE TABLE "operational_notes" (
    "id" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "noteType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_improvements" (
    "id" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expectedImpact" TEXT,
    "observationPeriod" TEXT,
    "actualImpact" TEXT,
    "implementedDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "assignedTo" TEXT,
    "category" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_improvements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_snapshots" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kpiCategory" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "targetValue" DECIMAL(12,4),
    "previousValue" DECIMAL(12,4),
    "unit" TEXT,
    "trend" TEXT,
    "status" TEXT,
    "metadata" JSONB,
    "employeeId" TEXT,
    "calculatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_feedback" (
    "id" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "employeeId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "category" TEXT,
    "priority" TEXT,
    "actionTaken" TEXT,
    "followUpDate" TIMESTAMP(3),
    "providedBy" TEXT NOT NULL,
    "context" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "thresholdValue" DECIMAL(12,4) NOT NULL,
    "severity" TEXT NOT NULL,
    "timeWindow" INTEGER,
    "consecutiveOccurrences" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmails" TEXT[],
    "notifyRoles" TEXT[],
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "lastTriggered" TIMESTAMP(3),
    "triggeredCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_history" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "triggeredValue" DECIMAL(12,4),
    "thresholdValue" DECIMAL(12,4),
    "relatedEntity" TEXT,
    "actionRequired" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "metadata" JSONB,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_score_history" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "overallScore" DECIMAL(5,2) NOT NULL,
    "operationalScore" DECIMAL(5,2) NOT NULL,
    "teamScore" DECIMAL(5,2) NOT NULL,
    "financialScore" DECIMAL(5,2) NOT NULL,
    "qualityScore" DECIMAL(5,2) NOT NULL,
    "maintenanceScore" DECIMAL(5,2) NOT NULL,
    "communicationScore" DECIMAL(5,2) NOT NULL,
    "factors" JSONB NOT NULL,
    "recommendations" TEXT[],
    "calculationVersion" TEXT NOT NULL,
    "dataPointsUsed" INTEGER NOT NULL,
    "calculatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operational_notes_reportDate_idx" ON "operational_notes"("reportDate");

-- CreateIndex
CREATE INDEX "operational_notes_noteType_idx" ON "operational_notes"("noteType");

-- CreateIndex
CREATE INDEX "operational_notes_author_idx" ON "operational_notes"("author");

-- CreateIndex
CREATE INDEX "operational_notes_priority_idx" ON "operational_notes"("priority");

-- CreateIndex
CREATE INDEX "service_improvements_reportDate_idx" ON "service_improvements"("reportDate");

-- CreateIndex
CREATE INDEX "service_improvements_type_idx" ON "service_improvements"("type");

-- CreateIndex
CREATE INDEX "service_improvements_status_idx" ON "service_improvements"("status");

-- CreateIndex
CREATE INDEX "service_improvements_category_idx" ON "service_improvements"("category");

-- CreateIndex
CREATE INDEX "kpi_snapshots_date_idx" ON "kpi_snapshots"("date");

-- CreateIndex
CREATE INDEX "kpi_snapshots_kpiCategory_idx" ON "kpi_snapshots"("kpiCategory");

-- CreateIndex
CREATE INDEX "kpi_snapshots_kpiName_idx" ON "kpi_snapshots"("kpiName");

-- CreateIndex
CREATE INDEX "kpi_snapshots_employeeId_idx" ON "kpi_snapshots"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_snapshots_date_kpiCategory_kpiName_employeeId_key" ON "kpi_snapshots"("date", "kpiCategory", "kpiName", "employeeId");

-- CreateIndex
CREATE INDEX "team_feedback_reportDate_idx" ON "team_feedback"("reportDate");

-- CreateIndex
CREATE INDEX "team_feedback_employeeId_idx" ON "team_feedback"("employeeId");

-- CreateIndex
CREATE INDEX "team_feedback_feedbackType_idx" ON "team_feedback"("feedbackType");

-- CreateIndex
CREATE INDEX "team_feedback_sentiment_idx" ON "team_feedback"("sentiment");

-- CreateIndex
CREATE INDEX "team_feedback_providedBy_idx" ON "team_feedback"("providedBy");

-- CreateIndex
CREATE INDEX "alert_rules_category_idx" ON "alert_rules"("category");

-- CreateIndex
CREATE INDEX "alert_rules_metricName_idx" ON "alert_rules"("metricName");

-- CreateIndex
CREATE INDEX "alert_rules_isActive_idx" ON "alert_rules"("isActive");

-- CreateIndex
CREATE INDEX "alert_history_triggeredAt_idx" ON "alert_history"("triggeredAt");

-- CreateIndex
CREATE INDEX "alert_history_type_idx" ON "alert_history"("type");

-- CreateIndex
CREATE INDEX "alert_history_severity_idx" ON "alert_history"("severity");

-- CreateIndex
CREATE INDEX "alert_history_status_idx" ON "alert_history"("status");

-- CreateIndex
CREATE INDEX "alert_history_ruleId_idx" ON "alert_history"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "health_score_history_date_key" ON "health_score_history"("date");

-- CreateIndex
CREATE INDEX "health_score_history_date_idx" ON "health_score_history"("date");

-- CreateIndex
CREATE INDEX "health_score_history_overallScore_idx" ON "health_score_history"("overallScore");

-- AddForeignKey
ALTER TABLE "kpi_snapshots" ADD CONSTRAINT "kpi_snapshots_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_feedback" ADD CONSTRAINT "team_feedback_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "alert_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
