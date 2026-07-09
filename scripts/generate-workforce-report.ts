/**
 * Gerador de Relatório PDF - Workforce Planning
 * Gera relatório completo com dados e KPIs por funcionário
 */

import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'

interface EmployeeSchedule {
  status: string
  startTime?: string
  endTime?: string
  totalHours?: number
}

interface DaySchedule {
  date: string
  weekday: string
  employees: Record<string, EmployeeSchedule>
}

interface ScheduleData {
  workforceSchedule: {
    year: number
    month: number
    weekNumber: number
    weekStart: string
    weekEnd: string
    period: string
    extractionMethod: string
    processedAt: string
    status: string
  }
  dailySchedules: Record<string, DaySchedule>
  summary: Record<string, any>
}

async function generateWorkforceReport() {
  console.log('📊 Gerando Relatório PDF - Workforce Planning...')

  try {
    // 1. Ler dados estruturados
    const dataPath = path.join(process.cwd(), 'workforce-schedules', '2026', 'julho', 'schedule-1-5-julho-2026-final.json')
    const scheduleData: ScheduleData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

    // 2. Calcular KPIs detalhados por funcionário
    const employees = ["Bruno", "Pablo", "Filipe", "Lil", "Carolina", "Matilde", "Sofia", "Lee", "Diogo"]
    const employeeKPIs: Record<string, any> = {}

    for (const employee of employees) {
      const kpis = {
        totalHours: 0,
        workDays: 0,
        offDays: 0,
        averageHoursPerDay: 0,
        earliestStart: null as string | null,
        latestEnd: null as string | null,
        mostCommonShift: null as string | null,
        weeklyUtilization: 0,
        consecutiveWorkDays: 0,
        shiftPattern: [] as string[],
        dailyBreakdown: [] as any[]
      }

      // Analisar cada dia
      for (const [dateStr, dayData] of Object.entries(scheduleData.dailySchedules)) {
        const empData = dayData.employees[employee]
        
        if (empData.status === 'trabalho') {
          kpis.workDays++
          kpis.totalHours += empData.totalHours || 0
          kpis.shiftPattern.push(`${empData.startTime}-${empData.endTime}`)
          
          // Earliest start
          if (!kpis.earliestStart || (empData.startTime && empData.startTime < kpis.earliestStart)) {
            kpis.earliestStart = empData.startTime || null
          }
          
          // Latest end
          if (!kpis.latestEnd || (empData.endTime && empData.endTime > kpis.latestEnd)) {
            kpis.latestEnd = empData.endTime || null
          }
          
          kpis.dailyBreakdown.push({
            date: dateStr,
            weekday: dayData.weekday,
            start: empData.startTime,
            end: empData.endTime,
            hours: empData.totalHours,
            status: 'Trabalho'
          })
        } else {
          kpis.offDays++
          kpis.dailyBreakdown.push({
            date: dateStr,
            weekday: dayData.weekday,
            status: 'Folga'
          })
        }
      }

      // Calcular KPIs derivados
      kpis.averageHoursPerDay = kpis.workDays > 0 ? Math.round((kpis.totalHours / kpis.workDays) * 10) / 10 : 0
      kpis.weeklyUtilization = Math.round((kpis.workDays / 5) * 100)
      
      // Determinar padrão de turno mais comum
      const shiftCounts: Record<string, number> = {}
      kpis.shiftPattern.forEach(shift => {
        shiftCounts[shift] = (shiftCounts[shift] || 0) + 1
      })
      kpis.mostCommonShift = Object.keys(shiftCounts).reduce((a, b) => shiftCounts[a] > shiftCounts[b] ? a : b, '')

      employeeKPIs[employee] = kpis
    }

    // 3. Gerar HTML do relatório
    const html = generateReportHTML(scheduleData, employeeKPIs)

    // 4. Criar diretório de saída
    const outputDir = path.join(process.cwd(), 'docs', 'operational-records', '2026', '07-july', 'workforce-planning')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // 5. Salvar HTML temporário
    const htmlPath = path.join(outputDir, 'workforce-report-1-5-july-2026.html')
    fs.writeFileSync(htmlPath, html, 'utf-8')

    // 6. Gerar PDF
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    const pdfPath = path.join(outputDir, 'workforce-report-1-5-july-2026.pdf')
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    })

    await browser.close()

    console.log('✅ Relatório PDF gerado com sucesso!')
    console.log(`📄 Arquivo: ${pdfPath}`)
    console.log(`📁 Pasta: ${outputDir}`)
    
    return {
      success: true,
      pdfPath,
      htmlPath,
      outputDir
    }

  } catch (error: any) {
    console.error('❌ Erro ao gerar relatório:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

function generateReportHTML(scheduleData: ScheduleData, employeeKPIs: Record<string, any>): string {
  const currentDate = new Date().toLocaleDateString('pt-PT')
  
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório Workforce Planning - ${scheduleData.workforceSchedule.period}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: #f8f9fa;
            color: #333;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 2.5em;
        }
        .header .subtitle {
            color: #6c757d;
            font-size: 1.2em;
            margin: 10px 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .summary-card {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 1.1em;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
        }
        .employee-section {
            margin-bottom: 40px;
        }
        .employee-header {
            background: #e9ecef;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .employee-header h2 {
            margin: 0;
            color: #495057;
        }
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .kpi-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
            text-align: center;
        }
        .kpi-card .label {
            font-size: 0.9em;
            color: #6c757d;
            margin-bottom: 5px;
        }
        .kpi-card .value {
            font-size: 1.4em;
            font-weight: bold;
            color: #007bff;
        }
        .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .schedule-table th,
        .schedule-table td {
            border: 1px solid #dee2e6;
            padding: 8px 12px;
            text-align: left;
        }
        .schedule-table th {
            background: #007bff;
            color: white;
            font-weight: 600;
        }
        .schedule-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .status-work {
            color: #28a745;
            font-weight: bold;
        }
        .status-off {
            color: #dc3545;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 0.9em;
        }
        .page-break {
            page-break-before: always;
        }
        .employee-section {
            page-break-inside: avoid;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RELATÓRIO WORKFORCE PLANNING</h1>
            <div class="subtitle">${scheduleData.workforceSchedule.period}</div>
            <div class="subtitle">Semana ${scheduleData.workforceSchedule.weekNumber} • ${scheduleData.workforceSchedule.year}</div>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>Total de Funcionários</h3>
                <div class="value">9</div>
            </div>
            <div class="summary-card">
                <h3>Dias Analisados</h3>
                <div class="value">5</div>
            </div>
            <div class="summary-card">
                <h3>Total de Entradas</h3>
                <div class="value">45</div>
            </div>
            <div class="summary-card">
                <h3>Horas Totais Planeadas</h3>
                <div class="value">${Object.values(employeeKPIs).reduce((sum: number, emp: any) => sum + emp.totalHours, 0)}h</div>
            </div>
        </div>

        ${Object.entries(employeeKPIs).map(([employee, kpis], index) => `
            <div class="employee-section ${index === 0 ? 'page-break' : (index > 1 ? 'page-break' : '')}">
                <div class="employee-header">
                    <h2>👤 ${employee}</h2>
                </div>
                
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="label">Horas Totais</div>
                        <div class="value">${kpis.totalHours}h</div>
                    </div>
                    <div class="kpi-card">
                        <div class="label">Dias de Trabalho</div>
                        <div class="value">${kpis.workDays}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="label">Dias de Folga</div>
                        <div class="value">${kpis.offDays}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="label">Média Horas/Dia</div>
                        <div class="value">${kpis.averageHoursPerDay}h</div>
                    </div>
                    <div class="kpi-card">
                        <div class="label">Utilização Semanal</div>
                        <div class="value">${kpis.weeklyUtilization}%</div>
                    </div>
                    <div class="kpi-card">
                        <div class="label">Entrada Mais Cedo</div>
                        <div class="value">${kpis.earliestStart || 'N/A'}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="label">Saída Mais Tarde</div>
                        <div class="value">${kpis.latestEnd || 'N/A'}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="label">Turno Mais Comum</div>
                        <div class="value">${kpis.mostCommonShift || 'N/A'}</div>
                    </div>
                </div>

                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Dia da Semana</th>
                            <th>Status</th>
                            <th>Entrada</th>
                            <th>Saída</th>
                            <th>Horas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${kpis.dailyBreakdown.map((day: any) => `
                            <tr>
                                <td>${new Date(day.date).toLocaleDateString('pt-PT')}</td>
                                <td>${day.weekday}</td>
                                <td class="${day.status === 'Trabalho' ? 'status-work' : 'status-off'}">${day.status}</td>
                                <td>${day.start || '-'}</td>
                                <td>${day.end || '-'}</td>
                                <td>${day.hours || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}

        <div class="footer">
            <p>Relatório gerado automaticamente pelo sistema RIBBAI • ${currentDate}</p>
            <p>Fonte: Extração de imagens reais • Método: ${scheduleData.workforceSchedule.extractionMethod}</p>
            <p>Status: ${scheduleData.workforceSchedule.status} • Processado em: ${new Date(scheduleData.workforceSchedule.processedAt).toLocaleString('pt-PT')}</p>
        </div>
    </div>
</body>
</html>
  `
}

// Executar se chamado diretamente
if (require.main === module) {
  generateWorkforceReport()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 RELATÓRIO PDF GERADO COM SUCESSO!')
        console.log('='* 50)
        console.log(`📁 Pasta: ${result.outputDir}`)
        console.log(`📄 PDF: ${result.pdfPath}`)
        console.log(`🌐 HTML: ${result.htmlPath}`)
        console.log('='* 50)
      } else {
        console.log(`❌ Erro: ${result.error}`)
      }
    })
    .catch((error) => {
      console.error('💥 Erro crítico:', error)
    })
}

export { generateWorkforceReport }