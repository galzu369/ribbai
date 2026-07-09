# Entrada de Mercadoria - Fecho Mensal
## 30 de Junho de 2026

---

### Informações Gerais

- **Data:** 30 de Junho de 2026
- **Tipo:** Entrada de Mercadoria (Fecho de Mês)
- **Referência:** RECEIPT-2026-06-30-MONTH-END
- **Fornecedor:** Fornecedor de Molhos (SAUCE-SUPPLIER)
- **Processado por:** OPS-AUTOMATION-MONTHLY-CLOSURE

---

### Entradas Processadas

#### 1. Ketchup (SAUCE-KETCHUP)

| Métrica | Valor Anterior | Movimento | Valor Novo |
|---------|----------------|-----------|------------|
| **Stock** | 1,5 caixa | +2 caixa | 3,5 caixa |
| **CMP** | 18,61 € | Recalculado | 13,55 € |
| **Valor Stock** | 27,92 € | +19,50 € | 47,42 € |

**Cálculo CMP:**
- Valor stock anterior: 1,5 × 18,61 = 27,92 €
- Valor entrada: 2 × 9,75 = 19,50 €
- Novo CMP: (27,92 + 19,50) ÷ (1,5 + 2) = 13,55 €

#### 2. Maionese (SAUCE-MAYONNAISE)

| Métrica | Valor Anterior | Movimento | Valor Novo |
|---------|----------------|-----------|------------|
| **Stock** | 3 caixa | +2 caixa | 5 caixa |
| **CMP** | 17,80 € | Recalculado | 14,21 € |
| **Valor Stock** | 53,40 € | +17,66 € | 71,06 € |

**Cálculo CMP:**
- Valor stock anterior: 3 × 17,80 = 53,40 €
- Valor entrada: 2 × 8,83 = 17,66 €
- Novo CMP: (53,40 + 17,66) ÷ (3 + 2) = 14,21 €

---

### Resumo Financeiro

| Artigo | Custo Unitário | Quantidade | Valor Total |
|--------|----------------|------------|-------------|
| Ketchup | 9,75 € | 2 caixas | 19,50 € |
| Maionese | 8,83 € | 2 caixas | 17,66 € |
| **TOTAL** | | **4 caixas** | **37,16 €** |

---

### Impactos nos Indicadores

#### Stock Valuation
- **Valor anterior:** 81,32 € (Ketchup: 27,92 € + Maionese: 53,40 €)
- **Valor entrada:** 37,16 €
- **Valor final:** 118,48 € (Ketchup: 47,42 € + Maionese: 71,06 €)
- **Aumento:** +37,16 € (+45,7%)

#### Níveis de Stock
- **Ketchup:** Stock aumentou 133% (1,5 → 3,5 caixas)
- **Maionese:** Stock aumentou 67% (3 → 5 caixas)

#### Custo Médio Ponderado
- **Ketchup:** CMP diminuiu 27% (18,61 → 13,55 €) - compra a preço mais baixo
- **Maionese:** CMP diminuiu 20% (17,80 → 14,21 €) - compra a preço mais baixo

---

### Documentos Atualizados

✅ **Base de Dados**
- InventoryItem: Stock e CMP atualizados
- InventoryTransaction: Registos de entrada criados
- Supplier: Fornecedor de molhos configurado

✅ **Relatórios**
- Relatório CMP diário (2026-06-30)
- Histórico de movimentos atualizado
- Stock valuation recalculada

✅ **Consistência**
- Stock físico = Stock contabilístico
- Movimentos registados no histórico
- CMP calculado automaticamente
- Valores financeiros reconciliados

---

### Observações Técnicas

1. **Sistema CMP:** Implementado automaticamente seguindo fórmula de custo médio ponderado
2. **Rastreabilidade:** Todas as transações mantêm referência cruzada com fornecedor e data
3. **Validação:** Unidades e quantidades validadas antes do processamento
4. **Backup:** Estado anterior preservado no histórico para auditoria

---

### Status Final

**ENTRADA PROCESSADA COM SUCESSO** ✅

- Data de processamento: 30/06/2026 12:00 UTC
- Consistência verificada: ✅
- Relatórios atualizados: ✅
- CMP recalculado: ✅
- Histórico registado: ✅

---

*Documento gerado automaticamente pelo sistema RIBBAI OPS*
*Referência: RECEIPT-2026-06-30-MONTH-END*