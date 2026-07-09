/**
 * Script para criar tabelas do Workforce Planning via Prisma Raw SQL
 * Bypassa os conflitos de enums executando SQL directamente
 */

import fs from 'fs'
import path from 'path'

async function createWorkforceTables() {
  console.log('🔧 Criando tabelas do Workforce Planning via SQL directo...')

  try {
    // Importar Prisma client (mesmo que os novos modelos não existam)
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // Ler o script SQL
    const sqlPath = path.join(process.cwd(), 'scripts', 'create-workforce-tables.sql')
    const sqlScript = fs.readFileSync(sqlPath, 'utf-8')

    // Dividir o script em statements individuais (remover comentários e linhas vazias)
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .filter(stmt => !stmt.startsWith('/*') && !stmt.startsWith('COMMENT'))

    console.log(`📄 Encontradas ${statements.length} statements SQL para executar`)

    // Executar cada statement individualmente
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      try {
        console.log(`⚙️  Executando statement ${i + 1}/${statements.length}...`)
        
        // Executar SQL raw
        await prisma.$executeRawUnsafe(statement)
        
        console.log(`✅ Statement ${i + 1} executada com sucesso`)
        
      } catch (error: any) {
        // Ignorar erros de "já existe" mas falhar em outros erros
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('already defined')) {
          console.log(`⚠️  Statement ${i + 1} - Elemento já existe (ignorado)`)
        } else {
          console.error(`❌ Erro na statement ${i + 1}:`, error.message)
          throw error
        }
      }
    }

    // Verificar se as tabelas foram criadas
    console.log('\n🔍 Verificando tabelas criadas...')
    
    const tableCheck = await prisma.$queryRaw`
      SELECT 
        table_name,
        CASE WHEN table_name IS NOT NULL THEN true ELSE false END as exists
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('workforce_schedules', 'workforce_schedule_entries', 'workforce_schedule_breaks')
      ORDER BY table_name
    `

    console.log('📊 Status das tabelas:')
    console.log(tableCheck)

    // Verificar enums criados
    const enumCheck = await prisma.$queryRaw`
      SELECT 
        typname as enum_name,
        array_agg(enumlabel order by enumsortorder) as values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE typname IN ('WorkforceScheduleStatus', 'WorkforceDayType')
      GROUP BY typname
      ORDER BY typname
    `

    console.log('🏷️  Enums criados:')
    console.log(enumCheck)

    await prisma.$disconnect()

    console.log('\n✅ TABELAS DO WORKFORCE PLANNING CRIADAS COM SUCESSO!')
    
    return {
      success: true,
      message: 'Tabelas criadas via SQL directo',
      tables: tableCheck,
      enums: enumCheck
    }

  } catch (error: any) {
    console.error('❌ Erro ao criar tabelas:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// Executar se chamado directamente
if (require.main === module) {
  createWorkforceTables()
    .then((result) => {
      if (result.success) {
        console.log('🎯 Próximo passo: executar o script de importação dos dados de Julho 1-5')
        console.log('   → npx tsx scripts/check-prisma-and-import.ts')
      } else {
        console.log('💥 Falha na criação das tabelas')
      }
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('💥 Erro crítico:', error)
      process.exit(1)
    })
}

export { createWorkforceTables }