### Workflow do Relatorio Mensal de Inventario (Template Pricing Intelligence)

Este documento descreve como gerar, atualizar e fechar o **Relatorio Mensal de Inventario de Consumiveis** do RIBBAI, usando o template padronizado a partir de **julho 2026**.

Todos os comandos assumem que esta na raiz do projeto (`RIBBAI`).

---

### 1. Gerar/atualizar o preview mensal (documento de trabalho)

O preview e um documento **interno** para controlo operacional, que pode ser regenerado quantas vezes for necessario.

- **Comando generico (preview)**:

```bash
node scripts/generate-monthly-consumables-report-pdf.mjs --year=YYYY --month=MM --preview
```

- **Helper recomendado** (usa o mes/ano atuais por omissao):

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
1. `scripts/generate-monthly-consumables-report-pdf.mjs` (sem `--preview`)
2. `scripts/build-month-end-snapshot-from-monthly-report.mjs`

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

