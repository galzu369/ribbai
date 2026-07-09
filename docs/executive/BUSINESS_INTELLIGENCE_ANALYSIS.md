# Análise de Business Intelligence (BI)

O domínio de *Business Intelligence* no RIBBAI Ops representa a camada de maior densidade lógica em cima da recolha exaustiva de dados diários efetuada pelas outras ferramentas do projeto. 

## 1. Organização Arquitetural
Todo este sistema vive aglomerado de modo altamente coeso no módulo `features/business-intelligence/`. Esta funcionalidade central está estruturada como um Feature-Slice denso e não apenas como componentes dispersas:
- Contém serviços avançados e dedicados, separando responsabilidades: `ai-analysis.ts`, `alert-system.ts`, `health-score.ts`, `operational-kpis.ts`, `financial-kpis.ts`, `team-kpis.ts`, `trend-analysis.ts`.
- Contém utilitários próprios de transformação e formatação e um sistema de *cache* para alívio nas agregações.

## 2. Indicadores (KPIs)
O motor divide a observação transversal do restaurante em várias famílias de Indicadores Chave de Performance (KPIs), modelados através da recolha passiva (e persistidos em snapshots como ditado pela tabela `KPISnapshot`):
- **Financial KPIs**: Reflete avaliações em cima das flutuações do custo de aquisições registadas e do valor total do armazém (o `Inventory Valuation`).
- **Operational KPIs**: Monitoriza eficiência pura: checklists completadas atempadamente, relatórios de abertura/fecho emitidos sem atrasos, tempo médio de permanência ou quebras registadas.
- **Team KPIs**: Medições assentes na avaliação dos colaboradores e na assiduidade (overtime vs horários normais).

## 3. Lógica de Scoring (Health Score)
A arquitetura contempla um serviço revolucionário (`health-score.ts`) que gera uma métrica agregadora final com limites precisos (ex. de 0 a 100), consolidada no modelo `HealthScoreHistory`.
A combinação de todos os pesos numéricos preestabelecidos permite que um Diretor ou Acionista olhe apenas para um simples indicador (ex. 85%) e saiba que a infraestrutura total do restaurante, naquele dia, opera de forma satisfatória face aos padrões previstos.

## 4. Forecasting e AI Insights
Através de modelos de registo criados (`AIForecast` e `AIInsight`), a camada de BI já contempla infraestrutura para deteção de padrões ocultos e projeções estatísticas (como propostas de reposição em caso de fins de semana críticos de ocupação turística). 
Embora num estado experimental/estrutural para ligação com LLMs complexos reais, a modelação de base e lógicas associadas já conseguem registar, sugerir e emitir alertas preditivos baseados nos dados.

## 5. Dashboards Executivos
Esta informação densa já iniciou as suas vias de modelação gráfica via componentes de interface, agrupados em `/components`.
- `executive-dashboard.tsx`, `kpi-grid.tsx`
- Componentes de Alertas ativos e de Tendências Preditivas (`trend-chart.tsx`).

## Conclusão
O modelo de dados implementou de forma cirúrgica um repositório central altamente maleável (`features/business-intelligence/`). A sua sofisticação atual reside puramente na lógica funcional; é crucial o transporte destas lógicas para que o utilizador comum interaja nos écrans do Frontend do portal diariamente.