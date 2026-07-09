# Análise do Sistema de Inventário

O Sistema de Inventário ("Inventory") foi objeto de uma profunda modernização no projeto RIBBAI, não sendo apenas um registo de volumes, mas funcionando simetricamente como uma complexa caixa de registo financeiro.

## 1. Estrutura e Base de Dados
As tabelas mestras desta vertical são:
- **`InventoryItem`**: Regista cada item, unidade (`unit`), limites para reabastecimento (`reorderPoint`), e de uma forma singular, guarda e atualiza em tempo real as referências monetárias (Custos).
- **`InventoryTransaction`**: Atua como o `Ledger` único do Inventário. Regista as Entradas (IN), Saídas (OUT) e Ajustes, impedindo apagamentos acidentais.
- **`WeeklyInventory` e `WeeklyInventoryItem`**: Gere o processo formal das contagens físicas de avaliação e sincronização regular para aferir de quebras de inventário não registadas digitalmente.
- **`Supplier`**: Catálogo de entidades fornecedoras.

## 2. Atualizações Automáticas (Motor CMP)
O coração da automação processa as avaliações no lado do Backend, sem intervenção primária. A biblioteca `lib/inventory-cmp.ts` aplica o sistema CMP (Custo Médio Ponderado). 
Sempre que uma nova entrada (IN) é declarada no sistema vinda do *Supplier*, o motor de Inventário recalcula instantaneamente os custos unitários dos materiais misturando-os com as quantidades que estavam previamentes no stock do armazém e reflete as variáveis nos metadados da transação.

## 3. Stock, Entradas, Saídas e Histórico
A lógica imutável proíbe mudanças sub-reptícias aos números do inventário:
- O stock corrente (`currentStock`) é uma vista direta baseada na consolidação matemática absoluta (ou "balanço final") da última `InventoryTransaction` válida aprovada, refletido no item.
- As **Entradas (IN)** e **Saídas (OUT)** obedecem a uma estrutura de formulário no processo de Scripts e DB Services implementados. 
- O **Histórico** é estritamente detalhado; o `InventoryTransaction` relata a identificação do colaborador referenciado (`createdBy`), timestamp e referência faturada exterior.

## 4. Alertas e Análise Preditiva
Os scripts analíticos (ex. `lib/inventory-financial-analytics.ts`) promovem o acesso programático (através de queries otimizadas do Prisma) à identificação de alarmes de níveis estipulados de *Stock* Crítico e limiares transfronteiriços. O sistema prevê notificações caso a variação dos preços (Inflação do Fornecedor face à histórica última) exceda os 15% em tempo real.

## 5. Documentos e Exportações (Relatórios e Scripts)
O sistema tem em uso automações por script notórias:
- Geração de folhas em PDF de auxílio de Contagem Física Semanal (`generate-weekly-inventory-count-sheet-pdf.mjs`).
- Scripts massivos de consolidação periódica como a atualização sumária de operações de inventário (`generate-inventory-update-report-pdf.mjs`).
- Atualizações retroativas criadas artificialmente pelas migrações passadas para repor saldos operacionais passados.

O seu avanço técnico é extremo do lado dos dados; falta integrar a representação interativa no Frontend UI (Gestão, Edição via Formulários) para dispensar de imediato os engenheiros de base de dados para mutações semanais.