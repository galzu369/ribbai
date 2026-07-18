# Inventory Entry Record - 2026-07-18

## Resumo da Operacao

| Campo | Valor |
| --- | --- |
| Data | 2026-07-18 |
| Referencia | STOCK-IN-2026-07-18-CONSUMABLES-DELIVERY |
| Reference type | SUPPLIER_DELIVERY |
| Autor | USER_CONFIRMATION |
| Artigos atualizados | 1 |
| Fornecedor | Fornecedor de Consumiveis a Definir |
| Valor total da entrada | 42.30 € |

## Artigos

| Artigo | SKU | Movimento | Stock final | Observacoes |
| --- | --- | --- | --- | --- |
| Maionese | SAUCE-MAYONNAISE | +3 caixa | 3 caixa | Entrada de 18/07/2026 confirmada pelo responsavel. |

## Workflow Executado

Esta operacao seguiu o workflow canonico RIBBAI (`scripts/stock/apply-*`):
- Escrita atomica de `InventoryItem.currentStock` e `InventoryTransaction` na mesma transacao Prisma.
- Guarda de coerencia pos-escrita confirmada (`currentStock === balanceAfter`).
- Documentacao gerada automaticamente a partir dos mesmos dados gravados na base de dados.
