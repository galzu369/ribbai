### Workflow do Relatorio Mensal de Inventario (Template Pricing Intelligence)

Este documento descreve como gerar, atualizar e fechar o **Relatorio Mensal de Inventario de Consumiveis** do RIBBAI, usando o template padronizado a partir de **julho 2026**.

Todos os comandos assumem que esta na raiz do projeto (`RIBBAI`).

---

### 0. Como registar Entradas, Saidas e Contagens (workflow canonico, desde 2026-07-17)

Toda entrada de fornecedor, saida de stock e contagem fisica semanal deve ser registada atraves dos scripts canonicos em `scripts/stock/`, nunca escrevendo um script novo `.ts` por data (ver `docs/workflows/CURSOR-MASTER-PROMPT-stock-workflow.md` para o historico completo desta mudanca).

- **Entrada de fornecedor**:
  ```bash
  npx tsx scripts/stock/apply-stock-entry.ts --file=<caminho-para-entrada.json>
  ```
- **Saida de stock** (consumo/quebra/transferencia):
  ```bash
  npx tsx scripts/stock/apply-stock-exit.ts --file=<caminho-para-saida.json>
  ```
- **Contagem fisica semanal** (substitui `apply-weekly-inventory-from-json.mjs` e `-pg.mjs` para contagens novas):
  ```bash
  npx tsx scripts/stock/apply-weekly-count.ts --file=<caminho-para-contagem.json>
  ```

Formatos de input em `scripts/stock/lib/schemas.ts`. Cada script:
- Corre tudo dentro de uma unica transacao Prisma (nunca separa a escrita de `currentStock` da `InventoryTransaction` correspondente).
- Rejeita reprocessar um `referenceId` ja existente a nao ser que se passe `--force` (que reverte de forma segura, recalculando a partir do ledger, nunca por subtracao direta).
- Corre uma guarda de coerencia pos-escrita (`currentStock === balanceAfter`) antes de terminar.
- Gera automaticamente os 3 documentos Markdown (`*-inventory-entry-record.md` / `*-inventory-exit-record.md` / `*-inventory-count-record.md`, `*-inventory-movement-log.md`, `*-inventory-change-summary.md`) em `docs/operational-records/YYYY/MM-month/inventory-updates/`.
- Regenera o preview mensal (HTML+PDF) no fim.

Contagens semanais aplicadas ficam arquivadas em `docs/operational-records/YYYY/MM-month/inventory-counts/YYYY-MM-DD-weekly-count.json` (nao na raiz do projeto).

**Manutencao e verificacao de coerencia:**
```bash
# Reporta (dry-run) ou corrige (--apply) qualquer artigo cujo currentStock nao bata certo com a sua propria ultima transacao
npx tsx scripts/database/reconcile-current-stock.ts [--apply]

# Confirma que currentStock de cada artigo bate certo com "ultima contagem fisica + movimentos desde entao"
npm run inventory:validate-coherence -- --year=YYYY --month=MM

# Consolida um SKU duplicado (ex.: mesmo produto com dois SKUs, um deles INACTIVE)
# no SKU canonico: move o historico de transacoes, soma o stock (CMP), regista
# uma transacao de auditoria, e soft-deleta o duplicado.
npx tsx scripts/database/merge-duplicate-sku.ts --from=<SKU_DUPLICADO> --into=<SKU_CANONICO>

# Deteta artigos com o mesmo nome em mais do que um SKU ativo (aviso, nao bloqueia).
# Corre automaticamente (nao bloqueante) no inicio de `npm run inventory:month-close`.
npx tsx scripts/database/find-duplicate-skus.ts
```

**Atencao ao usar `merge-duplicate-sku.ts`**: o script soma sempre o stock dos dois SKUs (via CMP), assumindo que sao duas reservas fisicas separadas do mesmo produto. Isso e o comportamento certo quando o SKU antigo tinha stock genuino que nunca foi transferido. **Mas se o SKU novo simplesmente substituiu o antigo a meio do mes** (ex.: alguem comecou a usar um SKU diferente para o mesmo artigo fisico, e a ultima contagem no SKU novo ja reflete o stock real e completo), somar os dois da um valor errado, a dobrar. Nesse caso, confirma sempre com quem faz as contagens fisicas qual e o stock final real antes de assumir que a soma esta certa (ver `docs/workflows/CURSOR-MASTER-PROMPT-stock-workflow.md` para o caso real do Lava-Louça Universal onde isto aconteceu).

**Antes de criar um artigo novo**, `apply-stock-entry.ts` verifica automaticamente se ja existe um artigo com o mesmo nome (em qualquer estado) e bloqueia a criacao de um SKU novo nesse caso — usa o SKU existente, ou corre com `--force-new-sku` se for mesmo um artigo diferente com nome coincidente.

Scripts antigos, um-por-data (`scripts/database/record-stock-in-*.ts`, `rollback-weekly-inventory-count-*`, `uniformizar-*`, etc.) foram arquivados em `scripts/database/_archive/` e nao devem voltar a ser usados como template.

---

### 1. Gerar/atualizar o preview mensal (documento de trabalho)

O preview e um documento **interno** para controlo operacional, que pode ser regenerado quantas vezes for necessario.

Sempre que este workflow e corrido, a atualizacao acontece em dois passos sequenciais:
1. **Geracao/atualizacao do HTML** (`YYYY-MM-preview-relatorio-mensal-consumiveis.html`) com base nos dados atuais de inventario.
2. **Export do PDF a partir do HTML atualizado** (`YYYY-MM-preview-relatorio-mensal-consumiveis.pdf`), garantindo que o PDF reflete sempre a ultima versao do documento de trabalho.

- **Comando generico (preview)** (gera/atualiza **HTML + PDF** do preview):

```bash
node scripts/generate-monthly-consumables-report-pdf.mjs --year=YYYY --month=MM --preview
```

- **Helper recomendado** (usa o mes/ano atuais por omissao e atualiza **HTML + PDF** do preview):

```bash
node scripts/update-monthly-preview.mjs
node scripts/update-monthly-preview.mjs --year=2026 --month=7
```

O preview e automaticamente regenerado quando:
- e aplicada uma **contagem semanal** via:
  - `scripts/apply-weekly-inventory-from-json.mjs`
  - `scripts/apply-weekly-inventory-from-json-pg.mjs`

---

### 2. Regras de periodo e de calculo

- **Entradas/Saidas (colunas do relatorio)**:
  - Apenas consideram transacoes `IN`/`OUT` de `inventory_transactions`
  - **Somente** no intervalo \[primeiro dia do mes, primeiro dia do mes seguinte\) (`monthStart` ate `monthEnd`).
  - Transacoes de outros meses **nao aparecem** como entradas/saidas no relatorio desse mes.

- **Consumo estimado / Gasto estimado**:
  - Usa uma **janela movel de 4 semanas** de contagens:
    - `windowStart = monthStart - 21 dias`
    - `movementEnd = monthEnd`
  - Para cada artigo:
    - Selecionam‑se ate **4 ultimas contagens** dentro da janela (3 anteriores + contagem atual).
    - O consumo estimado usa:
      - stock inicial (snapshot do mes anterior ou primeira contagem da janela)
      - movimentos `IN`/`OUT` entre a primeira contagem e o fim da janela
      - stock final atual (`currentStock`).

- **Stock inicial do mes**:
  - Por defeito, vem do **snapshot de fim de mes anterior**:
    - ficheiro: `docs/operational-records/YYYY/MM-month/monthly/YYYY-MM-month-end-snapshot.json`
  - Se nao houver snapshot, o script recorre a:
    - primeira contagem valida na janela, ou
    - stock atual como fallback (dependendo do artigo).

---

### 3. Fecho oficial do mes e snapshot de fim de mes

No fecho oficial do mes, gera‑se o **relatorio final** (sem `--preview`) e o **snapshot de fim de mes**, que sera usado como stock inicial do mes seguinte.

- **Comando unico de fecho**:

```bash
npm run inventory:month-close -- --year=YYYY --month=MM
```

Este comando executa, pela ordem:
1. `scripts/validate-monthly-report-coherence.mjs` — **bloqueia o fecho** se algum artigo estiver incoerente (`currentStock` != ultima contagem + movimentos desde entao). Se falhar, corre `npm run inventory:reconcile-stock -- --apply` primeiro.
2. `scripts/generate-monthly-consumables-report-pdf.mjs` (sem `--preview`)
3. `scripts/build-month-end-snapshot-from-monthly-report.mjs`

Output esperado:
- HTML/PDF final:\
  `docs/operational-records/YYYY/MM-month/monthly/YYYY-MM-relatorio-mensal-consumiveis.(html|pdf)`
- Snapshot JSON:\
  `docs/operational-records/YYYY/MM-month/monthly/YYYY-MM-month-end-snapshot.json`

---

### 4. Como o snapshot alimenta o mes seguinte

Ao gerar o relatorio de um mes (ex.: julho 2026), o script:

1. Procura o snapshot do mes anterior (junho 2026).
2. Constrói um mapa `openingSnapshotMap` (`sku -> closingQuantity` e unidade oficial).
3. Usa este mapa como **fonte primaria** de `openingQuantity` no `buildReportRows`.

Isto garante que:
- O stock inicial de julho = stock final oficial de junho (com conversoes de unidade aplicadas).
- Qualquer correcao de unidade (ex.: caixas -> sacos) fica refletida na transicao de mes.

---

### 5. Integracao com o Pricing Intelligence

O relatorio mensal alimenta a arquitetura de Pricing Intelligence com:
- **Valor total do stock** (KPI financeiro principal).
- **Gasto estimado** com base no consumo das ultimas 4 semanas.
- **Percentagem de artigos com preco configurado** (via contagem de `unitCost > 0`).
- **Alertas de stock critico** por artigo/categoria.

Ao manter:
- stock inicial coerente (via snapshot),
- entradas/saidas limitadas ao mes correto,
- e contagens semanais consistentes,

o documento de cada mes torna‑se um **painel financeiro fiavel** para consumiveis.

---

### 6. Boas praticas de utilizacao

- Sempre que fizer:
  - uma **contagem semanal**,
  - uma **entrada de stock relevante** (fornecedor),
  - ou **atualizacoes de precos chave**,

  regenerar o **preview** com:

  ```bash
  node scripts/update-monthly-preview.mjs --year=YYYY --month=MM
  ```

- No final do mes:
  - correr `npm run inventory:month-close -- --year=YYYY --month=MM`;
  - validar o relatorio final e arquivar o snapshot JSON gerado.

