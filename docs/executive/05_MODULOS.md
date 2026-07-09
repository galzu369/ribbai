# 6. Módulos

A plataforma RIBBAI 2.0 articula-se através de diferentes módulos operacionais interdependentes, mas concetualmente isolados, que formam o ecossistema total.

## Inventário
* **Objetivo:** Controlo absoluto do ciclo financeiro e de vida dos bens físicos do restaurante.
* **Funcionalidades:** Registo estrito (*ledger* imutável) de entradas, saídas, quebras (*wastage*) e o recalcular em tempo real da valorimetria de *stock* através do Custo Médio Ponderado (CMP).
* **Benefícios:** Eliminação de desperdícios invisíveis, rigor no acompanhamento do custo real dos consumos e avaliação contabilística imediata ao final de cada dia.
* **Estado de Implementação:** Backend pronto e operacional (alta prioridade).

## Business Intelligence (BI) e Analytics
* **Objetivo:** Traduzir montanhas de dados processuais em indicadores estratégicos instantâneos.
* **Funcionalidades:** Cálculo automatizado de *KPIs* operacionais e financeiros e formulação matemática da nota agregadora *Health Score*. Geração de resumos vitais e monitorização de desvios padrão.
* **Benefícios:** Transforma os números puros em respostas claras à decisão. Isola os problemas antes que afetem financeiramente o balanço mensal.
* **Estado de Implementação:** Backend perfeitamente codificado, validado e em pleno funcionamento.

## Relatórios Executivos (Reporting)
* **Objetivo:** Consolidação temporal do estado do negócio para análise executiva superior.
* **Funcionalidades:** Motores de renderização geram estaticamente documentos (PDF e HTML) com formatação premium para fechos semanais e mensais (*Leaderboards*, métricas *Overtime*, quebras e indicadores transversais).
* **Benefícios:** Substituição do report manual. Informação institucional credível e blindada contra o erro humano ou intuição enviada pontualmente aos *stakeholders*.
* **Estado de Implementação:** Funcionalidades de base prontas a extrair relatórios.

## Escalas (Shifts) e Funcionários
* **Objetivo:** Cruzar o planeamento de *Staff* com as necessidades da operação e a assiduidade real.
* **Funcionalidades:** Processamento autónomo das escalas e dedução de horas extraordinárias em função do registo diário (*clock-in / clock-out*). Tabelas mestre de gestão da equipa.
* **Benefícios:** Resolução drástica de ineficiências na alocação de mão de obra e erradicação do trabalho manual no cruzamento de grelhas para fecho dos vencimentos mensais.
* **Estado de Implementação:** Regras de negócio prontas (Backend). Faltam interfaces de gestão visual (UI).

## Checklists e Incidentes
* **Objetivo:** Normalização da operação física através do acompanhamento das tarefas locais e do mapeamento de anomalias diárias.
* **Funcionalidades:** Fluxos digitais para tarefas fixas (abertura e fecho) e uma *pipeline* padronizada para comunicar ocorrências críticas, que ativam rastreio direto e monitorização em base de dados.
* **Benefícios:** Garantia de conformidade com os processos da marca, mitigação de riscos higienossanitários e rápida resolução de incidentes.
* **Estado de Implementação:** Estrutura de base de dados e emissão em relatório concluídas. Interação web das equipas pendente.

## Inteligência Artificial (Forecasting) e Notificações
* **Objetivo:** Evoluir a plataforma de uma natureza reativa para proativa.
* **Funcionalidades:** Consolidar *Triggers* (gatilhos) que emitem alertas imediatos em caso de desvios drásticos e interagir com modelos preditivos para projetar antecipações (e.g. compras ou *staffing* perante ocupação futura).
* **Benefícios:** A administração deixa de procurar problemas; o sistema notifica e entrega a recomendação antecipadamente, bloqueando prejuízos iminentes.
* **Estado de Implementação:** Alertas *Trigger* já atuantes em base de dados. Modelos de IA e visuais em fase experimental e de longo prazo.

---

> **Objetivo:** Mapear a arquitetura funcional e delimitar as competências de cada núcleo do sistema.
> 
> **Benefícios para a Gestão:** Compreensão modular das capacidades entregues pelo projeto, permitindo uma expansão organizada e focada.
> 
> **Estado Atual:** O processamento interno (*backend*) da grande maioria dos módulos core (Inventário, BI e Reporting) está concluído e validado.
> 
> **Próximos Desenvolvimentos:** Criação da camada de visualização em ecrã para democratizar a introdução de dados por parte dos funcionários em módulo como Checklists e Funcionários.