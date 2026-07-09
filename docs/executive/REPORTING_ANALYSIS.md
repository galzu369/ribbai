# Análise do Sistema de Reporting

O RIBBAI Ops tem, indiscutivelmente, a sua geração e modelação de dados nos Sistemas de Reporting como um dos seus atributos mais ricos já instalados e automatizados, apoiado nativamente na conversão local para PDF através de automação em HTML e CSS (`puppeteer`).

## 1. Sistema PDF (O Motor)
A arquitetura visual foca-se na geração estática sem necessidade de um processador em cloud externo dispendioso.
- **Templates e Tecnologias**: Estão desenvolvidos em scripts `.mjs` como strings interativas de HTML / CSS e Tailwind incorporado gerando formatação de nível profissional. Recorre ao pacote `puppeteer` para efetuar a captura (`print to PDF`) sem intervenção humana.
- **Componentes e Customização**: Existem injeções programáticas nos scripts e através da componente gráfica de Chart rendering (`pdf-chart-generator.ts` e `executive-pdf-styling.ts`).
- Para casos interativos (ex: Checklists para os operadores do turno assinarem e avaliarem presencialmente), existem rotinas como `generate-opening-checklist-fillable-pdf.mjs` que manipulam diretamente os formulários usando o pacote `pdf-lib`.

## 2. Relatórios Operacionais (Visão Global)
O conceito de `Report` estende-se sobre métricas temporais (Diário, Semanal e Mensal). A informação central em `prisma` define:
- `ReportType`: A categoria do relatório gerado.
- `Period`: Data do início e de fim.
- O report, após gerado digitalmente, persiste na base de dados (JSON para a informação estruturada `summary`, `sections`, e a meta-ligação `pdfUrl` que armazena a versão física da exportação gerada).

## 3. Relatórios Semanais
Desenhados para um ponto de situação tático a apresentar de 7 em 7 dias às equipas de supervisão.
- **Overtime e Resumo**: Consome os dados de escalas para detetar os prolongamentos extra e os seus custos parciais.
- **Incidentes e Inventário**: Análise sobre ocorrências anómalas (se existirem na BD no período de análise), aliadas a uma folha de contagens semanal das equipas e cruzamento de quebras contra os parâmetros mínimos do armazém.
- **Leaderboard Operacional**: Script ativo que consolida as regras de negócio em pontuações por equipa (`leaderboard-scoring-rules.mjs`) gerando um quadro analítico apelativo para avaliação de desempenho (`reports:leaderboard:weekly`).

## 4. Relatórios Mensais (Executive Reports)
Relatórios estratégicos, amplamente sumariados para chefias gerais.
- Agrupa todas as vertentes semanais em indicadores e **tendências** transversais (através das capacidades integradas pela pasta `features/business-intelligence/services`).
- O PDF destas categorias cruza não apenas tabelas mas também as avaliações globais dos motores preditivos. Avaliam o comportamento ao longo de 4/5 semanas consecutivas.

## 5. Sistema de Horas Extra (Overtime)
Atua na junção da Tabela `Attendance` com o Motor `Reporting`.
- **Cálculo e Integração**: Sub-rotinas (como as implementadas ou delineadas em `overtime-report-parser.mjs`) inferem o cruzamento entre as obrigações estipuladas nos Turnos (`Shifts`) perante a picagem e extraem valores e totais exatos por colaborador. Faltam componentes UI interativos, pelo que o seu consumo se dá nos documentos gerados que rementem relatórios financeiros às esferas superiores.

## Conclusões
Não foi possível confirmar esta funcionalidade a nível de Interface Visual FrontEnd dentro do `/app` AppRouter, mas a arquitetura e processamento por debaixo (através das pastas /scripts e /features) encontra-se funcional com testes de output registados e automatismos estáticos complexos definidos.