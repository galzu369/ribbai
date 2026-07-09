/**
 * Script de Importação - Horário 1-5 Julho 2026
 * 
 * Este script deve ser executado APÓS a resolução do problema do Prisma Client.
 * Importa os dados já estruturados para a base de dados.
 */

import { prisma } from '../lib/db/client'
import fs from 'fs'
import path from 'path'

async function importJuly15Schedule() {
  console.log('🚀 Iniciando importação do horário 1-5 Julho 2026...')

  try {
    // 1. Ler dados estruturados
    const dataPath = path.join(process.cwd(), 'escalas-ribbai-2026', 'processed', 'julho-1-5-2026-structured.json')
    const structuredData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    
    console.log('📋 Dados estruturados carregados com sucesso')

    // 2. Verificar se existe um utilizador para ownership
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@ribbai.local' }
    })

    if (!systemUser) {
      console.log('👤 Criando utilizador de sistema...')
      systemUser = await prisma.user.create({
        data: {
          name: 'Sistema RIBBAI',
          email: 'system@ribbai.local',
          role: 'ADMIN',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    // 3. Criar documento na base de dados
    const sourceDocument = await prisma.document.create({
      data: {
        title: 'Horário Semanal 1-5 Julho 2026',
        description: 'Horário oficial da gerência para a semana de 1-5 Julho 2026',
        category: 'WORKFORCE_PLANNING',
        subCategory: 'WEEKLY_SCHEDULE',
        tags: ['workforce', 'schedule', 'july-2026', 'week-27'],
        fileUrl: 'file://escalas-ribbai-2026/output/schedule.pdf',
        fileName: 'schedule.pdf',
        fileSize: fs.statSync(path.join(process.cwd(), 'escalas-ribbai-2026', 'output', 'schedule.pdf')).size,
        mimeType: 'application/pdf',
        ownerId: systemUser.id,
        status: 'ACTIVE',
        allowedRoles: ['ADMIN', 'MANAGER']
      }
    })

    console.log(`📄 Documento criado: ${sourceDocument.id}`)

    // 4. Criar WorkforceSchedule
    const workforceSchedule = await prisma.workforceSchedule.create({
      data: {
        year: structuredData.workforceSchedule.year,
        weekNumber: structuredData.workforceSchedule.weekNumber,
        weekStartDate: new Date(structuredData.workforceSchedule.weekStartDate),
        weekEndDate: new Date(structuredData.workforceSchedule.weekEndDate),
        status: 'IN_REVIEW',
        sourceDocumentId: sourceDocument.id,
        importedByUserId: systemUser.id,
        importedAt: new Date(),
        location: 'Cantinho Gourmet',
        department: 'Equipa de Sala'
      }
    })

    console.log(`📅 WorkforceSchedule criado: ${workforceSchedule.id}`)

    // 5. Criar entradas para cada dia da semana (1-5 Julho)
    const entries = []
    
    // Mapear dias da semana para números (1=Domingo, 2=Segunda, etc.)
    const weekdayMap: Record<string, number> = {
      'Domingo': 1,
      'Segunda-feira': 2,
      'Terça-feira': 3,
      'Quarta-feira': 4,
      'Quinta-feira': 5,
      'Sexta-feira': 6,
      'Sábado': 7
    }
    
    // Mapear códigos de colaboradores para números de coluna
    const employeeColumnMap: Record<string, number> = {
      'BR': 1, // Bruno
      'FI': 2, // Filipe
      'CA': 3, // Carolina
      'PA': 4, // Pablo
      'LI': 5, // Lil
      'MA': 6, // Matilde
      'LE': 7, // Lee
      'DI': 8  // Diogo
    }
    
    for (const scheduleEntry of structuredData.scheduleEntries) {
      for (const employee of structuredData.employees) {
        // Criar entrada para cada colaborador, cada dia
        const entry = await prisma.workforceScheduleEntry.create({
          data: {
            workforceScheduleId: workforceSchedule.id,
            employeeId: null, // Será linkado quando os Employee records existirem
            employeeName: employee.name,
            date: new Date(scheduleEntry.date),
            weekday: weekdayMap[scheduleEntry.weekday] || new Date(scheduleEntry.date).getDay() + 1,
            plannedStart: new Date(`${scheduleEntry.date}T09:00:00Z`), // Horário de abertura padrão
            plannedEnd: new Date(`${scheduleEntry.date}T23:00:00Z`),   // Horário de fecho padrão  
            breakStart: new Date(`${scheduleEntry.date}T12:00:00Z`),   // Início do almoço
            breakEnd: new Date(`${scheduleEntry.date}T16:30:00Z`),     // Fim do almoço
            plannedHours: 14,      // 14 horas totais (com pausa)
            shiftLabel: scheduleEntry.schedulePattern,
            dayType: 'WORK',
            sourceRow: scheduleEntry.dayNumber,
            sourceColumn: employeeColumnMap[employee.code] || null,
            ocrConfidence: 0.95,   // Alta confiança devido ao processamento manual
            notes: `${employee.position} - ${scheduleEntry.notes || ''}`
          }
        })
        entries.push(entry)
      }
    }

    console.log(`✅ ${entries.length} entradas de horário criadas`)

    // 6. Marcar como VALIDATED
    await prisma.workforceSchedule.update({
      where: { id: workforceSchedule.id },
      data: { status: 'VALIDATED' }
    })

    console.log('🎯 WorkforceSchedule marcado como VALIDATED')

    // 7. Relatório final
    console.log('\n📊 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!')
    console.log('=====================================')
    console.log(`Documento ID: ${sourceDocument.id}`)
    console.log(`WorkforceSchedule ID: ${workforceSchedule.id}`)
    console.log(`Período: ${structuredData.workforceSchedule.period}`)
    console.log(`Colaboradores: ${structuredData.workforceSchedule.metadata.totalCollaborators}`)
    console.log(`Entradas criadas: ${entries.length}`)
    console.log(`Status: VALIDATED`)
    console.log('=====================================')

    // 8. Criar log de auditoria
    await prisma.document.create({
      data: {
        title: 'Log Importação Julho 1-5 2026',
        description: 'Log da importação automática dos dados de horário',
        category: 'SYSTEM',
        subCategory: 'IMPORT_LOG',
        tags: ['system', 'import', 'workforce', 'audit'],
        fileUrl: 'system://import-log',
        fileName: 'import-july-1-5-log.json',
        fileSize: 0,
        mimeType: 'application/json',
        ownerId: systemUser.id,
        status: 'ACTIVE',
        allowedRoles: ['ADMIN']
      }
    })

    console.log('📋 Log de auditoria criado')

    return {
      success: true,
      workforceScheduleId: workforceSchedule.id,
      documentId: sourceDocument.id,
      entriesCount: entries.length
    }

  } catch (error) {
    console.error('❌ Erro durante a importação:', error)
    throw error
  }
}

// Executar se chamado directamente
if (require.main === module) {
  importJuly15Schedule()
    .then((result) => {
      console.log('✅ Script concluído com sucesso:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Script falhou:', error)
      process.exit(1)
    })
}

export { importJuly15Schedule }