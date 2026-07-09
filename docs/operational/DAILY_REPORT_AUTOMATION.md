# Sistema de Geração Automática de Relatórios Diários com Overtime

## Visão Geral

O sistema RIBBAI OPS agora inclui funcionalidade de atualização automática dos relatórios mensais de overtime sempre que um novo relatório diário operacional é processado.

## Como Funciona

Quando geramos um relatório diário operacional, o sistema:
1. **Gera o PDF do relatório diário** usando os dados estruturados
2. **Atualiza automaticamente** o relatório mensal de overtime para esse mês
3. **Consolida todas as horas extra** registadas nos relatórios diários do mês

## Métodos de Uso

### 1. Script NPM (Recomendado)
```bash
npm run reports:daily:with-overtime -- --date=YYYY-MM-DD
```

**Exemplos:**
```bash
# Processar relatório de 1 de julho
npm run reports:daily:with-overtime -- --date=2026-07-01

# Processar relatório de 15 de agosto  
npm run reports:daily:with-overtime -- --date=2026-08-15
```

### 2. Script Direto
```bash
node scripts/generate-daily-report-with-overtime-update.mjs --date=YYYY-MM-DD
```

### 3. Scripts Separados (Processo Manual)
```bash
# Apenas PDF diário
node scripts/generate-daily-operational-report-pdf.mjs --date=YYYY-MM-DD

# Apenas overtime mensal
node scripts/generate-monthly-overtime-report-pdf.mjs --period=YYYY-MM
```

## Outputs Gerados

### Relatório Diário
- **Localização**: `docs/operational-records/YYYY/MM-monthname/daily/`
- **Ficheiros**: 
  - `YYYY-MM-DD-registo-diario-operacional.md` (fonte)
  - `YYYY-MM-DD-registo-diario-operacional.html` (visualização)
  - `YYYY-MM-DD-registo-diario-operacional.pdf` (final)

### Relatório de Overtime Mensal
- **Localização**: `reports/overtime/`
- **Ficheiro**: `ribbai-overtime-report-YYYY-MM.pdf`
- **Conteúdo**: 
  - Tabela semanal de horas extra por colaborador
  - Totais mensais consolidados
  - Evidências source de cada entrada
  - Estatísticas do mês

## Dados Processados

O sistema extrai automaticamente das secções "Overtime Input" dos relatórios diários:
- **Nome do colaborador**
- **Número de horas extra**
- **Motivo/observação**
- **Data de registo**

## Exemplo de Fluxo

1. **Input**: Relatório diário estruturado para 03-07-2026
2. **Processo**: 
   - ✅ Gera PDF diário
   - ✅ Escaneia todos os relatórios de julho
   - ✅ Consolida horas extra por colaborador
   - ✅ Atualiza `ribbai-overtime-report-2026-07.pdf`
3. **Output**: 
   - Relatório diário atualizado
   - Relatório mensal de overtime atualizado

## Integração com Workflow

### Para Novos Relatórios Diários
Sempre usar o script integrado para garantir que o overtime mensal fica atualizado:

```bash
npm run reports:daily:with-overtime -- --date=2026-07-04
```

### Para Correções/Atualizações
Se alterar um relatório diário existente, execute novamente para atualizar o overtime:

```bash
npm run reports:daily:with-overtime -- --date=2026-07-01
```

## Compatibilidade

- ✅ **Sistema ETL**: Dados estruturados mantêm compatibilidade
- ✅ **Scripts existentes**: Todos os scripts anteriores continuam funcionais  
- ✅ **Relatórios semanais**: Sistema de candidatos preservado
- ✅ **Base de dados**: Formato de dados mantido para futura integração

## Troubleshooting

### Erro "Invalid date format"
- Usar sempre formato `YYYY-MM-DD`
- Exemplo correto: `2026-07-04`

### Relatório de overtime não atualizado
- Verificar se existem relatórios diários no mês especificado
- Confirmar que as secções "Overtime Input" estão presentes e formatadas

### PDF não gerado
- Verificar se os ficheiros `.html` existem antes de gerar PDF
- Confirmar que o Puppeteer está funcionalmente instalado

## Estado Atual do Sistema

✅ **Julho 2026**: 3 dias processados (01, 02, 03)
- Total horas extra: ~20h30 registadas
- Relatório mensal: `ribbai-overtime-report-2026-07.pdf`
- Próximo: Continuar processamento de julho