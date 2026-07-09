# 5. Arquitetura

## Uma Fundação Enterprise-Grade
O RIBBAI 2.0 foi desenhado de raiz com as tecnologias mais robustas e maduras do mercado moderno de desenvolvimento web, garantindo estabilidade, segurança e elevada capacidade de processamento. A infraestrutura alia a segurança tipificada (*TypeScript*) e alta performance no processamento servidor a um ecossistema sólido de gestão de dados.

## Organização em Camadas (Domain-Driven Design)
A arquitetura assenta numa metodologia híbrida entre o *Feature-Sliced Design* (Módulos isolados por domínio de negócio) e o padrão estrito de camadas, promovendo uma separação de responsabilidades cristalina e imune a dependências cruzadas.

A comunicação e estruturação organiza-se através de:

1. **Camada de Apresentação (App Router):** Exclusiva para a interface gráfica (*UI*), garantindo a acessibilidade, reatividade visual e interação com o utilizador nos vários dispositivos.
2. **Controladores (Server Actions):** Atuam como pontes de orquestração. Intercetam os pedidos da interface e comunicam diretamente de forma segura e autêntica com as lógicas internas, não expondo diretamente o motor central à *web*.
3. **Serviços de Negócio (Services):** O núcleo da inteligência. É aqui que residem todas as regras vitais do negócio, como os cálculos de Custo Médio Ponderado, a atribuição de *Health Scores* ou as lógicas de dedução de *Overtime*. São independentes e agnósticos face à interface gráfica.
4. **Camada de Dados (Repositories & ORM):** Interagem padronizadamente com a base de dados relacional. Estão incumbidos de tratar, inserir e extrair a informação bruta, gerando também auditorias contínuas.
5. **Funcionalidades (Features):** Domínios de negócio estanques. O processamento do *Inventário* não se mistura acidentalmente com o *Business Intelligence*, assegurando que a manutenção num departamento não compromete o resto da plataforma.

## Comunicação e Fluxo
1. **Entrada de Dados:** A operação envia uma instrução (ex: o registo de uma quebra de stock) através do sistema central.
2. **Processamento e Validação:** Os *Services* intercetam a ação, efetuam as validações matemáticas e cruzam a alteração com o histórico atual.
3. **Auditoria e Registo:** Os *Repositories* consolidam a transação na Base de Dados. A base é gerida como um *Ledger* contabilístico; a informação nunca é simplesmente apagada, mas sim registada como uma transação auditável contínua.
4. **Relatórios Automáticos:** Periodicamente, a infraestrutura gera contentores de HTML estilizado, intersetados por motores dinâmicos (*Puppeteer*) que extraem a versão paginada e definitiva para os PDFs analíticos entregues à administração.

---

> **Objetivo:** Explicar a robustez técnica e a modularidade da plataforma sem jargão hermético.
> 
> **Benefícios para a Gestão:** Garantia de segurança, estabilidade e capacidade para atualizações futuras sem risco de paralisia sistémica.
> 
> **Estado Atual:** Arquitetura central, camadas de Serviços, Repositórios e Base de Dados (Backend) concluídos com maturidade de excelência.
> 
> **Próximos Desenvolvimentos:** Foco na expansão massiva da Camada de Apresentação (Frontend) sobre as sólidas fundações existentes.