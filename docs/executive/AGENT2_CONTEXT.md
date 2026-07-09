# AGENTE 1.5 — CONSOLIDAÇÃO DO CONTEXTO EXECUTIVO DO RIBBAI 2.0

*Este documento foi gerado a partir de uma auditoria técnica e funcional ao RIBBAI 2.0. Constitui a fonte oficial de contexto executivo e técnico para a equipa e todos os agentes IA que trabalhem no projeto.*

---

## 1. Visão Estratégica

**Missão:** Dotar a gestão do RIBBAI de um controlo absoluto, integrado e altamente analítico das suas operações de restauração diárias, transformando dados operacionais brutos em inteligência gerencial.

**Problema que resolve:** A fragmentação dos sistemas de gestão na restauração. Tipicamente, inventário, horas extra, relatórios de anomalias e escalas vivem em sistemas desconectados ou ficheiros Excel manuais, impedindo uma visão financeira precisa ou respostas em tempo real.

**Visão de longo prazo:** Tornar o RIBBAI 2.0 numa plataforma de *Business Intelligence (BI)* de restauração *enterprise-grade* baseada num ecossistema fechado, capaz de atuar autonomamente. Visa introduzir mecanismos preditivos (Machine Learning/IA) na gestão do ciclo de vida da comida e dos funcionários.

**Diferenciação face a um POS:** O RIBBAI não é um Ponto de Venda. É o cérebro da retaguarda administrativa (Backoffice). Em vez de faturar refeições, avalia o impacto exato e flutuante do Custo Médio Ponderado (CMP) das batatas ou das horas extra num domingo, processando milhares de métricas para atribuir um *Health Score* instantâneo da operação e produzindo PDFs executivos premium para a administração.

---

## 2. Estado Atual do Projeto

O projeto encontra-se numa fase fulcral da estruturação base (Phase 1 e inícios da Phase 2). O Backend e a infraestrutura técnica superaram largamente a interface gráfica Web, resultando numa potente máquina de cálculo à espera do desenvolvimento intensivo do seu Frontend.

| Componente | Grau de Maturidade | Observações |
| ---------- | ------------------ | ----------- |
| **Infraestrutura** | Alto | Setup completo (ESLint, Prettier, testes, CI pipeline, scripts). |
| **Backend** | Muito Alto | APIs, Server Actions e Serviços desenvolvidos com abstração robusta. |
| **Frontend** | Baixo | Interfaces UI residuais (esboços de Dashboards não integrados e App Router primário). |
| **Base de Dados** | Muito Alto | Prisma Schema 100% definido (27 modelos em 11 domínios). Relações e auditoria criadas. |
| **Serviços** | Muito Alto | Lógicas centrais puras perfeitamente codificadas e validadas (ex: CMP, Health Score). |
| **Dashboards** | Médio | Componentes React para KPI Grids delineados, falta aplicação visual nas páginas `/app`. |
| **Relatórios** | Muito Alto | Infraestrutura Puppeteer gerando relatórios dinâmicos impressionantes. |
| **Inventário** | Alto | Total integração das transações num Ledger protegido e lógicas automatizadas. |
| **Analytics e BI**| Muito Alto | Cálculos em tempo real de KPIs definidos em serviços consolidados. |

---

## 3. Arquitetura

**Stack Tecnológica:** TypeScript, Node.js, Next.js 15 (App Router), React 19, TailwindCSS, Radix UI (base para *shadcn/ui*), Zustand, React Query (Tanstack), Prisma ORM (v6.1.0), PostgreSQL, Next-Auth v5, Supabase Storage, Puppeteer, Vitest e Playwright.

**Organização:**
O modelo une **Feature-Sliced Design** com um padrão em camadas de Servidor (DDD):
- **App Router (`/app/`)**: Define as rotas e a apresentação visual UI.
- **Server Actions (`/server/actions/`)**: Controladores que orquestram os pedidos vindos do UI.
- **Services (`/server/services/`)**: Centralizam toda a lógica computacional do negócio, abstraída do contexto HTTP.
- **Repositories (`/server/repositories/`)**: Tratam os dados em bruto contra o ORM Prisma de forma padronizada.
- **Features (`/features/`)**: Módulos estanques por domínio (ex: *Inventory*, *Business-Intelligence*). Cada feature encapsula de forma egoísta os seus Components, Services, Types e Utils.

**Fluxo de Dados:** O Frontend interage com Server Actions nativas (Next.js), que acionam Services isolados. Os Services consultam e transformam os dados via Repositories, cruzando Logs e Auditorias globais (`lib/audit`, `lib/logging`).
O **Sistema PDF** baseia-se em *templates* HTML desenhados com Tailwind em scripts NodeJS (`.mjs`) que o Puppeteer captura nativamente para produzir ficheiros paginados para envio automático.

---

## 4. Módulos Existentes

| Módulo | Estado | Descrição | Prioridade |
| ------ | ------ | --------- | ---------- |
| **Inventário** | Backend Pronto | Motor CMP de stock, valuation e tracking imutável de transações. | Alta |
| **Business Intelligence** | Backend Pronto | Agregação, Saúde Operacional (Health Score), Analytics de fundo e Forecast. | Alta |
| **Relatórios (Reporting)** | Pronto | Exportação PDF/HTML de relatórios semanais, mensais e leaderboards operacionais. | Alta |
| **Checklists** | Médio | DB e relatórios PDF PDF/fillables criados. Falta interface de introdução digital web. | Média |
| **Escalas (Shifts)** | Baixo | Apenas na base de dados (Shifts, Attendance). Regras processadoras de horas extra prontas. | Alta |
| **Funcionários** | Baixo | Tabelas `Employee` criadas. Falta gestão CRUD na UI. | Média |
| **Documentos** | Baixo | BD criada (Supabase uploads ready). Falta UI. | Baixa |
| **Incidentes** | Baixo | Apenas DB. Falta via de registo no Frontend. | Média |
| **Notificações/Alertas** | Médio | Serviço de Trigger em Backend já monitoriza e consolida desvios operacionais. | Média |
| **IA & Forecasting** | Experimental | Infraestrutura arquitetural e modelos DB para projeções analíticas via ML. | Baixa |

---

## 5. Funcionalidades Implementadas

**Core & Base**
- NextAuth configurado, Base de dados Prisma validada e com as migrações em dia. Variáveis de ambiente garantidas por tipagens Zod. Sistema de Log e de Audit.

**Inventário e Finanças**
- Motor de Custo Médio Ponderado (CMP) dinâmico, reavaliando o valor total de armazém com as cotações monetárias das novas faturas em tempo real.
- Cálculos de Margens, consumos e alertas para variações monetárias superiores a 15% face ao custo referencial do *Supplier*.
- Inventários Semanais (*Weekly Inventory Counts* e *Variances*).

**Reporting e PDF (O Fator Uau)**
- Geração estática de relatórios gerenciais e *Leaderboards* dinâmicas exportadas graficamente num padrão executivo premium.
- Inserção de `charts` analíticos nas exportações PDF (`pdf-chart-generator.ts`).

**Analytics & BI**
- Cálculos robustos de *Financial KPIs*, *Operational KPIs* e *Team KPIs*.
- Sistema base de atribuição de uma nota qualitativa (Health Score) de 0 a 100 ao panorama atual do restaurante.

---

## 6. Funcionalidades Planeadas

### Curto Prazo
1. **Frontend Core (Dashboard UI):** Desenvolver as páginas interativas dentro de `/app/dashboard/*` que deem o controlo visual a toda a retaguarda que está fechada em serviços e scripts.
2. **UI de Inventário e Relatórios:** Libertar os técnicos dos *scripts*, criando uma UI que faça *Click-and-Generate* aos reports e formulários visuais dinâmicos para registo de quebras e faturas de Stock.
3. **Autenticação:** Finalizar o fluxo visual de Login/Logout e proteção de rotas com Roles.

### Médio Prazo
1. **Escalas, Horários e Colaboradores:** Criar a matriz visual de atribuição de turnos, com cruzamento imediato do registo de picagens de ponto para cálculos sumários de *Overtime*.
2. **Sistema de Settings e Auditorias:** Portais de Configuração avançados para diretores e visualização de *Audit Logs*.
3. **Módulo Web de Checklists e Incidentes:** Ecrãs Mobile/Tablet para reportar um incidente sanitário ou cumprir passos de fecho da loja atempadamente.

### Longo Prazo
1. **Inteligência Artificial Ativa:** Ligação às APIs de LLMs / Machine Learning para alimentar o sistema de `AIForecasts` de sugestões autónomas na compra de bebidas/stock face ao tempo/clima e ocupação prevista da cidade.
2. **Document Center UI:** Visualizador de documentos oficiais com assinaturas digitais ou permissões.

---

## 7. Sistema de Inventário

- **Filosofia:** Ledger financeiro 100% auditable. Nunca se "apaga" a quantidade de um stock; criam-se `InventoryTransactions` de entrada (IN) ou saída (OUT/WASTAGE). 
- **Funcionamento:** Quando uma fatura entra, o preço é comparado com o sistema anterior e o CMP recalcula-se de forma imutável.
- **Documentação & Contagem:** Processos rigorosos de *Weekly Inventory*, confrontando o digital contra o apurado físico para avaliação de desvios. Ocorrem envios regulares de HTML e PDFs consolidadores por *script*.

---

## 8. Sistema Financeiro

Totalmente ancorado no modelo CMP do inventário:
- O valor absoluto do restaurante (`Stock Value`) atualiza em tempo real perante quebras ou compras.
- As saídas operacionais têm uma tradução financeira automática para o custo que o item representou naquele segundo, conferindo inteligência fina no fecho de contas.
- Projeta o cálculo das perdas perante os *consumos indevidos*, traduzindo infrações diretamente a euros perdidos para fácil tomada de decisão da gestão superior.

---

## 9. Sistema de Relatórios

Baseia-se num paradigma *headless*. Servidores virtuais rodam uma interface estática formatada profissionalmente em Tailwind e traduzida via pacote Node `puppeteer` a PDFs arquiváveis.
- **Diários:** Eventos singulares vitais.
- **Semanais:** Overtime, quebras de inventário agudas, *Leaderboards* departamentais e *Checklists* de conformidade.
- **Mensais:** *Executive Reports* - Fundem quatro semanas de recolhas, apresentam dezenas de gráficos analíticos e indicam as *Tendências* (Trends) de performance do restaurante num período consolidado e faturável.

---

## 10. Sistema Analytics

O processamento puro dos números para gráficos e ecrãs.  
Mapeado na pasta `features/business-intelligence/services`, recolhe eventos do prisma criando resumos vitais (*KPISnapshots*).
Destaques:
- **Financeiros**: Stock Valuation, Variação CMP;
- **Operacionais**: Completude das Checklists, taxa de incidentes;
- **Equipa**: Overtime, assiduidade, métricas de leaderboard.

---

## 11. Business Intelligence

A Camada Superior. Foca-se em entregar "a decisão" em bandeja de prata aos administradores e não apenas os números puros:
- **Health Score**: Aglomera os *Analytics* todos numa nota tangível avaliando o pulso vital da operação do restaurante de forma gráfica (0-100%).
- **Alertas / Trends**: Monitoriza comportamentos fora da curva de forma ativa. Encontra os padrões e atira os resultados quer para a persistência das tabelas (`AlertHistory`) quer para os componentes de visualização web do Dashboard (`trend-chart.tsx`, `alert-panel.tsx`).

---

## 12. Roadmap Executivo

1. **Fase 1: Infraestrutura e Motor Central** *(CONCLUÍDO)*. Setup BD, Scripts PDF, Inventário CMP, BI Services.
2. **Fase 2: Frontend e Dashboard** *(FOCO ATUAL)*. Migração da interação para o `/app/dashboard`, ecrãs do inventário, login e visualização dos Relatórios no portal web.
3. **Fase 3: Operações Humanas**. CRUD de Funcionários, Módulo de Escalas e Visualização Dinâmica de Horas Extra.
4. **Fase 4: Gestão Dinâmica**. Checklists web, Incidentes ativos com *push-notifications*, Portal de Documentos.
5. **Fase 5: Automação Total e IA**. Interação do utilizador e da operação baseada na antecipação preditiva dos algoritmos integrados com APIs externas de IA.

---

## 13. Princípios do Projeto

1. **Simplicidade Operacional**: Apesar do núcleo ser um labirinto matemático avançado, o *Frontend* tem de ser absolutamente claro, simples e amigável para um chefe de sala que usa um tablet.
2. **Rastreabilidade e Ledger**: Zero deleção, tudo é uma transação ou evento auditado com precisão Decimal.
3. **Decisões baseadas em Dados**: Relatórios exatos com valometria financeira instantânea, sem intuições.
4. **Elevada Qualidade Visual**: PDFs de exportação gerencial exigem *Design institucional* e premium. Os componentes Web seguem os cânones estilizados da biblioteca `shadcn/ui`.
5. **Automação Absoluta**: Se o sistema pode inferir (Cálculo de overtime, desvios de CMP), não deverá pedir a confirmação redundante humana.

---

## 14. Terminologia Oficial

- **CMP (Custo Médio Ponderado)**: Motor matemático e financeiro nuclear que avalia os bens de forma balanceada.
- **Relatório Operacional (Operational Report)**: Extração informativa para leitura tática local das infrações, contagens e incidentes.
- **Weekly / Monthly Executive Report**: Documentação estandardizada exportável, desenhada de forma institucional para *stakeholders* não-operacionais.
- **KPI (Key Performance Indicator)**: Métrica temporal classificada do negócio.
- **Health Score (Operational Health Score)**: A avaliação médica do estado total do ecossistema do restaurante perante métricas ponderadas.
- **Incident**: Ocorrência anómala ou perigosa a reter atenção urgente.
- **Overtime**: Dedução matemática das horas extras devidas contra o cruzamento dos horários previstos face ao picar real do ponto da equipa.
- **Inventory Transaction**: Movimentação individual inviolável no armazém.
- **Dashboard**: A consola matriz e centro de comando que sumariza a informação em ecrã Web.

---

## 15. Regras para os Próximos Agentes

**MUITO IMPORTANTE PARA AS PRÓXIMAS INTERAÇÕES DA I.A.:**
1. **NÃO DEVEM** voltar a analisar a codebase sob qualquer pretexto. 
2. **DEVEM** utilizar exclusivamente este documento (`AGENT2_CONTEXT.md`) como a principal referência e "Fonte de Verdade" para desenhar, redigir ou planear documentações subsequentes.
3. **DEVEM** respeitar rigorosamente a *Terminologia Oficial* imposta, bem como manter os alinhamentos estilísticos preestabelecidos.
4. O desenvolvimento documental deve espelhar qualidade institucional e clareza máxima perante a visão do produto.

---

## 16. Contexto para o Agente 2 (Equipa Documental / Produto)

**Resumo Executivo para Agente 2:**
O RIBBAI 2.0 é um marco empresarial que destrói a dependência do *excel* na restauração e transforma a complexidade financeira de inventários e *overtimes* numa plataforma imutável alimentada por lógicas CMP e Analytics reativas. 
Enquanto a *Phase 1* estabeleceu silenciosamente um Backend robusto capaz de gerar relatórios em PDF esplêndidos, auditar utilizadores e prever comportamentos; a missão agora é empacotar esta capacidade para os *stakeholders*, elaborando a *Documentação Executiva de Utilizador*. Ao desenhar essa documentação, foquem-se nos impactos diretos (o dinheiro que o sistema permite poupar com a previsão de ruturas de stock ou os insights imediatos que chegam às caixas de email da gerência semanalmente). O portal Web ganhará agora forma para democratizar estas maravilhas técnicas aos gerentes de sala.

---

## 17. Contexto para o Agente 3 (Equipa de Design)

**Resumo Específico para Design Visual:**
O Produto visa o "Premium Institution".
- **Estilo Visual**: Institucional e Tecnológico (remetendo ao standard Deloitte / McKinsey / Accenture). Requer a utilização de componentes baseados na filosofia de *Radix UI* (Tailwind + Shadcn).
- **Tom & Gráficos**: A informação nos relatórios (os quais nascem em HTML antes do *print to PDF*) não deverá apresentar "tabelas secas". Exige recurso massivo a *Recharts*, infográficos temporais (*Trend Charts* coloridos com diferenciação de vermelho para infrações ou encarecimento, e verde para sucessos de *Health Score*).
- **Tipografia & Aspeto**: Limpo, legível, arejado. Utilização extensiva de painéis ou "Cartões de Informação" (Cards) onde o KPI não é um mero número, mas um selo visual perfeitamente interpretável nos écrans (Smartphones, Tablets) de uma cozinha e nas mãos executivas de uma sala de reuniões. A prioridade é a clareza máxima para a tomada de decisão a "bater de olhos".