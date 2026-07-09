# Conversão de Unidade - Rolos de Impressora

**Data:** 01 de Julho de 2026  
**Tipo:** Conversão de Unidade de Medida  
**Responsável:** Bruno  
**Sistema:** RIBBAI Inventory Management  

## Resumo Executivo

Conversão da unidade de medida do artigo **"Rolos de Impressora"** (SKU: `CONS-OPS-PRINTER-ROLLS`) de **"saco"** para **"caixa"**, mantendo o valor total do inventário inalterado e assegurando a continuidade operacional.

## Detalhes da Conversão

### Artigo Afetado
- **SKU:** CONS-OPS-PRINTER-ROLLS
- **Nome:** Rolos de Impressora
- **Categoria:** Consumiveis → Consumiveis Operacionais

### Conversão Realizada

| Parâmetro | Valor Anterior | Valor Novo | Observações |
|-----------|----------------|------------|-------------|
| **Unidade de Medida** | saco | caixa | Fator: 1 caixa = 5 sacos |
| **Quantidade em Stock** | 25 sacos | 5 caixas | 25 ÷ 5 = 5 |
| **Preço Unitário** | 7,93 €/saco | 39,65 €/caixa | 7,93 × 5 = 39,65 |
| **Valor do Stock** | 198,25 € | 198,25 € | **Inalterado** |
| **Stock Mínimo** | 10 sacos | 2 caixas | Ajustado proporcionalmente |
| **Ponto de Reposição** | 10 sacos | 2 caixas | Ajustado proporcionalmente |

### Validação Financeira

```
Antes da conversão:
25 sacos × 7,93 €/saco = 198,25 €

Após a conversão:
5 caixas × 39,65 €/caixa = 198,25 €

✅ Diferença: 0,00 € (valor preservado)
```

## Justificação Técnica

### Contexto
O artigo foi originalmente configurado em "caixa" no sistema, mas foi convertido para "saco" em 24/06/2026 para facilitar a contagem operacional. Após análise dos processos operacionais, determinou-se que a gestão por "caixa" é mais eficiente para:

1. **Compras:** Fornecedores vendem por caixas
2. **Armazenamento:** Stock organizado em caixas
3. **Controlo:** Redução de erros de contagem
4. **Relatórios:** Alinhamento com outros consumíveis

### Fator de Conversão
- **Equivalência:** 1 caixa = 5 sacos
- **Fonte:** Especificações do fornecedor e histórico de entregas
- **Validação:** Confirmado em múltiplas entregas anteriores

## Implementação Técnica

### Scripts Executados

#### 1. Script Principal de Conversão
```bash
node scripts/database/convert-printer-rolls-unit-2026-07-01.ts
```

**Operações realizadas:**
- Verificação do estado atual do artigo
- Cálculo da conversão preservando o valor do stock
- Atualização da unidade de medida
- Recálculo do CMP (Custo Médio Ponderado)
- Criação de transação de auditoria
- Atualização dos thresholds de stock

#### 2. Validação Pós-Conversão
```bash
node scripts/validation/validate-printer-rolls-conversion.ts
```

**Verificações:**
- Unidade de medida = "caixa"
- Quantidade = 5 caixas
- Preço = 39,65 €/caixa
- Valor total = 198,25 €
- Thresholds ajustados corretamente
- Nenhum outro artigo afetado

### Componentes Atualizados

#### Base de Dados
- **Tabela:** `inventory_items`
  - `unit`: "saco" → "caixa"
  - `currentStock`: 25 → 5
  - `costPrice`: 7.93 → 39.65
  - `minimumStock`: 10 → 2
  - `reorderPoint`: 10 → 2

- **Tabela:** `inventory_transactions`
  - Nova transação tipo `ADJUSTMENT` para auditoria

#### Sistema CMP
- **Arquivo:** `lib/inventory-cmp.ts`
- **Adição:** Função `convertUnitWithCMP()` para futuras conversões
- **Funcionalidade:** Preservação do valor do stock durante conversões

#### Relatórios
- **Arquivo:** `scripts/generate-monthly-consumables-report-pdf.mjs`
- **Atualização:** Lógica para suportar nova unidade "caixa"
- **Backward compatibility:** Mantida para relatórios históricos

#### Templates
- **Arquivos:** 
  - `scripts/database/enhanced-stock-in-template.ts`
  - `scripts/database/stock-exit-cmp-template.ts`
- **Atualização:** Comentários indicando nova unidade padrão

## Auditoria e Rastreabilidade

### Transação de Auditoria
- **ID:** UNIT-CONVERSION-2026-07-01-PRINTER-ROLLS
- **Tipo:** ADJUSTMENT
- **Data:** 2026-07-01 14:00:00 UTC
- **Quantidade:** 0 (conversão de unidade)
- **Valor:** 0,00 € (sem impacto financeiro)
- **Observações:** Conversão completa documentada na transação

### Logs do Sistema
```
[2026-07-01T14:00:00.000Z] INFO: Unit conversion completed successfully
{
  "referenceId": "UNIT-CONVERSION-2026-07-01-PRINTER-ROLLS",
  "sku": "CONS-OPS-PRINTER-ROLLS",
  "oldUnit": "saco",
  "newUnit": "caixa",
  "oldStock": "25",
  "newStock": "5",
  "stockValue": "198.25"
}
```

## Impactos Operacionais

### Sistemas Afetados
- ✅ **Inventário:** Atualizado automaticamente
- ✅ **Relatórios:** Suportam nova unidade
- ✅ **APIs:** Sem impacto (dados dinâmicos)
- ✅ **Dashboards:** Refletem automaticamente
- ✅ **Alertas:** Thresholds recalculados

### Processos Operacionais
1. **Contagem Física:** Próximas contagens em caixas
2. **Pedidos de Compra:** Unidade padrão = "caixa"
3. **Entregas:** Registo direto em caixas
4. **Consumos:** Saídas contabilizadas em caixas

## Testes e Validação

### Testes Automatizados
```
✅ PASS Unidade de Medida (caixa)
✅ PASS Stock Atual (5,000)
✅ PASS Preço Unitário (39,65€)
✅ PASS Valor do Stock (198,25€)
✅ PASS Stock Mínimo (2,000)
✅ PASS Ponto de Reposição (2,000)
✅ PASS Custo Médio Válido
✅ PASS Cálculo do Valor do Stock
✅ PASS Transação de Conversão
✅ PASS Outros Artigos Inalterados

RESUMO: 10 testes passaram, 0 falharam
✅ CONVERSÃO VALIDADA COM SUCESSO
```

### Testes Manuais
- [x] Interface de gestão de inventário
- [x] Relatório mensal de consumíveis  
- [x] Dashboard de analytics financeiros
- [x] Alertas de stock baixo
- [x] API de inventário

## Rollback Plan

Em caso de necessidade de reversão:

### Script de Rollback (se necessário)
```typescript
// Reverter para "saco"
const rollbackData = {
  unit: "saco",
  currentStock: new Prisma.Decimal("25"), // 5 × 5
  costPrice: new Prisma.Decimal("7.93"),
  minimumStock: new Prisma.Decimal("10"),
  reorderPoint: new Prisma.Decimal("10"),
};
```

### Condições para Rollback
- Problemas críticos nos relatórios
- Erros nos cálculos de CMP
- Incompatibilidade com sistemas externos
- **Prazo limite:** 7 dias após implementação

## Próximos Passos

### Monitorização (Próximas 2 semanas)
1. **Relatórios:** Verificar geração automática
2. **Contagens:** Validar em próximas contagens físicas
3. **Compras:** Confirmar pedidos em caixas
4. **Consumos:** Validar registos de saídas

### Melhorias Futuras
1. **Automatização:** Integrar conversões no sistema
2. **Interface:** Facilitar conversões de unidades
3. **Documentação:** Procedimentos para futuras conversões
4. **Training:** Formar equipa nas novas unidades

## Contactos e Responsáveis

| Função | Responsável | Contacto |
|--------|-------------|----------|
| **Implementação Técnica** | Bruno | Sistema RIBBAI |
| **Validação Operacional** | Equipa Operacional | - |
| **Auditoria Financeira** | Gestão Financeira | - |

---

**Documento gerado automaticamente pelo sistema RIBBAI**  
**Última atualização:** 2026-07-01 14:10:00 UTC  
**Versão:** 1.0  

---

## Anexos

### A. Configuração Anterior (24/06/2026)
```json
{
  "sku": "CONS-OPS-PRINTER-ROLLS",
  "unit": "saco",
  "currentStock": "25",
  "costPrice": "7.93",
  "minimumStock": "10",
  "reorderPoint": "10"
}
```

### B. Configuração Atual (01/07/2026)
```json
{
  "sku": "CONS-OPS-PRINTER-ROLLS", 
  "unit": "caixa",
  "currentStock": "5",
  "costPrice": "39.65",
  "averageCost": "39.65",
  "stockValue": "198.25",
  "minimumStock": "2",
  "reorderPoint": "2"
}
```

### C. Equivalências de Referência
- **1 caixa** = 5 sacos
- **2 caixas** = 10 sacos (stock mínimo)
- **5 caixas** = 25 sacos (stock atual)
- **10 caixas** = 50 sacos (stock máximo recomendado)

---
*Fim do documento*