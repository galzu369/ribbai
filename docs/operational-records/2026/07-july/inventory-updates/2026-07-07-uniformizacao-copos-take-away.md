## Uniformização de Copos Take Away (Copos Médios vs. Copos Pequenos com Tampas)

- **Contexto**
  - Durante a revisão do inventário semanal e mensal foi identificado que o artigo `Copos Pequenos Take Away + Tampas` (`CONS-TAKEAWAY-CUPS-SMALL`, unidade `saco`) estava a ser utilizado para registar stock que, na realidade, corresponde a `Copos Medios Cafe Take Away`.
  - Os relatórios de 10-06-2026 demonstram que para `Copos Medios Cafe Take Away` é usada consistentemente a conversão **1 caixa = 20 sacos** (ex.: 17 sacos = 0,85 caixas).
  - A entrada de stock de 03-07-2026 registou **+20 sacos a 1,85 €/saco** em `CONS-TAKEAWAY-CUPS-SMALL`, que na prática corresponde a copos médios café take away.

- **Decisão de uniformização**
  - Definir um **artigo canónico único** para copos médios de café:
    - **Nome**: `Copos Medios Cafe Take Away`
    - **SKU canónico**: `CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS`
    - **Unidade base**: `saco`
    - **Conversão de embalagem**: `caseUnit = "caixa"`, `packsPerCase = 20` (1 caixa = 20 sacos).
  - Manter `CONS-TAKEAWAY-MEDIUM-CUPS-LIDS` (copos médios + tampas) como artigo separado, também com unidade base `saco` e a mesma conversão 1 caixa = 20 sacos para reporting.
  - Tratar `CONS-TAKEAWAY-CUPS-SMALL` como **alias depreciado** de `CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS`, usado apenas para rastrear histórico:
    - `aliasOf = "CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS"`
    - `status = "deprecated"`
    - `note = "usado por erro; corresponde a copos médios cafe take away"`.

- **Alterações na configuração (`config/inventory-weekly-master-list.json`)**
  - Atualizado `CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS`:
    - `unit: "saco"`, `caseUnit: "caixa"`, `packsPerCase: 20`.
  - Atualizado `CONS-TAKEAWAY-MEDIUM-CUPS-LIDS`:
    - `unit: "saco"`, `caseUnit: "caixa"`, `packsPerCase: 20`.
  - Mantido `CONS-TAKEAWAY-SMALL-COFFEE-CUPS` (copos pequenos café sem tampas) em `caixa` sem alterações.
  - Atualizado `CONS-TAKEAWAY-CUPS-SMALL` para refletir o novo papel de alias depreciado.

- **Correção da entrada de stock de 03-07-2026**
  - Ficheiros afetados:
    - `2026-07-03-inventory-entry-record.md`
    - `2026-07-03-inventory-movement-log.md`
    - `2026-07-03-inventory-change-summary.md`
  - Reclassificação efetuada:
    - Antes: `Copos Pequenos Take Away + Tampas | CONS-TAKEAWAY-CUPS-SMALL | +20 saco | 1,85 €/saco | 37,00 €`.
    - Depois: `Copos Medios Cafe Take Away | CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS | +20 saco | 1,85 €/saco | 37,00 €`.
  - Notas adicionadas:
    - Os registos de movimento e de entrada documentam explicitamente que se trata de **reclassificação retrospetiva** de stock anteriormente registado em `CONS-TAKEAWAY-CUPS-SMALL`.
  - **Importante**: Não houve alteração de quantidades físicas nem de valores financeiros; apenas foi corrigido o artigo ao qual o stock está associado.

- **Atualização do motor de normalização**
  - Script `scripts/apply-weekly-inventory-from-json.mjs`:
    - Introduzido `SKU_ALIAS_MAP` para garantir que qualquer linha de contagem semanal com `CONS-TAKEAWAY-CUPS-SMALL` é automaticamente mapeada para `CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS` antes de ser aplicada à base de dados.
  - Script `scripts/generate-weekly-inventory-count-sheet-pdf.mjs`:
    - Itens que tenham `aliasOf` definido na `inventory-weekly-master-list.json` deixam de gerar linha própria na folha de contagem física, evitando duplicações entre canónico e alias.
  - Documento de auditoria `inventory-weekly-normalization-2026-07-07.md`:
    - Atualizado para refletir que:
      - Os copos médios (com e sem tampas) trabalham agora em `saco` com conversão 1 caixa = 20 sacos.
      - `CONS-TAKEAWAY-CUPS-SMALL` é tratado como alias depreciado e remapeado logicamente para `CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS`.

- **Impacto esperado**
  - **Relatórios de stock e alertas** passam a mostrar apenas o artigo canónico `Copos Medios Cafe Take Away` como referência para copos médios de café em sacos.
  - **Folhas de contagem física** deixam de ter uma linha separada para `Copos Pequenos Take Away + Tampas (saco)`; a contagem deve ser feita apenas na linha de `Copos Medios Cafe Take Away (saco)`.
  - **Histórico financeiro** mantém-se inalterado; todos os totais e CMP permanecem consistentes, com melhor classificação de artigos para análise futura.

