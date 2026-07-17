# RIBBAI OPS — instruções para o Claude

## Gestão de stock (entradas, saídas, contagens semanais)

**Nunca escrevas um script novo por data/operação para registar stock.** Esse padrão (dezenas de scripts `record-stock-in-YYYY-MM-DD.ts`, agora em `scripts/database/_archive/`) já causou bugs reais e repetidos: SKUs duplicados, entradas que nunca chegaram a correr, stock inconsistente com as contagens físicas. Ver `docs/workflows/CURSOR-MASTER-PROMPT-stock-workflow.md` para o histórico completo desta reconstrução.

Usa sempre os scripts canónicos existentes em `scripts/stock/`:

```bash
npx tsx scripts/stock/apply-stock-entry.ts --file=<entrada.json>
npx tsx scripts/stock/apply-stock-exit.ts --file=<saida.json>
npx tsx scripts/stock/apply-weekly-count.ts --file=<contagem.json>
```

Formato de input em `scripts/stock/lib/schemas.ts`. Documentação completa do workflow (geração/fecho do relatório mensal, snapshots de fim de mês, manutenção) em `docs/workflows/monthly-inventory-report-workflow.md`.

Regras a não quebrar:
- Nunca escrever em `InventoryItem.currentStock` fora de uma transação Prisma que também grava a `InventoryTransaction` correspondente.
- Antes de criar um SKU novo, `apply-stock-entry.ts` já verifica se existe um artigo com o mesmo nome e bloqueia — se bloquear, usa o SKU existente em vez de contornar com `--force-new-sku`, a não ser que tenhas a certeza absoluta de que é um artigo diferente.
- Entradas/saídas/contagens com data retroativa (anterior a uma contagem já registada) são detetadas automaticamente (`scripts/stock/lib/backdating.ts`) e não alteram o stock atual do artigo — só ficam no histórico para efeitos de relatório. Um aviso `⚠` nesse caso é esperado, não é erro.
- Depois de qualquer alteração manual à BD (correções, merges de SKU), corre `npx tsx scripts/database/reconcile-current-stock.ts --apply` e `npm run inventory:validate-coherence -- --year=YYYY --month=MM`.
- SKU duplicado para o mesmo produto (mesmo nome, dois SKUs)? Usa `npx tsx scripts/database/merge-duplicate-sku.ts --from=<SKU_A_RETIRAR> --into=<SKU_CANONICO>` — nunca apagues o duplicado diretamente. **Lê o aviso no topo desse script antes de usar**: soma sempre os dois stocks, o que só está certo se eram duas reservas físicas separadas — se um SKU simplesmente substituiu o outro a meio do mês, confirma com quem faz as contagens antes de assumir que a soma está certa.
- Nunca corrigir um valor errado sobrescrevendo silenciosamente — usa sempre uma transação `ADJUSTMENT` nova a documentar a correção (ver padrão em `reconcile-current-stock.ts` e `merge-duplicate-sku.ts`).
- Health checks disponíveis a qualquer momento: `npx tsx scripts/database/reconcile-current-stock.ts` (dry-run), `npx tsx scripts/database/find-duplicate-skus.ts`, `npm run inventory:validate-coherence -- --year=YYYY --month=MM`.

## Antes de terminar qualquer alteração a este workflow

```bash
npm run typecheck
npm run lint
npm test
npx tsx scripts/database/reconcile-current-stock.ts
npx tsx scripts/database/find-duplicate-skus.ts
node scripts/validate-monthly-report-coherence.mjs --year=2026 --month=7
```
