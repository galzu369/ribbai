# Estado Atual do Projeto

## Resumo Executivo
O projeto "RIBBAI 2.0" encontra-se numa fase avançada da sua estruturação base (Phase 1) com saltos muito significativos nas áreas de Gestão de Inventário (com motor de Custo Médio Ponderado - CMP) e Business Intelligence. Trata-se de uma plataforma *enterprise-grade* desenhada para a gestão de operações de restaurante, suportada por uma stack tecnológica moderna. O projeto tem as suas bases de dados criadas, serviços complexos estabelecidos e geração de relatórios automatizada através de scripts.

## Arquitetura
A arquitetura assenta no Next.js 15 utilizando a convenção de **App Router**. Emprega um modelo baseado em domínios (*Feature-Sliced Design* na pasta `features/`) combinado com um modelo em camadas no servidor (*Controller/Action -> Service -> Repository* nas pastas `server/`). Possui ainda um forte encapsulamento de bibliotecas de base (`lib/` para Auth, DB, Error, Logger, Audit, etc.).

## Stack Tecnológica
**Linguagens e Core**: TypeScript, Node.js.
**Frontend**: Next.js 15, React 19, TailwindCSS, Radix UI (shadcn/ui base).
**Gestão de Estado**: Zustand e React Query (Tanstack).
**Backend / API**: Next.js Server Actions e Route Handlers.
**Base de Dados**: PostgreSQL, ORM Prisma (v6.1.0).
**Autenticação**: Next-Auth v5 (beta) com adaptador Prisma.
**Ficheiros e Assets**: Supabase Storage.
**Relatórios e PDF**: Puppeteer e pdf-lib.
**Testes**: Vitest (Unit) e Playwright (E2E).
**Qualidade de Código**: ESLint, Prettier, Husky.

## Estado dos Módulos
O sistema base de infraestrutura está completo (DB, Lint, Build).
O módulo de **Business Intelligence (BI)** e de **Inventory (CMP)** apresentam um grau de maturidade bastante elevado a nível de *backend* e *scripting*, embora as interfaces visuais completas não estejam integralmente unidas no App Router.
Módulos como Escalas, Incidentes, Checklists e Gestão Funcional ainda residem primariamente nos modelos de base de dados (Prisma Schema) e requerem implementação aplicacional (Frontend e Serviços API).

## Modelos Prisma
Existem 27 modelos de base de dados divididos em 11 domínios:
- **Authentication**: `User`, `Account`, `Session`, `VerificationToken`, `Role`.
- **Employee**: `Employee`.
- **Shift & Attendance**: `Shift`, `Attendance`.
- **Inventory**: `Supplier`, `InventoryItem`, `InventoryTransaction`, `WeeklyInventory`, `WeeklyInventoryItem`.
- **Reporting**: `Report`.
- **Checklist**: `ChecklistTemplate`, `Checklist`.
- **Incident**: `Incident`.
- **Document**: `Document`.
- **Notification**: `Notification`.
- **Audit Logs**: `AuditLog`.
- **Performance & AI**: `PerformanceMetric`, `AIForecast`, `AIInsight`, `Setting`, `SystemMetadata`, e domínios de BI como `OperationalNote`, `KPISnapshot`, `TeamFeedback`, `AlertRule`, `HealthScoreHistory`.

## Sistema de Inventário
Foi implementado de forma robusta um sistema de Gestão de Inventário assente no Custo Médio Ponderado (CMP). Está suportado na tabela `InventoryItem` e lida com movimentações registadas em `InventoryTransaction`. A arquitetura avalia métricas de custos em tempo real, gerindo *stock value*, *average cost* e disparando scripts operacionais automatizados para as contagens semanais.

## Sistema Financeiro
Intimamente ligado ao inventário, a lógica financeira (em `lib/inventory-cmp.ts` e `lib/inventory-financial-analytics.ts`) efetua a avaliação correta do valor monetário do material armazenado. O sistema consegue determinar o impacto financeiro de saídas, entradas e quebras, originando relatórios robustos de variações acima de limites definidos.

## Relatórios
Os relatórios estão altamente desenvolvidos como ficheiros `.mjs` geradores de PDF e HTML, utilizando a biblioteca `Puppeteer`. Existem automatismos como:
- `generate-monthly-consumables-report-pdf.mjs`
- `generate-inventory-update-report-pdf.mjs`
- `generate-monthly-overtime-report-pdf.mjs`
A sua produção provém de serviços alocados e resulta numa geração estilizada para avaliação das chefias.

## Dashboards
A infraestrutura para dashboards está alocada na pasta `features/business-intelligence/components/`, contando com elementos como `executive-dashboard.tsx`, `real-time-metrics.tsx`, `kpi-grid.tsx` e `trend-chart.tsx`. 

## Analytics
Uma camada sofisticada de analytics processa as informações em bruto via `business-intelligence/services`, gerando alertas, métricas de eficiência (Operational, Team, Financial KPIs) e uma componente designada por *Health Score* geral da operação.

## Business Intelligence
Implementado de forma agressiva. Inclui agregação de dados preditivos, histórico de alertas (`AlertHistory`, `AlertRule`) e uma lógica de recolha que funde inventário, equipa e finanças para oferecer um sumário executivo automatizado.

## Sistema PDF
O sistema de PDF usa Puppeteer para renderizar páginas baseadas em componentes HTML estáticos e depois converter para PDF profissionalmente paginado. Envolve serviços como `pdf-chart-generator.ts` para introduzir analítica visual em ficheiros PDF finais guardados, além de capacidades avançadas com `pdf-lib`.

## Documentação
A documentação de projeto na pasta `/docs` é massiva e detalhada. Contém `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md` e diversos guiões relativos a conclusões de fase (como o do sistema CMP). A documentação atesta as decisões e guias de código (`CODING_STANDARDS.md`).

## Pontos Fortes
- **Infraestrutura Técnica Elevada**: Stack topo de gama e fortemente tipada.
- **Modelagem de Dados**: Extremamente granular com tracking de auditoria.
- **Reporting Nativo**: Motor de geração de PDFs muito maduro.
- **Camada Financeira**: O CMP automatizado garante exatidão de custos.

## Pontos Fracos
- **Incompletude da UI Frontend**: Muito do sistema complexo existe nos scripts e no terminal e não possui as suas páginas na área do Dashboard UI.
- **Complexidade**: A abstração *Feature-Sliced* somada ao modelo *Repository/Service* requer *onboarding* forte.

## Riscos
- Risco de dessincronização entre as funções que os scripts no terminal geram e as interfaces que ainda faltam criar.
- Dependência contínua do uso de processos de script avulsos para tarefas diárias (relatórios e inventário), caso o FrontEnd não seja terminado.

## Oportunidades
- Transformar os relatórios hoje baseados em scripts num *Click-and-Generate* no Frontend, tirando partido dos *Server Actions*.
- Consolidar as *features* prontas (como Inventory Analytics) no *Executive Dashboard*.

## Recomendações
1. **Foco Imediato na Camada UI**: Começar a criar as rotas `/app/dashboard/*` de forma massiva para consumir os serviços de BI, Inventário e Report.
2. **Autenticação Visual**: Completar a ponte visual com o NextAuth já integrado na infraestrutura.
3. **Stand-by em scripts de Node puros**: Concentrar esforços em transportar a geração dos relatórios para endpoints da API interna ou *Server Actions*.

## Roadmap sugerido
1. Desenvolvimento das Páginas UI (Dashboard Core).
2. Integração do módulo de Empregados, Escalas e Assiduidades na UI.
3. FrontEnd da Gestão de Inventário, eliminando necessidade de gerir as transações através de scripts.
4. UI do módulo de Relatórios (Geração e Download num clique).
5. Sistema Visual de Configurações, Permissões e Auditoria.