# Inventory Entry Record - 2026-07-03

## Resumo da Operacao

| Campo | Valor |
| --- | --- |
| Data | 2026-07-03 |
| Referencia | STOCK-IN-2026-07-03-CONSUMABLES-DELIVERY-COMPLEMENTO |
| Reference type | SUPPLIER_DELIVERY |
| Autor | USER_CONFIRMATION |
| Artigos atualizados | 13 |
| Fornecedor | Fornecedor de Consumiveis a Definir |
| Valor total da entrada | 527.15 € |

## Artigos

| Artigo | SKU | Movimento | Stock final | Observacoes |
| --- | --- | --- | --- | --- |
| Dish Lemon | CLEAN-DISH-LEMON | +8 unidade | 15 unidade | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto. |
| Guardanapos Pequenos | CONS-SERVICE-SMALL-NAPKINS | +2 caixa | 3 caixa | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto (o rascunho original usava CONS-SERVICE-NAPKINS-SMALL, um SKU fantasma sem uso). |
| Rolos de Etiquetas | CONS-OPS-LABEL-ROLLS | +2 pack | 7.5 pack | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto. |
| Lava-Tudo | CLEAN-LAVA-TUDO | +4 unidade | 12 unidade | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto. |
| Lava-Louça Universal | CLEAN-LAVA-LOUCAS | +1 unidade | 4 unidade | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto (o rascunho original usava CLEAN-DISH-UNIVERSAL, ja consolidado neste SKU). |
| Abrilhantador/Secante SPLIT LV | CLEAN-SPLIT-LV-RINSE | +2 unidade | 5 unidade | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto. |
| Esfregão INOX | CLEAN-SPONGE-INOX | +2 pack | 3 pack | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto. |
| Esfregão | CLEAN-SPONGE-REGULAR | +2 pack | 3 pack | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto. |
| Copos Pequenos Take Away + Tampas | CONS-TAKEAWAY-CUPS-SMALL | +20 saco | 20 saco | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto. Artigo estava inativo (nunca teve entrada) e foi reativado por esta entrada. |
| Copos Medios Take Away + Tampas | CONS-TAKEAWAY-MEDIUM-CUPS-LIDS | +20 saco | 28 saco | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto (o rascunho original usava CONS-TAKEAWAY-CUPS-MEDIUM, ja consolidado neste SKU). |
| Thomil | CLEAN-THOMIL | +4 unidade | 11 unidade | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto. |
| D-50 | CLEAN-D-50 | +4 unidade | 9 unidade | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente com o SKU correto (o rascunho original usava CLEAN-D50, ja consolidado neste SKU). |
| Espuma Antibacteriana | CLEAN-ANTIBACTERIAL-FOAM | +12 unidade | 23 unidade | Entrada de 03/07/2026 confirmada pelo responsavel, registada retroativamente. |

## Workflow Executado

Esta operacao seguiu o workflow canonico RIBBAI (`scripts/stock/apply-*`):
- Escrita atomica de `InventoryItem.currentStock` e `InventoryTransaction` na mesma transacao Prisma.
- Guarda de coerencia pos-escrita confirmada (`currentStock === balanceAfter`).
- Documentacao gerada automaticamente a partir dos mesmos dados gravados na base de dados.
