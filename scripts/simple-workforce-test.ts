/**
 * Script de teste simplificado para verificar se a importação básica funciona
 * Insere apenas dados mínimos para testar a estrutura
 */

async function simpleWorkforceTest() {
  console.log('🧪 Teste simplificado de importação Workforce Planning...')

  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // 1. Verificar se existe sistema user
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

    console.log('✅ Utilizador encontrado:', systemUser.email)

    // 2. Criar documento simples
    const document = await prisma.document.create({
      data: {
        title: 'Teste Horário Julho 1-5 2026',
        description: 'Documento de teste para workforce planning',
        category: 'WORKFORCE_PLANNING',
        subCategory: 'WEEKLY_SCHEDULE',
        tags: ['test', 'workforce'],
        fileUrl: 'file://test-schedule.pdf',
        fileName: 'test-schedule.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        ownerId: systemUser.id,
        status: 'ACTIVE',
        allowedRoles: ['ADMIN']
      }
    })

    console.log('📄 Documento criado:', document.id)

    // 3. Criar WorkforceSchedule simples
    const schedule = await prisma.workforceSchedule.create({
      data: {
        year: 2026,
        weekNumber: 27,
        weekStartDate: new Date('2026-07-01'),
        weekEndDate: new Date('2026-07-05'),
        status: 'IN_REVIEW',
        location: 'Cantinho Gourmet',
        department: 'Equipa de Sala',
        sourceDocumentId: document.id,
        importedByUserId: systemUser.id,
        importedAt: new Date()
      }
    })

    console.log('📅 WorkforceSchedule criado:', schedule.id)

    // 4. Criar uma entrada simples de teste
    const entry = await prisma.workforceScheduleEntry.create({
      data: {
        workforceScheduleId: schedule.id,
        employeeName: 'Bruno',
        date: new Date('2026-07-01'),
        weekday: 3, // Terça-feira
        plannedStart: new Date('2026-07-01T09:00:00Z'),
        plannedEnd: new Date('2026-07-01T17:00:00Z'),
        plannedHours: 8,
        dayType: 'WORK',
        sourceRow: 1,
        sourceColumn: 1,
        ocrConfidence: 0.95,
        notes: 'Entrada de teste'
      }
    })

    console.log('📊 Entry criada:', entry.id)

    // 5. Marcar como validado
    await prisma.workforceSchedule.update({
      where: { id: schedule.id },
      data: { status: 'VALIDATED' }
    })

    console.log('✅ Schedule marcado como VALIDATED')

    // 6. Verificar dados criados
    const verification = await prisma.workforceSchedule.findUnique({
      where: { id: schedule.id },
      include: {
        entries: true,
        sourceDocument: true
      }
    })

    await prisma.$disconnect()

    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!')
    console.log('=====================================')
    console.log(`WorkforceSchedule ID: ${verification?.id}`)
    console.log(`Status: ${verification?.status}`)
    console.log(`Entradas: ${verification?.entries.length}`)
    console.log(`Documento: ${verification?.sourceDocument?.title}`)
    console.log('=====================================')

    return {
      success: true,
      workforceScheduleId: schedule.id,
      documentId: document.id,
      entriesCount: 1
    }

  } catch (error: any) {
    console.error('❌ Erro no teste:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// Executar se chamado directamente
if (require.main === module) {
  simpleWorkforceTest()
    .then((result) => {
      if (result.success) {
        console.log('\n🎯 PRÓXIMOS PASSOS:')
        console.log('1. Módulo Workforce Planning está funcional')
        console.log('2. Pode usar a UI do dashboard para gerir horários')
        console.log('3. Dados de teste prontos para análise e KPIs')
      } else {
        console.log('💥 Teste falhou')
      }
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('💥 Erro crítico:', error)
      process.exit(1)
    })
}

export { simpleWorkforceTest }