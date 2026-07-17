# Master Prompt — Reconstruir o Workflow de Stock (Entradas / Saídas / Contagens)

> Cola este documento inteiro como prompt no Cursor, dentro do repositório RIBBAI. Foi escrito depois de uma auditoria real ao sistema (16-17/07/2026) que confirmou inconsistências concretas na base de dados — não é um exercício teórico.

## 1. Contexto

O RIBBAI OPS gere stock de consumíveis via Next.js + Prisma + PostgreSQL (`prisma/schema.prisma`, modelos `InventoryItem` e `InventoryTransaction`). O relatório mensal de consumíveis (`scripts/generate-monthly-consumables-report-pdf.mjs`) lê **diretamente da base de dados** (`InventoryItem.currentStock`), não dos ficheiros JSON/HTML/Markdown em `docs/operational-records/`. Esses documentos são apenas registo humano — a fonte de verdade real é a BD.

Cada operação de stock (entrada de fornecedor, saída, contagem física semanal) devia seguir sempre o mesmo padrão: 1 transação atómica que atualiza `InventoryItem.currentStock` **e** cria um `InventoryTransaction` com `balanceAfter` igual ao novo stock. Na prática isso não está a acontecer de forma consistente.

## 2. Evidência concreta do problema (verificada por auditoria, 16-17/07/2026)

### 2.1 `currentStock` dessincronizado do próprio histórico de transações

Corri esta verificação (só leitura) contra a BD local: para cada `InventoryItem` ativo, comparei `currentStock` com o `balanceAfter` da sua transação mais recente (`inventory_transactions`, ordenado por `transactionDate`/`createdAt`). Resultado: **13 de 58 artigos ativos (≈22%) têm `currentStock` diferente do que a própria transação mais recente diz que devia ser**, sem qualquer transação de correção registada. Exemplos:

| SKU | Artigo | `currentStock` atual | `balanceAfter` da última transação | Última referência |
| --- | --- | --- | --- | --- |
| CLEAN-DISH-LEMON | Dish Lemon | **-1** | 7 | STOCK-IN-2026-07-16-CONSUMABLES-DELIVERY |
| CONS-TAKEAWAY-MEDIUM-CUPS-LIDS | Copos Médios Take Away + Tampas | **-12** | 8 | WEEKLY-COUNT-2026-07-14 |
| CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS | Copos Médios Café Take Away | **0** | 20 | WEEKLY-COUNT-2026-07-14 |
| CLEAN-ANTIBACTERIAL-FOAM | Espuma Antibacteriana | **-1** | 11 | WEEKLY-COUNT-2026-07-07 |
| CLEAN-D-50 | D-50 | **1** | 5 | WEEKLY-COUNT-2026-07-14 |
| CLEAN-LAVA-TUDO | Lava-Tudo | **4** | 8 | STOCK-IN-2026-07-16-CONSUMABLES-DELIVERY |
| CLEAN-THOMIL | Thomil | **3** | 7 | WEEKLY-COUNT-2026-07-14 |
| CLEAN-SPONGE-REGULAR / -INOX | Esfregão / Esfregão INOX | **-1** | 1 | WEEKLY-COUNT-2026-07-14 |
| CONS-SERVICE-NAPKINS | Guardanapos | **1** | 3 | WEEKLY-COUNT-2026-07-14 |
| CLEAN-SPLIT-LV-RINSE | Abrilhantador/Secante SPLIT LV | **1** | 3 | WEEKLY-COUNT-2026-07-14 |
| CLEAN-DISH-UNIVERSAL | Lava-Louça Universal | **1** | 2 | WEEKLY-COUNT-2026-07-07 |
| CONS-OPS-LABEL-ROLLS | Rolos de Etiquetas | **3.5** | 5.5 | STOCK-IN-2026-07-16-CONSUMABLES-DELIVERY |

Isto significa que **o relatório mensal está a mostrar valores errados para estes artigos** — o "stock final" não corresponde nem à última contagem física nem às entradas registadas, mesmo que os documentos Markdown em `docs/operational-records/.../inventory-updates/` estejam corretos. O problema não é a documentação — é a BD.

Confirmei ainda, por comparação direta, que a contagem física de 14/07 (`docs/operational-records/2026/inventory-count-sheets/Inventário Semanal - Contagem Física (Julho 2026).html`, coluna "14/07") está coerente com `docs/operational-records/2026/07-july/inventory-updates/2026-07-14-inventory-change-summary.md`, e que a entrada de 16/07 (`2026-07-16-inventory-entry-record.md`) está coerente com essa contagem + delta de entrada. **O ponto de rutura é exclusivamente entre esses registos e o valor que fica gravado em `InventoryItem.currentStock`.**

### 2.2 Ausência de um workflow único e reutilizável

`scripts/database/` contém **mais de 30 scripts artesanais, um por data/operação**: `record-stock-in-2026-06-16.ts`, `-06-18.ts`, `-06-20.ts`, `-06-22.ts`, `-06-23.ts`, `-06-24.ts`, `-07-03.ts`, `-07-03-simple.ts`, `-07-16.ts`, mais `enhanced-stock-in-template.ts` (aparentemente o "template" copiado a cada entrada), `rollback-weekly-inventory-count-2026-06-30.ts`/`.mjs`, `uniformizar-lava-louca-universal.mjs`, `uniformizar-lava-tudo-unidade.mjs`, `uniformizar-rolos-impressora-caixas.mjs`, `converter-unidade-spray-laranja.mjs`, `corrigir-entrada-spray-laranja.mjs`, `convert-printer-rolls-*.ts/.mjs`, `convert-medium-coffee-cups-sacos-to-caixas.mjs`, `atualizar-stock-critico-luvas.mjs`, entre outros.

Cada entrada de stock é escrita como um ficheiro `.ts` novo com os produtos e quantidades **hardcoded como literais no corpo do script** (ver `scripts/database/record-stock-in-2026-07-16.ts`), duplicando dados que já existem nos JSON/HTML de contagem. Isto é o oposto de um workflow escalável: cada entrada nova = escrever código novo à mão, sem reutilizar o schema/validação da anterior, e sem nenhuma garantia de que o script novo segue o mesmo padrão atómico do anterior.

`record-stock-in-2026-07-16.ts` (linhas 237-279) tem ainda um bloco de "revert automático se já existir" que subtrai `tx.quantity` a `currentStock` e apaga a transação — um padrão frágil que, combinado com o histórico de scripts de "uniformização"/conversão de unidade a corrigir a posteriori (`uniformizar-*`, `converter-unidade-*`, `corrigir-entrada-*`), é a explicação mais provável para os 13 desvios encontrados: algum destes scripts (ou uma reexecução parcial) escreveu diretamente em `currentStock` sem inserir a transação correspondente.

### 2.3 Duas fontes de contagem em paralelo, uma delas não commitada

Existe `weekly-count-2026-07-14.json` na raiz do projeto (dados corretos, confirmados), mas está **untracked no git** — nunca foi commitado. `weekly-count-2026-07-07.json` está tracked mas modificado. Não há uma pasta única e óbvia onde as contagens semanais aplicadas devem viver de forma permanente (contraste com `docs/operational-records/2026/06-june/inventory-counts/*.json`, que segue um padrão mais arrumado).

## 3. Objetivo deste trabalho

Substituir o padrão atual ("um script novo por data, escrito à mão, sem garantias") por um **workflow único, parametrizado e auto-verificável** para as três operações de stock (Entrada, Saída, Contagem), que:

1. Nunca permita `currentStock` divergir do ledger de transações.
2. Elimine a necessidade de escrever um `.ts` novo por cada movimento.
3. Gere a documentação (`*-inventory-entry-record.md`, `*-inventory-movement-log.md`, `*-inventory-change-summary.md`) automaticamente a partir da mesma execução que grava na BD — nunca escrita à mão depois.
4. Force a regeneração do preview mensal (HTML+PDF) como último passo automático.
5. Detete e falhe ruidosamente se o relatório ficar incoerente com a última contagem + movimentos desde então.

## 4. Tarefas

### Tarefa 1 — Script canónico de reconciliação/reparação (correr primeiro, antes de tudo o resto)

Cria `scripts/database/reconcile-current-stock.ts`:
- Para cada `InventoryItem` ativo, calcula o `balanceAfter` da transação mais recente (por `transactionDate` desc, depois `createdAt` desc).
- Se `currentStock != balanceAfter` (tolerância 0.001), corrige `currentStock` para o valor do ledger **e** insere uma nova `InventoryTransaction` do tipo `ADJUSTMENT` com `reason: "Reconciliação de coerência currentStock vs ledger"`, `referenceType: "SYSTEM_RECONCILIATION"`, `referenceId` único por execução (ex.: `RECONCILE-<timestamp>`), para que a correção fique auditável (nunca corrigir sem deixar rasto).
- Corre em modo `--dry-run` por omissão (só reporta); só escreve com `--apply`.
- Usa isto primeiro para corrigir os 13 artigos identificados na secção 2.1 antes de continuares.

### Tarefa 2 — Um único script parametrizado por tipo de operação

Substitui todo o `scripts/database/record-stock-in-*.ts` e equivalentes por:

- `scripts/stock/apply-stock-entry.ts` — entrada de fornecedor.
- `scripts/stock/apply-stock-exit.ts` — saída (consumo/quebra/transferência).
- `scripts/stock/apply-weekly-count.ts` — substitui `apply-weekly-inventory-from-json.mjs` e `-pg.mjs` (unifica os dois, usa sempre Prisma, não SQL cru).

Cada um deve:
- Receber o input via **ficheiro de dados** (JSON com `{ date, referenceId, supplierId?, lines: [{ sku, quantity, unitCost?, reason? }] }`), nunca literais hardcoded no corpo do `.ts`.
- Validar o ficheiro contra um schema (zod — já é dependência do projeto).
- Executar tudo dentro de `prisma.$transaction([...])`: update ao `InventoryItem` (stock + CMP quando aplicável) e `create` da `InventoryTransaction`, no mesmo array de operações — nunca dois passos separados.
- Calcular `balanceAfter` a partir do stock **atual lido dentro da mesma transação** (evita race conditions) e usar exatamente esse valor para atualizar `currentStock`.
- Rejeitar (throw) se `referenceId` já existir, em vez de reverter e reaplicar silenciosamente — reprocessamento deve ser uma decisão explícita do operador (`--force`), nunca automática.
- No fim, chamar sempre `runUpdateMonthlyPreviewFor(date)` (já existe em `scripts/update-monthly-preview-for-date.ts`) e gerar os três documentos Markdown (entry-record/movement-log/change-summary) a partir dos mesmos dados que acabaram de ser escritos na BD — nunca escritos manualmente depois.

### Tarefa 3 — Guarda de coerência pós-escrita

Dentro de cada script da Tarefa 2, depois do `$transaction` confirmar, volta a ler cada item tocado e confere `currentStock === balanceAfter` da transação que acabou de criar. Se falhar, lança erro e marca a operação como suspeita (não é suposto ser fisicamente possível se o Prisma correu bem, mas serve de rede de segurança contra bugs de concorrência).

### Tarefa 4 — Verificação de coerência do relatório mensal

Cria `scripts/validate-monthly-report-coherence.mjs`:
- Para o mês/ano indicado, recalcula "stock esperado" = última contagem física dentro do mês (via `InventoryTransaction` tipo `ADJUSTMENT`/referenceType `WEEKLY_COUNT`) + soma de `IN`/`OUT` desde essa contagem até à data de execução.
- Compara com `InventoryItem.currentStock` real.
- Lista qualquer artigo divergente, com o valor esperado vs real e a data da última contagem usada.
- Adiciona isto como passo final de `npm run inventory:month-close` e do helper `scripts/update-monthly-preview.mjs`, para que nunca mais seja possível gerar/fechar um relatório sem esta verificação passar (ou, no mínimo, sem o aviso aparecer).

### Tarefa 5 — Arrumar as contagens semanais

Move `weekly-count-2026-07-07.json` e `weekly-count-2026-07-14.json` da raiz do projeto para `docs/operational-records/2026/07-july/inventory-counts/`, seguindo o padrão já usado em junho (`docs/operational-records/2026/06-june/inventory-counts/`). Faz commit. Atualiza `docs/workflows/monthly-inventory-report-workflow.md` para refletir o novo caminho e os novos scripts (`scripts/stock/apply-*`, `scripts/database/reconcile-current-stock.ts`).

### Tarefa 6 — Arquivar os scripts one-off

Move os scripts de `scripts/database/record-stock-in-*.ts`, `rollback-weekly-inventory-count-*`, `uniformizar-*`, `converter-unidade-*`, `corrigir-entrada-*`, `convert-*-unit*`, `atualizar-stock-critico-*` para `scripts/database/_archive/` (só mover, não apagar — são histórico de auditoria válido). Adiciona um `README.md` nessa pasta a explicar que estes scripts foram substituídos pelo workflow canónico da Tarefa 2 e não devem voltar a ser usados como template para novas entradas.

### Tarefa 7 — Testes

Adiciona testes Vitest para `apply-stock-entry.ts`, `apply-stock-exit.ts`, `apply-weekly-count.ts` e `reconcile-current-stock.ts` cobrindo pelo menos:
- Entrada normal → `currentStock` e `balanceAfter` da transação criada coincidem.
- Reexecução com o mesmo `referenceId` sem `--force` → rejeitada.
- Item com `currentStock` pré-existente já dessincronizado → o reconciliador corrige e deixa transação `ADJUSTMENT` de auditoria.
- Contagem semanal com variância zero num artigo → não cria transação redundante, mas `currentStock` mantém-se correto.

## 5. Regras a não quebrar

- Nunca escrever em `InventoryItem.currentStock` fora de uma transação Prisma que também insere/atualiza o `InventoryTransaction` correspondente. Isto é a regra mais importante deste documento.
- Nunca apagar `InventoryTransaction` existentes como forma de "corrigir" — corrige sempre com uma nova transação de ajuste auditável.
- Não tocar em dados de produção sem confirmação explícita do utilizador — corre primeiro tudo em modo `--dry-run` / contra uma cópia local, mostra o diff, só aplica depois de aprovação.
- Preserva compatibilidade com `npm run inventory:month-close` e `scripts/update-monthly-preview.mjs` — não partas a interface pública descrita em `docs/workflows/monthly-inventory-report-workflow.md`.

## 6. Checklist final de validação (health check)

- [ ] `scripts/database/reconcile-current-stock.ts --apply` corrido e os 13 artigos da secção 2.1 já não aparecem como divergentes.
- [ ] `scripts/validate-monthly-report-coherence.mjs --year=2026 --month=7` corre sem divergências.
- [ ] Zero scripts novos "por data" criados desde esta mudança — todas as entradas/saídas/contagens passam por `scripts/stock/apply-*`.
- [ ] `weekly-count-2026-07-*.json` movidos e commitados em `docs/operational-records/2026/07-july/inventory-counts/`.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` a passar.
- [ ] Preview mensal (HTML+PDF) regenerado e a bater certo com a última contagem + entradas desde então.
