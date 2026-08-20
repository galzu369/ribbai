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

## Custeio de cozinha (Preçário, menu, fichas técnicas, food cost, margens)

A área documental da Cozinha é `docs/kitchen/` (escalas, preçário, menu, fichas
técnicas, relatórios). Arquitetura: `docs/kitchen/costing/README.md`;
workflow: `docs/workflows/kitchen-costing-workflow.md`.

**Nunca preenchas preços à mão nas fichas técnicas nem cries links externos do
Excel entre workbooks** — os links por linha (`[1]Preçário!$E$132`) já
apontaram a artigos errados quando o Preçário foi reordenado. Usa sempre os
comandos canónicos:

```bash
npm run kitchen:costing:check    # dry-run
npm run kitchen:costing:update   # aplica + valida + gera relatório de execução
npm run kitchen:report           # relatório executivo HTML
npm run kitchen:report:pdf       # exporta o relatório para PDF
npm run kitchen:health           # health check de instalação/portabilidade
```

O sistema é **portátil**: corre em qualquer computador Windows onde a pasta
`RIBBAI` seja copiada por inteiro (o do Chefe de Cozinha, em particular). Nunca
escrevas caminhos absolutos nem dependentes do cwd em `scripts/kitchen/` —
resolve sempre a partir de `lib/project-root.ts` (ou `.mjs` para scripts ESM),
que sobe até ao marcador `.ribbai-root`. Os caminhos vivem em
`config/kitchen-costing.json` e têm de ser relativos.

O Chefe usa os launchers da raiz (`ATUALIZAR-FICHAS-TECNICAS.cmd`,
`VERIFICAR-FICHAS-TECNICAS.cmd`, `INSTALAR-SISTEMA-COZINHA.cmd`), que correm o
bundle em `runtime/`. **Depois de alterares o motor, corre
`npm run kitchen:runtime:build`** — senão o launcher continua a executar a versão
antiga do motor. Arquitetura e transferência em
`docs/kitchen/costing/documentation/INSTALLATION-GUIDE.md`.

Regras a não quebrar:
- Fonte de verdade dos preços de compra: `docs/kitchen/costing/price-lists/Preçário.xlsx`, colunas E (Preço s/IVA) e F (IVA). A coluna G (Preço c/IVA) é fórmula e **nunca** é fonte de custo. O script nunca modifica o Preçário.
- Fonte de verdade dos preços de venda, nomes comerciais e categorias: `docs/kitchen/costing/menu/menu-<ano>-<mês>.json`. IVA de venda 13% (fórmula `=Preço c/IVA ÷ 1,13` das próprias fichas).
- Custo de mercadoria calcula-se sempre **sem IVA** (`Quantidade × Preço s/IVA`); nas fichas, `F = D+(D×E)` é fórmula do template e não se preenche manualmente.
- Subreceitas recebem o `Custo Mercadoria s/Iva` da ficha origem — no mesmo workbook via fórmula Excel (`='Sú'!G9`), entre workbooks como valor gerido pelo script. Nunca somar de novo os ingredientes. Regra dose/lote: referência de fora da folha → dose; de dentro da própria folha → lote.
- Ingrediente sem correspondência inequívoca (UNMATCHED/AMBIGUOUS) **fica sem preço** e vai para o relatório — resolve-se em `mappings/ingredient-aliases.json` (com `confirmed: true`), nunca escolhendo silenciosamente o artigo "mais parecido". O mesmo para itens de menu sem ficha (`mappings/menu-item-aliases.json`).
- Alterações de receita: o Chefe edita ingredientes e quantidades **diretamente
  nas fichas** em `technical-sheets/`. `RECIPE_CORRECTIONS` / `QUANTITY_CORRECTIONS`
  em `scripts/kitchen/lib/config.ts` ficam vazios (modelo 2026-08-20) — só se
  usam se for preciso forçar uma correção auditável sem editar o xlsx.
- Linhas com `-` (Água, Óleo AR) são intencionalmente sem custo — não tocar.
- Os originais em `docs/kitchen/costing/archive/*_SOURCE.xlsx` nunca se modificam.

**Terminologia financeira (obrigatória).** `Preço Venda s/IVA − Custo Mercadoria
s/IVA` é **Margem Bruta sobre Mercadoria**, nunca "lucro", "lucro líquido",
"rentabilidade líquida", "resultado operacional" ou "EBITDA" — faltam mão de
obra, energia, renda, comissões, desperdício, amortizações e impostos. A escala
de food cost (Excelente <25% … Elevado >35%) é **indicador analítico**, não
política oficial RIBBAÍ. Sem dados de vendas não se faz Menu Engineering
(Star/Plowhorse/Puzzle/Dog) — só Cost & Margin Analysis.

## Antes de terminar qualquer alteração a este workflow

```bash
npm run typecheck
npm run lint
npm test
npx tsx scripts/database/reconcile-current-stock.ts
npx tsx scripts/database/find-duplicate-skus.ts
node scripts/validate-monthly-report-coherence.mjs --year=2026 --month=7
```
