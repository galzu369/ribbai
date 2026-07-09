/**
 * Processador Direto de Horários
 * Extrai horários baseado na correcção do utilizador
 */

import fs from 'fs'
import path from 'path'

function processRealSchedules() {
  console.log('🎯 Processando horários reais de 1-5 Julho 2026...')

  // Dados extraídos das imagens (corrigidos pelo utilizador)
  const scheduleData = {
    "2026-07-01": { // Quarta-feira
      date: "2026-07-01",
      weekday: "Quarta-feira",
      employees: {
        "Bruno": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Pablo": { status: "trabalho", startTime: "09:00", endTime: "18:00", totalHours: 8.0 },
        "Filipe": { status: "folga" },
        "Lil": { status: "folga" },
        "Carolina": { status: "folga" },
        "Matilde": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Sofia": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 },
        "Lee": { status: "trabalho", startTime: "09:00", endTime: "18:00", totalHours: 8.0 },
        "Diogo": { status: "folga" }
      }
    },
    "2026-07-02": { // Quinta-feira
      date: "2026-07-02",
      weekday: "Quinta-feira", 
      employees: {
        "Bruno": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Pablo": { status: "trabalho", startTime: "09:00", endTime: "18:00", totalHours: 8.0 },
        "Filipe": { status: "folga" },
        "Lil": { status: "folga" },
        "Carolina": { status: "trabalho", startTime: "09:00", endTime: "18:00", totalHours: 8.0 },
        "Matilde": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Sofia": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 },
        "Lee": { status: "folga" },
        "Diogo": { status: "folga" }
      }
    },
    "2026-07-03": { // Sexta-feira
      date: "2026-07-03",
      weekday: "Sexta-feira",
      employees: {
        "Bruno": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Pablo": { status: "folga" },
        "Filipe": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Lil": { status: "trabalho", startTime: "09:00", endTime: "18:00", totalHours: 8.0 },
        "Carolina": { status: "trabalho", startTime: "09:00", endTime: "18:00", totalHours: 8.0 },
        "Matilde": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 },
        "Sofia": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 },
        "Lee": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 },
        "Diogo": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 }
      }
    },
    "2026-07-04": { // Sábado
      date: "2026-07-04", 
      weekday: "Sábado",
      employees: {
        "Bruno": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Pablo": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 },
        "Filipe": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Lil": { status: "trabalho", startTime: "09:00", endTime: "18:00", totalHours: 8.0 },
        "Carolina": { status: "trabalho", startTime: "09:00", endTime: "18:00", totalHours: 8.0 },
        "Matilde": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Sofia": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 },
        "Lee": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 },
        "Diogo": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 }
      }
    },
    "2026-07-05": { // Domingo
      date: "2026-07-05",
      weekday: "Domingo", 
      employees: {
        "Bruno": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Pablo": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 },
        "Filipe": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Lil": { status: "trabalho", startTime: "09:00", endTime: "18:00", totalHours: 8.0 },
        "Carolina": { status: "trabalho", startTime: "09:00", endTime: "18:00", totalHours: 8.0 },
        "Matilde": { status: "trabalho", startTime: "12:30", endTime: "21:30", totalHours: 8.0 },
        "Sofia": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 },
        "Lee": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 },
        "Diogo": { status: "trabalho", startTime: "11:00", endTime: "20:00", totalHours: 8.0 }
      }
    }
  }

  // Calcular resumo semanal
  const employees = ["Bruno", "Pablo", "Filipe", "Lil", "Carolina", "Matilde", "Sofia", "Lee", "Diogo"]
  const summary: Record<string, any> = {}
  
  for (const employee of employees) {
    let totalHours = 0
    let workDays = 0
    
    for (const day of Object.values(scheduleData)) {
      const empData = day.employees[employee]
      if (empData.status === 'trabalho') {
        totalHours += empData.totalHours || 0
        workDays++
      }
    }
    
    summary[employee] = {
      totalHours: Math.round(totalHours * 10) / 10,
      workDays,
      restDays: 5 - workDays
    }
  }

  // Estrutura final
  const finalData = {
    workforceSchedule: {
      year: 2026,
      month: 7,
      weekNumber: 27,
      weekStart: "2026-07-01",
      weekEnd: "2026-07-05", 
      period: "1-5 Julho 2026",
      extractionMethod: "manual_correction_from_images",
      processedAt: new Date().toISOString(),
      status: "validated"
    },
    dailySchedules: scheduleData,
    summary: summary,
    extractionInfo: {
      method: "Image Analysis + Manual Validation",
      confidence: "HIGH",
      imagesProcessed: 3,
      employeesTotal: employees.length,
      daysProcessed: 5,
      corrections: [
        "Dia 1: Bruno trabalha 12:30-21:30, Pablo 09:00-18:00, Filipe/Lil/Carolina/Diogo folga",
        "Dia 2: Pablo/Carolina 09:00-18:00, Bruno/Matilde 12:30-21:30, Sofia 11:00-20:00, Filipe/Lee/Lil/Diogo folga",
        "Dia 3: Lil/Carolina 09:00-18:00, Matilde/Sofia/Lee/Diogo 11:00-20:00, Bruno/Filipe 12:30-21:30, Pablo folga",
        "Dia 4: Lil/Carolina 09:00-18:00, Pablo/Sofia/Lee/Diogo 11:00-20:00, Filipe/Bruno/Matilde 12:30-21:30",
        "Dia 5: Igual ao Dia 4, ninguém de folga"
      ]
    }
  }

  // Criar directório
  const outputDir = path.join(process.cwd(), 'workforce-schedules', '2026', 'julho')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Salvar ficheiro
  const outputFile = path.join(outputDir, 'schedule-1-5-julho-2026-final.json')
  fs.writeFileSync(outputFile, JSON.stringify(finalData, null, 2), 'utf-8')

  console.log('✅ Horários processados e salvos!')
  console.log(`📄 Ficheiro: ${outputFile}`)
  
  // Mostrar resumo
  console.log('\n📊 RESUMO SEMANAL:')
  console.log('==================')
  for (const [employee, data] of Object.entries(summary)) {
    console.log(`${employee}: ${data.totalHours}h (${data.workDays} dias trabalho, ${data.restDays} folgas)`)
  }

  return outputFile
}

// Executar
if (require.main === module) {
  try {
    const file = processRealSchedules()
    console.log('\n🎯 Próximo passo: Importar para base de dados')
    console.log(`   → Usar: ${file}`)
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1) 
  }
}

export { processRealSchedules }