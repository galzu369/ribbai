# Análise dos Módulos do Sistema

Este documento lista todos os grandes módulos da aplicação, apresentando os seus objetivos, o que foi implementado, o que falta, as suas dependências e a sua atual maturidade.

## 1. Inventário
- **Objetivo**: Gestão integral de stocks, cálculo monetário (CMP) das movimentações e rastreamento contínuo de contagens semanais.
- **Funcionalidades Implementadas**: Modelo de Base de Dados complexo (Transações, Itens, Suppliers), Lógica de Custo Médio Ponderado (CMP) em `/lib/inventory-cmp.ts`, análise financeira e Scripts para contagens semanais.
- **Funcionalidades em Falta**: Interface Web (Frontend UI) para visualização e adição amigável, gestão visual das quebras.
- **Dependências**: Prisma DB, Logging.
- **Estado de Maturidade**: Alto (Lógica de Motor Completa).

## 2. Relatórios (Reporting)
- **Objetivo**: Abstração da produção e visualização de PDFs informativos operacionais para avaliações periódicas.
- **Funcionalidades Implementadas**: Criação e desenho apurado de PDFs através do Puppeteer para Relatórios Semanais, Mensais (Overtime, Leaderboard, etc).
- **Funcionalidades em Falta**: Dashboard UI que permita descarregar estes relatórios sem recorrer a scripts de *node*. Agendamento integrado cron.
- **Dependências**: Inventário, Escalas, Incidentes, `puppeteer`, `pdf-lib`.
- **Estado de Maturidade**: Elevado (Scripting forte).

## 3. Analytics e Business Intelligence (BI)
- **Objetivo**: Proporcionar um panorama sumário analítico transversal a todo o negócio, mesclando dados financeiros, operacionais e de recursos humanos.
- **Funcionalidades Implementadas**: Ficheiros completos na pasta `features/business-intelligence/`. Serviços avançados de KPI, Trend Analysis, Health Scoring, Real Time Metrics, Serviços executivos PDF.
- **Funcionalidades em Falta**: Interligação das páginas do Next.js com as componentes já codificadas.
- **Dependências**: Inventário, Report, Base de Dados.
- **Estado de Maturidade**: Muito Elevado.

## 4. Funcionários (Empregados e RH)
- **Objetivo**: Gestão da ficha técnica dos trabalhadores, pagamentos, contratos e histórico de faltas/assiduidade.
- **Funcionalidades Implementadas**: O modelo de dados detalhado (Employee, TeamFeedback) que engloba posições, salários, e métricas de desempenho.
- **Funcionalidades em Falta**: Módulo de CRUD da gestão, lógica intermédia do lado do servidor dedicada especificamente à assiduidade contratual (tirando o Prisma).
- **Dependências**: Auth, Base de Dados.
- **Estado de Maturidade**: Baixo (Apenas DB Models).

## 5. Checklists
- **Objetivo**: Tarefas padronizadas repetíveis associadas a manutenções diárias (Abertura/Fecho).
- **Funcionalidades Implementadas**: Prisma models (`Checklist`, `ChecklistTemplate`). Geração de modelos PDF interativos / fillables através de `.mjs` scripts para abertura e fecho.
- **Funcionalidades em Falta**: Funcionalidade na app que permita efetivamente validar digitalmente os itens sem recurso ao papel/PDF.
- **Dependências**: Relatórios PDF.
- **Estado de Maturidade**: Médio.

## 6. Incidentes
- **Objetivo**: Reportar anomalias de segurança, avarias ou ruturas sanitárias.
- **Funcionalidades Implementadas**: Registo de incidentes estipulado em base de dados com níveis de severidade, root cause e financial impact.
- **Funcionalidades em Falta**: Registo digital acessível pela interface dos colabores. Integração direta e alerta nos canais apropriados.
- **Dependências**: Funcionários, Notificações.
- **Estado de Maturidade**: Baixo (Apenas DB Models).

## 7. Escalas (Shifts e Attendance)
- **Objetivo**: Alocação semanal de funcionários e cruzamento das suas picagens de ponto para cálculos de Overtime e pagamentos.
- **Funcionalidades Implementadas**: Tabelas `Shift` e `Attendance`. Regras processadoras para os relatórios mensais de horas extras.
- **Funcionalidades em Falta**: Módulo visual dinâmico tipo calendário para a gestão central destas escalas.
- **Dependências**: Funcionários.
- **Estado de Maturidade**: Baixo-Médio.

## 8. Documentos (Document Center)
- **Objetivo**: Centralizar e versionar documentação confidencial ou partilhada (guias, recibos, etc).
- **Funcionalidades Implementadas**: Modelo de dados sólido que apoia a ligação remota a URLs com controlo de versão e acesso. Preparado para interagir com Supabase Storage (`lib/supabase/storage.ts`).
- **Funcionalidades em Falta**: Frontend para uploads, listagens e sistema nativo de permissões ao nível do Frontend.
- **Dependências**: Supabase, Roles.
- **Estado de Maturidade**: Baixo.

## 9. Notificações e Alertas
- **Objetivo**: Difusão de alertas críticos de negócio, sejam quebras de sistema, ruturas de stock ou lembretes.
- **Funcionalidades Implementadas**: Alert Panel em BI UI, tabelas `Notification`, e serviço complexo em `business-intelligence/services/alert-system.ts`.
- **Funcionalidades em Falta**: Integração real-time com Sockets/SSE ou Polling otimizado em UI persistente e integração a canais nativos (SMS/Email).
- **Dependências**: BI, Eventos DB.
- **Estado de Maturidade**: Médio.

## 10. Auditoria (Audit Logging)
- **Objetivo**: Rastrear comportamentos no sistema, registando a criação, alteração ou eliminação de entidades vitais.
- **Funcionalidades Implementadas**: Lógica basilar construída e exposta nativamente em `lib/audit/audit-log.ts` associando o IP, Agente e Tipo de Ação.
- **Funcionalidades em Falta**: Faltam integradores (*middlewares* operacionais ou chamadas nos Repositories das restantes features) que ativem a escrita na rotina diária e uma visualização administrativa dos logs.
- **Dependências**: Nenhuma primária.
- **Estado de Maturidade**: Médio (Serviço existe mas pouco explorado).

## 11. IA e Forecasting
- **Objetivo**: Predição de picos de negócio, quebras de invetário e propostas operacionais autogeradas por ML.
- **Funcionalidades Implementadas**: Serviços simulados / base arquitetada em `business-intelligence/services/ai-analysis.ts` e modelos DB robustos.
- **Funcionalidades em Falta**: Integração de LLMs externos ou modelos customizados reais à Cloud e agendamento de cálculos complexos diários.
- **Dependências**: Analytics.
- **Estado de Maturidade**: Experimental.

## 12. Settings e Configurações
- **Objetivo**: Sistema global flexível do modelo de negócio (variáveis vitais do restaurante).
- **Funcionalidades Implementadas**: Modelo DB com armazenagem em JSON e Tipos (String, Boolean, etc).
- **Funcionalidades em Falta**: Todo o front-end e tipagem dos Settings em ambiente Node para proteção type-safe.
- **Dependências**: Base de dados.
- **Estado de Maturidade**: Baixo (Apenas base arquitetural).