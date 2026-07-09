-- Script SQL para criar tabelas do Workforce Planning
-- Executa apenas as tabelas novas sem mexer nos enums existentes

-- 1. Criar enums específicos do Workforce Planning
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkforceScheduleStatus') THEN
        CREATE TYPE "WorkforceScheduleStatus" AS ENUM ('IMPORTED', 'IN_REVIEW', 'VALIDATED', 'REJECTED');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkforceDayType') THEN
        CREATE TYPE "WorkforceDayType" AS ENUM ('WORK', 'OFF', 'HOLIDAY', 'SICK_LEAVE', 'OTHER');
    END IF;
END $$;

-- 2. Criar tabela workforce_schedules
CREATE TABLE IF NOT EXISTS "workforce_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "status" "WorkforceScheduleStatus" NOT NULL DEFAULT 'IMPORTED',
    "location" TEXT,
    "department" TEXT,
    "sourceDocumentId" TEXT,
    "processedDocumentId" TEXT,
    "importedByUserId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT "workforce_schedules_sourceDocumentId_fkey" 
        FOREIGN KEY ("sourceDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "workforce_schedules_processedDocumentId_fkey" 
        FOREIGN KEY ("processedDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "workforce_schedules_importedByUserId_fkey" 
        FOREIGN KEY ("importedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 3. Criar tabela workforce_schedule_entries
CREATE TABLE IF NOT EXISTS "workforce_schedule_entries" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "workforceScheduleId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weekday" TEXT NOT NULL,
    "plannedStart" TEXT,
    "plannedEnd" TEXT,
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "plannedHours" DECIMAL(4,2),
    "shiftLabel" TEXT,
    "dayType" "WorkforceDayType" NOT NULL DEFAULT 'WORK',
    "sourceRow" INTEGER,
    "sourceColumn" TEXT,
    "ocrConfidence" DECIMAL(3,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT "workforce_schedule_entries_workforceScheduleId_fkey" 
        FOREIGN KEY ("workforceScheduleId") REFERENCES "workforce_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workforce_schedule_entries_employeeId_fkey" 
        FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 4. Criar tabela workforce_schedule_breaks (opcional, para múltiplas pausas)
CREATE TABLE IF NOT EXISTS "workforce_schedule_breaks" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "entryId" TEXT NOT NULL,
    "breakStart" TEXT NOT NULL,
    "breakEnd" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT "workforce_schedule_breaks_entryId_fkey" 
        FOREIGN KEY ("entryId") REFERENCES "workforce_schedule_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS "workforce_schedules_year_weekNumber_idx" 
    ON "workforce_schedules"("year", "weekNumber");

CREATE INDEX IF NOT EXISTS "workforce_schedules_status_idx" 
    ON "workforce_schedules"("status");

CREATE INDEX IF NOT EXISTS "workforce_schedules_sourceDocumentId_idx" 
    ON "workforce_schedules"("sourceDocumentId");

CREATE INDEX IF NOT EXISTS "workforce_schedule_entries_workforceScheduleId_idx" 
    ON "workforce_schedule_entries"("workforceScheduleId");

CREATE INDEX IF NOT EXISTS "workforce_schedule_entries_date_idx" 
    ON "workforce_schedule_entries"("date");

CREATE INDEX IF NOT EXISTS "workforce_schedule_entries_employeeId_idx" 
    ON "workforce_schedule_entries"("employeeId");

-- 6. Adicionar colunas às tabelas documents (se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'workforceSchedulesSource') THEN
        -- Esta será tratada como uma relação virtual, não precisa de coluna física
        NULL;
    END IF;
END $$;

-- 7. Comentários para documentação
COMMENT ON TABLE "workforce_schedules" IS 'Horários semanais da equipa importados dos documentos oficiais da gerência';
COMMENT ON TABLE "workforce_schedule_entries" IS 'Entradas individuais de cada colaborador para cada dia do horário semanal';
COMMENT ON TABLE "workforce_schedule_breaks" IS 'Pausas/breaks específicos durante o turno de trabalho (opcional)';

-- 8. Verificação final
SELECT 
    'workforce_schedules' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'workforce_schedules') as exists
UNION ALL
SELECT 
    'workforce_schedule_entries',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'workforce_schedule_entries')
UNION ALL
SELECT 
    'workforce_schedule_breaks',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'workforce_schedule_breaks');