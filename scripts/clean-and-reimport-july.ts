/**
 * Script para limpar e reimportar os dados de Julho 1-5 2026
 * Remove registos existentes e faz importação limpa
 */

import { importJuly15Schedule } from './import-july-1-5-when-prisma-ready'

async function cleanAndReimport() {
  console.log('🧹 Limpando registos existentes e reimportando...')

  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // 1. Encontrar WorkforceSchedule existente para a semana 27/2026
    const existingSchedule = await prisma.workforceSchedule.findFirst({
      where: {
        year: 2026,
        weekNumber: 27
      },
      include: {
        entries: true,
        sourceDocument: true
      }
    })

    if (existingSchedule) {
      console.log(`🗑️  Removendo WorkforceSchedule existente: ${existingSchedule.id}`)
      
      // 2. Remover entradas relacionadas (cascade deve fazer isso automaticamente)
      const entriesCount = await prisma.workforceScheduleEntry.count({
        where: { workforceScheduleId: existingSchedule.id }
      })
      
      if (entriesCount > 0) {
        await prisma.workforceScheduleEntry.deleteMany({
          where: { workforceScheduleId: existingSchedule.id }
        })
        console.log(`✅ ${entriesCount} entradas removidas`)
      }

      // 3. Remover WorkforceSchedule primeiro 
      await prisma.workforceSchedule.delete({
        where: { id: existingSchedule.id }
      })
      
      console.log('✅ WorkforceSchedule removido')

      // 4. Depois remover documento relacionado
      if (existingSchedule.sourceDocumentId) {
        await prisma.document.delete({
          where: { id: existingSchedule.sourceDocumentId }
        })
        console.log(`🗑️  Documento fonte removido: ${existingSchedule.sourceDocumentId}`)
      }
    } else {
      console.log('ℹ️  Nenhum registo existente encontrado')
    }

    await prisma.$disconnect()

    // 5. Executar importação limpa
    console.log('\n🚀 Iniciando importação limpa...')
    const result = await importJuly15Schedule()
    
    return result

  } catch (error: any) {
    console.error('❌ Erro durante limpeza/reimportação:', error.message)
    return { success: false, error: error.message }
  }
}

// Executar se chamado directamente
if (require.main === module) {
  cleanAndReimport()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 REIMPORTAÇÃO CONCLUÍDA COM SUCESSO!')
        console.log(`📅 WorkforceSchedule: ${result.workforceScheduleId}`)
        console.log(`📄 Documento: ${result.documentId}`)
        console.log(`📊 Entradas: ${result.entriesCount}`)
      } else {
        console.log('\n❌ Falha na reimportação')
      }
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('💥 Erro crítico:', error)
      process.exit(1)
    })
}

export { cleanAndReimport }