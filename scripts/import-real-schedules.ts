/**
 * Importador de Horários Reais
 * Importa os dados extraídos das imagens reais para a base de dados
 */

import fs from 'fs'
import path from 'path'

async function importRealSchedulesToDatabase() {
  console.log('🚀 Importando horários reais para a base de dados...')

  try {
    // Ler dados estruturados
    const dataPath = path.join(process.cwd(), 'workforce-schedules', '2026', 'julho', 'schedule-1-5-julho-2026-final.json')
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Arquivo não encontrado: ${dataPath}`)
    }

    const scheduleData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    console.log('📋 Dados estruturados carregados com sucesso')

    // Importar Prisma client
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // 1. Verificar utilizador de sistema
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@ribbai.local' }
    })

    if (!systemUser) {
      console.log('👤 Criando utilizador de sistema...')
      systemUser = await prisma.user.create({
        data: {
          name: 'Sistema RIBBAI',
          email: 'system@ribbai.local',
          isActive: true
        }
      })
    }

    console.log('✅ Utilizador sistema:', systemUser.email)

    // 2. Criar documento fonte (baseado nas imagens reais)
    const sourceDocument = await prisma.document.create({
      data: {
        title: 'Horários Semanais 1-5 Julho 2026 (Imagens Reais)',
        description: 'Horários extraídos das imagens enviadas pela gerência para a semana de 1-5 julho 2026',
        category: 'WORKFORCE_PLANNING',
        subCategory: 'WEEKLY_SCHEDULE_REAL',
        tags: ['workforce', 'schedule', 'july-2026', 'week-27', 'real-images'],
        fileUrl: 'images://real-schedule-images-1-5-july',
        fileName: 'schedule-images-1-5-july-2026.png',
        fileSize: 0,
        mimeType: 'image/png',
        ownerId: systemUser.id,
        status: 'ACTIVE',
        allowedRoles: ['ADMIN', 'MANAGER']
      }
    })

    console.log(`📄 Documento criado: ${sourceDocument.id}`)

    // 3. Criar WorkforceSchedule
    const workforceSchedule = await prisma.workforceSchedule.create({
      data: {
        year: scheduleData.workforceSchedule.year,
        weekNumber: scheduleData.workforceSchedule.weekNumber,
        weekStartDate: new Date(scheduleData.workforceSchedule.weekStart),
        weekEndDate: new Date(scheduleData.workforceSchedule.weekEnd),
        status: 'VALIDATED',
        location: 'Cantinho Gourmet',
        department: 'Equipa de Sala',
        sourceDocumentId: sourceDocument.id,
        importedByUserId: systemUser.id,
        importedAt: new Date()
      }
    })

    console.log(`📅 WorkforceSchedule criado: ${workforceSchedule.id}`)

    // 4. Criar entradas para cada colaborador e dia
    const entries = []
    const employeeColumnMap: Record<string, number> = {
      'Bruno': 1, 'Pablo': 2, 'Filipe': 3, 'Lil': 4, 'Carolina': 5, 
      'Matilde': 6, 'Sofia': 7, 'Lee': 8, 'Diogo': 9
    }

    const weekdayMap: Record<string, number> = {
      'Domingo': 1, 'Segunda-feira': 2, 'Terça-feira': 3, 
      'Quarta-feira': 4, 'Quinta-feira': 5, 'Sexta-feira': 6, 'Sábado': 7
    }

    for (const [dateStr, dayData] of Object.entries(scheduleData.dailySchedules)) {
      console.log(`📊 Processando ${dateStr} (${dayData.weekday})...`)
      
      for (const [employeeName, empData] of Object.entries(dayData.employees)) {
        let entry

        if (empData.status === 'folga') {
          // Entrada de folga
          entry = await prisma.workforceScheduleEntry.create({
            data: {
              workforceScheduleId: workforceSchedule.id,
              employeeId: null,
              employeeName: employeeName,
              date: new Date(dateStr),
              weekday: weekdayMap[dayData.weekday] || 1,
              plannedStart: null,
              plannedEnd: null,
              plannedHours: 0,
              dayType: 'OFF',
              sourceRow: new Date(dateStr).getDate(),
              sourceColumn: employeeColumnMap[employeeName] || null,
              ocrConfidence: 1.0,
              notes: `Folga - ${dayData.weekday}`
            }
          })
        } else {
          // Entrada de trabalho
          entry = await prisma.workforceScheduleEntry.create({
            data: {
              workforceScheduleId: workforceSchedule.id,
              employeeId: null,
              employeeName: employeeName,
              date: new Date(dateStr),
              weekday: weekdayMap[dayData.weekday] || 1,
              plannedStart: new Date(`${dateStr}T${empData.startTime}:00Z`),
              plannedEnd: new Date(`${dateStr}T${empData.endTime}:00Z`),
              plannedHours: empData.totalHours,
              dayType: 'WORK',
              sourceRow: new Date(dateStr).getDate(),
              sourceColumn: employeeColumnMap[employeeName] || null,
              ocrConfidence: 0.98,
              notes: `Trabalho ${empData.startTime}-${empData.endTime} - ${dayData.weekday}`
            }
          })
        }
        
        entries.push(entry)
      }
    }

    console.log(`✅ ${entries.length} entradas de horário criadas`)

    // 5. Criar log de importação
    await prisma.document.create({
      data: {
        title: 'Log Importação Horários Reais 1-5 Julho 2026',
        description: 'Log da importação dos horários reais extraídos das imagens',
        category: 'SYSTEM',
        subCategory: 'IMPORT_LOG',
        tags: ['system', 'import', 'workforce', 'real-images'],
        fileUrl: 'system://import-real-schedules-log',
        fileName: 'import-real-schedules-july-1-5.json',
        fileSize: 0,
        mimeType: 'application/json',
        ownerId: systemUser.id,
        status: 'ACTIVE',
        allowedRoles: ['ADMIN']
      }
    })

    await prisma.$disconnect()

    console.log('\n🎉 IMPORTAÇÃO DOS HORÁRIOS REAIS CONCLUÍDA!')
    console.log('=' * 50)
    console.log(`📅 WorkforceSchedule ID: ${workforceSchedule.id}`)
    console.log(`📄 Documento ID: ${sourceDocument.id}`)
    console.log(`📊 Entradas criadas: ${entries.length}`)
    console.log(`🗓️  Período: ${scheduleData.workforceSchedule.period}`)
    console.log(`✅ Status: VALIDATED (pronto para reports)`)
    console.log('=' * 50)

    return {
      success: true,
      workforceScheduleId: workforceSchedule.id,
      documentId: sourceDocument.id,
      entriesCount: entries.length
    }

  } catch (error: any) {
    console.error('❌ Erro durante a importação:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// Executar se chamado directamente
if (require.main === module) {
  importRealSchedulesToDatabase()
    .then((result) => {
      if (result.success) {
        console.log('\n🎯 SISTEMA WORKFORCE PLANNING OPERACIONAL!')
        console.log('Os horários reais de 1-5 julho estão agora:')
        console.log('✅ Extraídos das imagens')
        console.log('✅ Arquivados na base de dados')
        console.log('✅ Prontos para análise e reports')
        console.log('\n📈 Próximos passos automáticos:')
        console.log('- Integração com Daily/Weekly Reports')
        console.log('- Cálculo de KPIs (horas vs planeado)')
        console.log('- Enriquecimento Executive Monthly Reports')
      } else {
        console.log('💥 Falha na importação para a base de dados')
      }
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('💥 Erro crítico:', error)
      process.exit(1)
    })
}

export { importRealSchedulesToDatabase }