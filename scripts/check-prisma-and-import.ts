/**
 * Script de Verificação e Importação Automática
 * 
 * Verifica se o Prisma Client está funcional e executa a importação dos dados de Julho 1-5
 */

import { importJuly15Schedule } from './import-july-1-5-when-prisma-ready'

async function checkPrismaAndImport() {
  console.log('🔍 Verificando estado do Prisma Client...')

  try {
    // Tentar importar o Prisma client
    const { prisma } = await import('../lib/db/client')
    
    console.log('✅ Prisma Client importado com sucesso')

    // Tentar fazer uma query simples para testar conectividade
    const userCount = await prisma.user.count()
    console.log(`✅ Conexão à base de dados OK (${userCount} utilizadores encontrados)`)

    // Verificar se os novos modelos estão disponíveis
    if (!prisma.workforceSchedule) {
      throw new Error('Modelo WorkforceSchedule não encontrado - Prisma Client precisa de ser regenerado')
    }
    
    if (!prisma.workforceScheduleEntry) {
      throw new Error('Modelo WorkforceScheduleEntry não encontrado - Prisma Client precisa de ser regenerado')  
    }

    console.log('✅ Modelos Workforce Planning detectados')

    // Verificar se já existe um horário importado para este período
    const existingSchedule = await prisma.workforceSchedule.findFirst({
      where: {
        year: 2026,
        weekNumber: 27
      }
    })

    if (existingSchedule) {
      console.log(`⚠️  Já existe um horário para a semana 27/2026 (ID: ${existingSchedule.id})`)
      console.log('Pretende substituir? [Esta verificação evita duplicados]')
      return {
        success: true,
        message: 'Prisma funcional, mas horário já existe',
        existingScheduleId: existingSchedule.id
      }
    }

    console.log('🚀 Prisma totalmente funcional! Iniciando importação...')
    
    // Executar a importação
    const result = await importJuly15Schedule()
    
    return {
      success: true,
      message: 'Prisma funcional e importação concluída',
      ...result
    }

  } catch (error: any) {
    console.error('❌ Problema detectado:')
    
    if (error.message.includes('Cannot find module')) {
      console.error('   → Prisma Client não gerado. Execute: npm run db:generate')
      return {
        success: false,
        issue: 'PRISMA_NOT_GENERATED',
        solution: 'npm run db:generate && npm run db:push'
      }
    }
    
    if (error.message.includes('WorkforceSchedule')) {
      console.error('   → Modelos Workforce Planning não encontrados. Execute: npm run db:generate')
      return {
        success: false,
        issue: 'WORKFORCE_MODELS_MISSING', 
        solution: 'npm run db:generate && npm run db:push'
      }
    }

    if (error.code === 'P1001') {
      console.error('   → Não foi possível conectar à base de dados')
      return {
        success: false,
        issue: 'DATABASE_CONNECTION',
        solution: 'Verificar configuração da base de dados no .env'
      }
    }

    console.error('   → Erro inesperado:', error.message)
    return {
      success: false,
      issue: 'UNKNOWN_ERROR',
      error: error.message
    }
  }
}

// Executar se chamado directamente
if (require.main === module) {
  checkPrismaAndImport()
    .then((result) => {
      console.log('\n📋 RESULTADO FINAL:')
      console.log('==================')
      
      if (result.success) {
        console.log('✅', result.message)
        if (result.workforceScheduleId) {
          console.log(`🎯 WorkforceSchedule ID: ${result.workforceScheduleId}`)
          console.log(`📄 Document ID: ${result.documentId}`)
          console.log(`📊 Entradas criadas: ${result.entriesCount}`)
        }
      } else {
        console.log('❌', result.issue)
        console.log('🔧 Solução:', result.solution)
      }
      
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('💥 Erro crítico:', error)
      process.exit(1)
    })
}

export { checkPrismaAndImport }