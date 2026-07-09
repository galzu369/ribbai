# Análise Financeira do Sistema

A infraestrutura do RIBBAI adotou nativamente conceitos puros de Contabilidade de Custos Integrada para dotar a plataforma de inteligência analítica autónoma sem intervenção passiva de *Excel* de gestão. A grande fundação para esta dimensão é baseada no sistema CMP (Custo Médio Ponderado) acoplado organicamente ao motor de inventário.

## 1. Lógica do Custo Médio Ponderado (CMP)
O CMP foi injetado (cf. documento de implementação) em todo o ecossistema com suporte para precisão matemática alta (`Prisma.Decimal`).
- **Valuation (Valorimetria do Inventário):** A entidade `InventoryItem` expõe campos críticos `averageCost`, `lastPurchaseCost` e `stockValue`. Este design confere exatidão no cálculo do Valor Bruto de Ativos do restaurante no instante em que o report for corrido.
- **Funcionamento:** Quando ocorre uma entrada de mercadoria a um preço superior ou inferior ao registado em sistema, o `lib/inventory-cmp.ts` aplica o algoritmo de mistura, resultando numa média balanceada em função da quantidade exata da encomenda com o que residia em stock, normalizando flutuações voláteis de preços de fornecedores.

## 2. Movimentos Monetários (Entradas e Consumos)
A perspetiva de custeio aplica-se quer a ganhos de armazém quer a perdas/consumos:
- **Entradas:** Quando os materiais do sistema recebem injeção quantitativa, o script anota a avaliação final originando o custo atual e as métricas absolutas (ex: "Compra de 10 garrafas a €4").
- **Saídas (Consumo / Wastage):** Aquando de uma venda da frente de loja, transferência interna ou rutura forçada (anomalia de stock), o consumo financeiro da perda não é estimado aleatoriamente, mas extraído exatamente a partir do Custo Médio desse preciso momento, apurando a perda financeira ao cêntimo (`totalCost`).

## 3. Custos Analíticos
A capacidade instalada (`lib/inventory-financial-analytics.ts` e `/api/analytics/inventory-financials`) tem valências para dividir a exposição global da companhia através do mapeamento de "Grupos de Consumo" (ex: Consumíveis vs Produtos de Limpeza), determinando os Top N Itens e Top N Prejuízos Mensais / Semanais em gráficos temporais.

## 4. Geração de Relatórios Financeiros
Foram desenvolvidos mecanismos PDF (tais como relatórios avançados em `scripts/generate-enhanced-inventory-update-report-pdf.mjs`) que reúnem de forma automatizada o total monetário consolidado e as tendências de encarecimento da produção. Os diretores recebem o resultado fidedigno por correio / documento exportado identificando logo as variações que carecem de renegociação perante fornecedores.

## 5. Avaliação do Sistema 
**Estado de Conclusão**: Motor robusto finalizado no *backend* e scripts associados.  
**Alerta/Oportunidade**: Garantir que as lógicas de Salários, Overtime de pessoal (em `MonthlySalary`) e as reparações geradas por anomalias do módulo "Incidentes" se interligam num *dashboard global* intermédio para que o Custo Fixo e o Custo Operacional resultem num verdadeiro Profit and Loss Statement em versões futuras, expandindo a genialidade de base aplicada no controlo inventarial.