/**
 * Script simplificado para criar tabelas do Workforce Planning
 * Executa comandos SQL simples sem blocos complexos
 */

async function createWorkforceTablesSimple() {
  console.log('🔧 Criando tabelas do Workforce Planning (versão simplificada)...')

  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // 1. Criar enum WorkforceScheduleStatus
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "WorkforceScheduleStatus" AS ENUM ('IMPORTED', 'IN_REVIEW', 'VALIDATED', 'REJECTED')
      `)
      console.log('✅ Enum WorkforceScheduleStatus criado')
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Enum WorkforceScheduleStatus já existe')
      } else {
        throw error
      }
    }

    // 2. Criar enum WorkforceDayType
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "WorkforceDayType" AS ENUM ('WORK', 'OFF', 'HOLIDAY', 'SICK_LEAVE', 'OTHER')
      `)
      console.log('✅ Enum WorkforceDayType criado')
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Enum WorkforceDayType já existe')
      } else {
        throw error
      }
    }

    // 3. Criar tabela workforce_schedules
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "workforce_schedules" (
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Tabela workforce_schedules criada')
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Tabela workforce_schedules já existe')
      } else {
        throw error
      }
    }

    // 4. Criar tabela workforce_schedule_entries  
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "workforce_schedule_entries" (
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Tabela workforce_schedule_entries criada')
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Tabela workforce_schedule_entries já existe')
      } else {
        throw error
      }
    }

    // 5. Adicionar foreign keys (podem falhar se as referências não existirem, mas continuamos)
    const foreignKeys = [
      {
        name: 'workforce_schedules_sourceDocumentId_fkey',
        sql: `ALTER TABLE "workforce_schedules" ADD CONSTRAINT "workforce_schedules_sourceDocumentId_fkey" 
              FOREIGN KEY ("sourceDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE`
      },
      {
        name: 'workforce_schedules_importedByUserId_fkey', 
        sql: `ALTER TABLE "workforce_schedules" ADD CONSTRAINT "workforce_schedules_importedByUserId_fkey"
              FOREIGN KEY ("importedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE`
      },
      {
        name: 'workforce_schedule_entries_workforceScheduleId_fkey',
        sql: `ALTER TABLE "workforce_schedule_entries" ADD CONSTRAINT "workforce_schedule_entries_workforceScheduleId_fkey"
              FOREIGN KEY ("workforceScheduleId") REFERENCES "workforce_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      },
      {
        name: 'workforce_schedule_entries_employeeId_fkey',
        sql: `ALTER TABLE "workforce_schedule_entries" ADD CONSTRAINT "workforce_schedule_entries_employeeId_fkey"
              FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE`
      }
    ]

    for (const fk of foreignKeys) {
      try {
        await prisma.$executeRawUnsafe(fk.sql)
        console.log(`✅ Foreign key ${fk.name} criada`)
      } catch (error: any) {
        console.log(`⚠️  Foreign key ${fk.name} - ${error.message.includes('already exists') ? 'já existe' : 'falhou (ignorado)'}`)
      }
    }

    // 6. Criar índices
    const indices = [
      `CREATE INDEX "workforce_schedules_year_weekNumber_idx" ON "workforce_schedules"("year", "weekNumber")`,
      `CREATE INDEX "workforce_schedules_status_idx" ON "workforce_schedules"("status")`,
      `CREATE INDEX "workforce_schedule_entries_date_idx" ON "workforce_schedule_entries"("date")`,
      `CREATE INDEX "workforce_schedule_entries_workforceScheduleId_idx" ON "workforce_schedule_entries"("workforceScheduleId")`
    ]

    for (const [i, indexSql] of indices.entries()) {
      try {
        await prisma.$executeRawUnsafe(indexSql)
        console.log(`✅ Índice ${i + 1} criado`)
      } catch (error: any) {
        console.log(`⚠️  Índice ${i + 1} - ${error.message.includes('already exists') ? 'já existe' : 'falhou (ignorado)'}`)
      }
    }

    // 7. Verificação final
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('workforce_schedules', 'workforce_schedule_entries')
    `

    console.log('\n📊 Tabelas verificadas:', tableCheck)

    await prisma.$disconnect()

    console.log('\n✅ CONFIGURAÇÃO WORKFORCE PLANNING CONCLUÍDA!')
    console.log('🎯 Próximo: Testar importação dos dados de Julho 1-5')
    
    return { success: true, tables: tableCheck }

  } catch (error: any) {
    console.error('❌ Erro:', error.message)
    return { success: false, error: error.message }
  }
}

// Executar se chamado directamente
if (require.main === module) {
  createWorkforceTablesSimple()
    .then((result) => {
      process.exit(result.success ? 0 : 1)
    })
}

export { createWorkforceTablesSimple }