# Análise de Analytics e Alertas

Enquanto que o Business Intelligence (BI) trata as agregações a longo prazo e do cálculo de scores preditivos (Health Score), o *Analytics* complementa-se perfeitamente com respostas a incidentes visuais e quantitativos no minuto imediato e no curto-prazo.

## 1. Dashboards Existentes e Componentes Visuais
Uma avaliação estática no projeto permitiu encontrar o esboço completo de uma secção rica e interativa de interface visual no interior do diretório `features/business-intelligence/components/`. 
Os elementos propostos são desenhados em React 19 (com tipagens do TypeScript):
- **Widgets e Grid**: `kpi-grid.tsx` estabelece o panorama de ecrã central (com métricas fundamentais sumariadas e coloridas).
- **Indicadores Tempo Real**: `real-time-metrics.tsx` é a prova viva de que a equipa de engenharia propõe o desenho de quadros informativos com refresh nativo baseado nas ações da plataforma sem delay.
- **Gráficos (Charts)**: Através da biblioteca instalada `recharts` e do uso de `trend-chart.tsx`, constroem-se apresentações históricas (quebras por semanas ou progressão temporal das horas do funcionário) permitindo reações mais fluidas e visuais.

## 2. Sistema Lógico e Gráficos de Produção (PDF Charts)
Como ponte com os relatórios mensais e semanais, o *Analytics* encontra o seu output em relatórios rígidos exportados. Através de `pdf-chart-generator.ts` e de conversões em imagens/Base64, o sistema capta toda a inteligência e analítica de tendências das views para colocar imagens gráficas nos relatórios para conselhos de administração ou arquivos. 

## 3. Estado de Alertas e Trend Analysis
A tabela `AlertRule` (com a monitorização histórica guardada em `AlertHistory`) é acompanhada por `trend-analysis.ts` e `alert-system.ts`.
- **Dinâmica Funcional**: O sistema capta um distúrbio da normalidade (por exemplo, um aumento abrupto no preço da batata pelo fornecedor via motor de CMP, ou uma taxa de absenteísmo repentina num mês estival).
- **Emissão**: As regras ativam e despoletam avisos urgentes (visuais e arquivados no painel global `alert-panel.tsx`).

## Conclusões Gerais 
O motor é fenomenalmente denso a nível das análises que orquestram na sombra. Contudo, em virtude da ausência integral da renderização destas *components* nas páginas principais do `app/dashboard/*` de forma orgânica neste atual processo (Phase 1 / Phase 2 de transição), não foi possível confirmar o grau de responsividade prático das páginas e a sua interação em ambiente Web de produção do dia a dia por parte de colaboradores não técnicos.